import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logTransaction } from "@/lib/portfolio-tx";

export const dynamic = "force-dynamic";

interface Body {
  company?: string;
  symbol?: string | null;
}

// Upsert (or clear) a manual company-name -> symbol override. Overrides are
// keyed by the broker's company name so they persist across dividend
// re-uploads and take priority over the auto/dictionary matcher.
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const company = (body.company ?? "").trim();
  if (!company) {
    return NextResponse.json({ error: "company is required" }, { status: 400 });
  }
  const symbol = (body.symbol ?? "").toString().trim();

  // Empty symbol clears the override (revert to automatic matching).
  if (!symbol) {
    await prisma.dividendSymbolMap
      .delete({ where: { company } })
      .catch(() => undefined);
    await logTransaction(
      "upload",
      "update",
      { company, symbol: { from: "(manual)", to: null } },
      { summary: `Cleared dividend mapping for ${company}` }
    );
    return NextResponse.json({ ok: true, cleared: true });
  }

  const saved = await prisma.dividendSymbolMap.upsert({
    where: { company },
    create: { company, symbol },
    update: { symbol },
  });

  await logTransaction(
    "upload",
    "update",
    { company, symbol: { to: symbol } },
    { summary: `Mapped dividend company "${company}" → ${symbol}` }
  );

  return NextResponse.json({ ok: true, mapping: saved });
}
