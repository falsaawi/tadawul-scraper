import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthorizeUrl, getRedirectUri } from "@/lib/whoop";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "whoop_oauth_state";

// Kicks off the WHOOP OAuth flow: generates a CSRF state, stores it in a
// short-lived cookie, and redirects the browser to WHOOP's authorize page.
export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin;
    const redirectUri = getRedirectUri(origin);
    const state = randomBytes(16).toString("hex"); // 32 chars (>= 8 required)

    const res = NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
    res.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/whoop?error=${encodeURIComponent(message)}`, request.nextUrl.origin)
    );
  }
}
