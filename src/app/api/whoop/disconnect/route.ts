import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { WHOOP_CONNECTION_ID } from "@/lib/whoop";

export const dynamic = "force-dynamic";

// Removes the stored OAuth connection. Synced WHOOP data is left in place.
export async function POST() {
  await prisma.whoopConnection.deleteMany({ where: { id: WHOOP_CONNECTION_ID } });
  return NextResponse.json({ success: true });
}
