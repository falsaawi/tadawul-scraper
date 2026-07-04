import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthFilter = searchParams.get("month"); // 'YYYY-MM' or 'all'
  const bankFilter = searchParams.get("bank"); // bank or 'all'

  const statements = await prisma.expenseStatement.findMany({
    orderBy: { statementMonth: "desc" },
  });

  if (statements.length === 0) {
    return NextResponse.json({ hasData: false });
  }

  const availableMonths = Array.from(new Set(statements.map((s) => s.statementMonth)))
    .filter((m) => m && m !== "unknown")
    .sort((a, b) => b.localeCompare(a));
  const availableBanks = Array.from(new Set(statements.map((s) => s.bank)));

  const selMonth = monthFilter && monthFilter !== "all" ? monthFilter : null;
  const selBank = bankFilter && bankFilter !== "all" ? bankFilter : null;

  const scopedStatements = statements.filter(
    (s) => (!selMonth || s.statementMonth === selMonth) && (!selBank || s.bank === selBank)
  );
  const scopedIds = scopedStatements.map((s) => s.id);

  const txns = await prisma.expenseTransaction.findMany({
    where: { statementId: { in: scopedIds }, isCredit: false },
    orderBy: { amount: "desc" },
  });
  const creditTxns = await prisma.expenseTransaction.findMany({
    where: { statementId: { in: scopedIds }, isCredit: true },
  });

  const spend = txns.reduce((s, t) => s + t.amount, 0);
  const credits = creditTxns.reduce((s, t) => s + t.amount, 0);

  // by category
  const catMap = new Map<string, { value: number; count: number }>();
  for (const t of txns) {
    const c = catMap.get(t.category) ?? { value: 0, count: 0 };
    c.value += t.amount;
    c.count += 1;
    catMap.set(t.category, c);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, value: v.value, count: v.count }))
    .sort((a, b) => b.value - a.value);

  // top merchants
  const merchMap = new Map<string, { value: number; count: number; category: string }>();
  for (const t of txns) {
    const key = t.merchant.trim() || "(unknown)";
    const m = merchMap.get(key) ?? { value: 0, count: 0, category: t.category };
    m.value += t.amount;
    m.count += 1;
    merchMap.set(key, m);
  }
  const topMerchants = Array.from(merchMap.entries())
    .map(([merchant, v]) => ({ merchant, value: v.value, count: v.count, category: v.category }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  // by bank / card within scope
  const bankMap = new Map<string, { value: number; count: number }>();
  const cardMap = new Map<string, { value: number; count: number; bank: string; cardName: string | null }>();
  const stmtById = new Map(scopedStatements.map((s) => [s.id, s]));
  for (const t of txns) {
    const st = stmtById.get(t.statementId);
    if (!st) continue;
    const bk = bankMap.get(st.bank) ?? { value: 0, count: 0 };
    bk.value += t.amount;
    bk.count += 1;
    bankMap.set(st.bank, bk);
    const ckey = `${st.bank} ${st.cardNumber ?? ""}`;
    const cd = cardMap.get(ckey) ?? { value: 0, count: 0, bank: st.bank, cardName: st.cardName };
    cd.value += t.amount;
    cd.count += 1;
    cardMap.set(ckey, cd);
  }
  const byBank = Array.from(bankMap.entries()).map(([bank, v]) => ({ bank, ...v })).sort((a, b) => b.value - a.value);
  const byCard = Array.from(cardMap.entries())
    .map(([key, v]) => ({ key, cardNumber: key.split(" ")[1] || null, ...v }))
    .sort((a, b) => b.value - a.value);

  // monthly trend across ALL statements (respect bank filter, ignore month filter)
  const trendScope = statements.filter((s) => !selBank || s.bank === selBank);
  const trendIds = trendScope.map((s) => s.id);
  const trendTxns = await prisma.expenseTransaction.findMany({
    where: { statementId: { in: trendIds }, isCredit: false },
    select: { amount: true, statementId: true, category: true },
  });
  const stmtMonth = new Map(statements.map((s) => [s.id, s.statementMonth]));
  const monthMap = new Map<string, { value: number; count: number }>();
  for (const t of trendTxns) {
    const mo = stmtMonth.get(t.statementId);
    if (!mo || mo === "unknown") continue;
    const m = monthMap.get(mo) ?? { value: 0, count: 0 };
    m.value += t.amount;
    m.count += 1;
    monthMap.set(mo, m);
  }
  const trend = Array.from(monthMap.entries())
    .map(([month, v]) => ({ month, value: v.value, count: v.count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // daily spend within the scope (only meaningful when a month is selected)
  const dayMap = new Map<string, number>();
  for (const t of txns) {
    if (!t.txnDate) continue;
    const d = t.txnDate.toISOString().slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + t.amount);
  }
  const daily = Array.from(dayMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    hasData: true,
    filters: { month: selMonth, bank: selBank },
    availableMonths,
    availableBanks,
    statements: scopedStatements.map((s) => ({
      id: s.id,
      bank: s.bank,
      cardName: s.cardName,
      cardNumber: s.cardNumber,
      statementMonth: s.statementMonth,
      statementLabel: s.statementLabel,
      totalDebits: s.totalDebits,
      totalCredits: s.totalCredits,
      parsedCount: s.parsedCount,
      dueDate: s.dueDate,
      totalDue: s.totalDue,
      minimumDue: s.minimumDue,
      uploadedAt: s.uploadedAt,
      fileName: s.fileName,
    })),
    summary: {
      spend,
      credits,
      transactionCount: txns.length,
      statementCount: scopedStatements.length,
      avgTransaction: txns.length ? spend / txns.length : 0,
      monthsCovered: availableMonths.length,
    },
    byCategory,
    topMerchants,
    byBank,
    byCard,
    trend,
    daily,
    transactions: txns.slice(0, 300).map((t) => ({
      id: t.id,
      txnDate: t.txnDate,
      merchant: t.merchant,
      city: t.city,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      bank: stmtById.get(t.statementId)?.bank ?? null,
    })),
  });
}
