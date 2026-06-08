import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getProfile,
  getRedirectUri,
  persistToken,
} from "@/lib/whoop";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "whoop_oauth_state";

// OAuth redirect target. Verifies the CSRF state, exchanges the authorization
// code for tokens, stores them, then sends the user back to the dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const back = (msg: string) =>
    NextResponse.redirect(new URL(`/whoop?${msg}`, origin));

  const error = searchParams.get("error");
  if (error) return back(`error=${encodeURIComponent(error)}`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state) return back("error=missing_code");
  if (!expectedState || state !== expectedState) return back("error=state_mismatch");

  try {
    const redirectUri = getRedirectUri(origin);
    const token = await exchangeCodeForToken(code, redirectUri);
    await persistToken(token);

    // Best-effort: pull profile so we can show who is connected.
    try {
      const profile = await getProfile();
      await persistToken(token, {
        whoopUserId: profile.user_id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
      });
    } catch {
      // ignore — connection still succeeded
    }

    const res = back("connected=1");
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return back(`error=${encodeURIComponent(message)}`);
  }
}
