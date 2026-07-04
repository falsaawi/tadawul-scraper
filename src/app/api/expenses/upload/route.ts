import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStatement } from "@/lib/expense-parser";
import { logTransaction } from "@/lib/portfolio-tx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  fileName?: string;
  dataBase64?: string;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.dataBase64) {
    return NextResponse.json({ error: "Missing file data" }, { status: 400 });
  }

  let buffer: Uint8Array;
  try {
    const b64 = body.dataBase64.replace(/^data:.*;base64,/, "");
    buffer = new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    return NextResponse.json({ error: "Could not decode file" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await parseStatement(buffer, body.fileName || "statement.pdf");
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse PDF", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  if (parsed.bank === "Unknown") {
    return NextResponse.json(
      { error: "Unrecognized statement format. Supported: SAB (SABB) and Al Rajhi credit card statements." },
      { status: 422 }
    );
  }
  if (parsed.transactions.length === 0) {
    return NextResponse.json(
      { error: "No transactions could be read from this statement." },
      { status: 422 }
    );
  }

  const debitSum = parsed.transactions
    .filter((t) => !t.isCredit)
    .reduce((s, t) => s + t.amount, 0);

  // Replace any existing statement for the same bank+card+month (re-upload).
  const existing = await prisma.expenseStatement.findFirst({
    where: {
      bank: parsed.bank,
      cardNumber: parsed.cardNumber,
      statementMonth: parsed.statementMonth,
    },
  });
  if (existing) {
    await prisma.expenseStatement.delete({ where: { id: existing.id } });
  }

  const statement = await prisma.expenseStatement.create({
    data: {
      fileName: body.fileName || "statement.pdf",
      bank: parsed.bank,
      cardName: parsed.cardName,
      cardNumber: parsed.cardNumber,
      statementMonth: parsed.statementMonth,
      statementLabel: parsed.statementLabel,
      totalSpend: parsed.totalSpend,
      totalDebits: parsed.totalDebits,
      totalCredits: parsed.totalCredits,
      fees: parsed.fees,
      vat: parsed.vat,
      openingBalance: parsed.openingBalance,
      closingBalance: parsed.closingBalance,
      minimumDue: parsed.minimumDue,
      totalDue: parsed.totalDue,
      dueDate: parsed.dueDate,
      parsedCount: parsed.transactions.length,
      parsedSum: Math.round(debitSum * 100) / 100,
      transactions: {
        create: parsed.transactions.map((t) => ({
          txnDate: t.txnDate ? new Date(t.txnDate) : null,
          postDate: t.postDate ? new Date(t.postDate) : null,
          merchant: t.merchant,
          city: t.city,
          rawDesc: t.rawDesc,
          amount: t.amount,
          currency: t.currency,
          foreignAmount: t.foreignAmount,
          category: t.category,
          isCredit: t.isCredit,
        })),
      },
    },
  });

  await logTransaction(
    "upload",
    existing ? "update" : "upload",
    {
      kind: "expenses",
      bank: parsed.bank,
      card: parsed.cardNumber,
      month: parsed.statementMonth,
      transactions: parsed.transactions.length,
      spend: Math.round(debitSum * 100) / 100,
    },
    {
      entityId: statement.id,
      summary: `${existing ? "Replaced" : "Uploaded"} ${parsed.bank} statement ${parsed.statementMonth} (${parsed.transactions.length} txns)`,
    }
  );

  return NextResponse.json({
    ok: true,
    statementId: statement.id,
    bank: parsed.bank,
    cardName: parsed.cardName,
    cardNumber: parsed.cardNumber,
    statementMonth: parsed.statementMonth,
    transactions: parsed.transactions.length,
    spend: Math.round(debitSum * 100) / 100,
    replaced: !!existing,
  });
}
