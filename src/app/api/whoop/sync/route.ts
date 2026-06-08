import { NextResponse } from "next/server";
import { runWhoopSync } from "@/lib/whoop-sync";
import { WhoopNotConnectedError } from "@/lib/whoop";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Manual sync trigger from the dashboard. Auth is enforced by the app proxy.
export async function POST() {
  try {
    const { counts } = await runWhoopSync("manual");
    return NextResponse.json({ success: true, counts });
  } catch (error) {
    if (error instanceof WhoopNotConnectedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
