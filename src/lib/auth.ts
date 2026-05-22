// Edge-compatible session helpers using Web Crypto (HMAC-SHA256).
// Used by both the proxy (edge runtime) and route handlers (node runtime).

export const SESSION_COOKIE = "tadawul_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64url(new Uint8Array(sig));
}

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let r = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return r === 0;
}

export async function createSessionToken(
  secret: string
): Promise<{ value: string; maxAge: number }> {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload = String(expiresAt);
  const sig = await hmac(payload, secret);
  return { value: `${payload}.${sig}`, maxAge: SESSION_DURATION_SECONDS };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payload, secret);
  if (!constantTimeEqual(sig, expected)) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

export function credentialsMatch(
  providedUser: string | undefined,
  providedPass: string | undefined,
  expectedUser: string,
  expectedPass: string
): boolean {
  if (!providedUser || !providedPass) return false;
  // Compare both fields in constant time and AND the results so that timing
  // does not reveal which field was wrong.
  const userOk = constantTimeEqual(providedUser, expectedUser);
  const passOk = constantTimeEqual(providedPass, expectedPass);
  return userOk && passOk;
}
