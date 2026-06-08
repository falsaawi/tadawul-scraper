import { NextRequest, NextResponse } from "next/server";
import { runWhoopSync } from "@/lib/whoop-sync";
import { WhoopNotConnectedError } from "@/lib/whoop";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Scheduled WHOOP sync (Vercel cron). Bypasses the app proxy via the
// /api/cron exclusion and is protected by CRON_SECRET in production.
export async function GET(request: NextRequest) {
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { counts } = await runWhoopSync("cron");
    return NextResponse.json({ success: true, counts });
  } catch (error) {
    if (error instanceof WhoopNotConnectedError) {
      // Nothing connected yet — not an error worth alerting on.
      return NextResponse.json({ skipped: true, reason: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
