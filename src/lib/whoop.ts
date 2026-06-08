// WHOOP API client + OAuth token management.
//
// Single-user app: OAuth tokens live in a singleton WhoopConnection row.
// Access tokens are short-lived; with the `offline` scope WHOOP issues a
// refresh token. Refreshing rotates BOTH tokens, so we always persist the new
// refresh token returned by the token endpoint.
//
// Docs: https://developer.whoop.com/docs/developing/oauth/

import { prisma } from "@/lib/db";
import type {
  WhoopBodyMeasurement,
  WhoopCycle,
  WhoopPaginated,
  WhoopProfile,
  WhoopRecovery,
  WhoopSleep,
  WhoopTokenResponse,
  WhoopWorkout,
} from "@/types/whoop";

export const WHOOP_CONNECTION_ID = "default";

const API_BASE = "https://api.prod.whoop.com";
const AUTH_URL = `${API_BASE}/oauth/oauth2/auth`;
const TOKEN_URL = `${API_BASE}/oauth/oauth2/token`;

// All read scopes plus `offline` (required to receive a refresh token).
export const WHOOP_SCOPES = [
  "offline",
  "read:profile",
  "read:body_measurement",
  "read:cycles",
  "read:recovery",
  "read:sleep",
  "read:workout",
];

export class WhoopNotConnectedError extends Error {
  constructor(message = "WHOOP is not connected") {
    super(message);
    this.name = "WhoopNotConnectedError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getClientId(): string {
  return requireEnv("WHOOP_CLIENT_ID");
}

// Where WHOOP redirects after the user authorizes. Must exactly match a
// redirect URI registered in the WHOOP developer dashboard. If WHOOP_REDIRECT_URI
// is not set we derive it from the incoming request origin.
export function getRedirectUri(origin?: string): string {
  if (process.env.WHOOP_REDIRECT_URI) return process.env.WHOOP_REDIRECT_URI;
  if (origin) return `${origin}/api/whoop/callback`;
  throw new Error("WHOOP_REDIRECT_URI is not set and no request origin available");
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

// ── Token exchange ─────────────────────────────────────────────────────────

async function postToken(body: Record<string, string>): Promise<WhoopTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WHOOP token request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as WhoopTokenResponse;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<WhoopTokenResponse> {
  return postToken({
    grant_type: "authorization_code",
    code,
    client_id: getClientId(),
    client_secret: requireEnv("WHOOP_CLIENT_SECRET"),
    redirect_uri: redirectUri,
  });
}

async function refreshAccessToken(refreshToken: string): Promise<WhoopTokenResponse> {
  return postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getClientId(),
    client_secret: requireEnv("WHOOP_CLIENT_SECRET"),
    scope: "offline",
  });
}

// Persist a fresh token response. Keeps the previous refresh token if WHOOP did
// not return a new one (it normally does on refresh).
export async function persistToken(
  token: WhoopTokenResponse,
  extra?: { whoopUserId?: number; email?: string; firstName?: string; lastName?: string }
): Promise<void> {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  const existing = await prisma.whoopConnection.findUnique({
    where: { id: WHOOP_CONNECTION_ID },
  });
  const data = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? existing?.refreshToken ?? null,
    scope: token.scope ?? existing?.scope ?? null,
    expiresAt,
    ...(extra?.whoopUserId !== undefined ? { whoopUserId: extra.whoopUserId } : {}),
    ...(extra?.email !== undefined ? { email: extra.email } : {}),
    ...(extra?.firstName !== undefined ? { firstName: extra.firstName } : {}),
    ...(extra?.lastName !== undefined ? { lastName: extra.lastName } : {}),
  };
  await prisma.whoopConnection.upsert({
    where: { id: WHOOP_CONNECTION_ID },
    create: { id: WHOOP_CONNECTION_ID, ...data },
    update: data,
  });
}

// Returns a valid access token, refreshing (and persisting) if it is expired or
// about to expire. Throws WhoopNotConnectedError if there is no connection.
export async function getValidAccessToken(): Promise<string> {
  const conn = await prisma.whoopConnection.findUnique({
    where: { id: WHOOP_CONNECTION_ID },
  });
  if (!conn) throw new WhoopNotConnectedError();

  // Refresh if it expires within the next 60 seconds.
  const stillValid = conn.expiresAt.getTime() - Date.now() > 60_000;
  if (stillValid) return conn.accessToken;

  if (!conn.refreshToken) {
    throw new WhoopNotConnectedError(
      "WHOOP access token expired and no refresh token is available. Reconnect."
    );
  }
  const refreshed = await refreshAccessToken(conn.refreshToken);
  await persistToken(refreshed);
  return refreshed.access_token;
}

// ── Authenticated API access ───────────────────────────────────────────────

async function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getValidAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WHOOP GET ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

// Walk a paginated collection endpoint, following next_token until exhausted.
// `start`/`end` are ISO-8601 instants used to bound the window server-side.
async function getAllPages<T>(
  path: string,
  opts: { start?: string; end?: string; maxRecords?: number } = {}
): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | undefined;
  const maxRecords = opts.maxRecords ?? 5000;

  do {
    const params: Record<string, string> = { limit: "25" };
    if (opts.start) params.start = opts.start;
    if (opts.end) params.end = opts.end;
    if (nextToken) params.nextToken = nextToken;

    const page = await apiGet<WhoopPaginated<T>>(path, params);
    out.push(...page.records);
    nextToken = page.next_token ?? undefined;
  } while (nextToken && out.length < maxRecords);

  return out;
}

export function getProfile(): Promise<WhoopProfile> {
  return apiGet<WhoopProfile>("/v2/user/profile/basic");
}

export function getBodyMeasurement(): Promise<WhoopBodyMeasurement> {
  return apiGet<WhoopBodyMeasurement>("/v2/user/measurement/body");
}

export function getCycles(start?: string, end?: string): Promise<WhoopCycle[]> {
  return getAllPages<WhoopCycle>("/v2/cycle", { start, end });
}

export function getRecoveries(start?: string, end?: string): Promise<WhoopRecovery[]> {
  return getAllPages<WhoopRecovery>("/v2/recovery", { start, end });
}

export function getSleeps(start?: string, end?: string): Promise<WhoopSleep[]> {
  return getAllPages<WhoopSleep>("/v2/activity/sleep", { start, end });
}

export function getWorkouts(start?: string, end?: string): Promise<WhoopWorkout[]> {
  return getAllPages<WhoopWorkout>("/v2/activity/workout", { start, end });
}
