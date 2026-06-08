import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { WHOOP_CONNECTION_ID } from "@/lib/whoop";

export const dynamic = "force-dynamic";

// Connection status for the dashboard: whether WHOOP is connected, who, when it
// last synced, and the most recent sync log.
export async function GET() {
  const conn = await prisma.whoopConnection.findUnique({
    where: { id: WHOOP_CONNECTION_ID },
  });

  const configured = Boolean(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);

  if (!conn) {
    return NextResponse.json({ connected: false, configured, lastSync: null });
  }

  const lastSync = await prisma.whoopSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({
    connected: true,
    configured,
    user: {
      whoopUserId: conn.whoopUserId,
      email: conn.email,
      firstName: conn.firstName,
      lastName: conn.lastName,
    },
    scope: conn.scope,
    lastSyncedAt: conn.lastSyncedAt,
    lastSync: lastSync
      ? {
          id: lastSync.id,
          status: lastSync.status,
          trigger: lastSync.trigger,
          startedAt: lastSync.startedAt,
          finishedAt: lastSync.finishedAt,
          error: lastSync.error,
          counts: lastSync.counts,
        }
      : null,
  });
}
