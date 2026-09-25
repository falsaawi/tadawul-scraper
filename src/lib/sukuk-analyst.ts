import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SukukMetrics } from "./sukuk-metrics";

const MODEL = "claude-opus-5";

export const SUKUK_DISCLAIMER =
  "Informational and educational analysis only — not investment advice, not a recommendation to buy or sell, and not a regulated financial service. Sukuk carry credit, profit-rate, and liquidity risk; figures may be stale or incomplete. Verify independently before acting.";

const SYSTEM =
  "You are a buy-side fixed-income analyst specialising in Saudi (Tadawul) sukuk and bonds. " +
  "You produce concise, rigorous, educational analysis. You reason ONLY from the metrics provided and never fabricate or guess numbers; if a metric is null, treat it as unavailable and say so. " +
  "You do NOT give personalised investment advice and never tell the user to place a specific trade — you explain analysis and general strategy options (e.g. hold-to-maturity, roll-down/carry, relative-value switch, laddering, avoid-if-illiquid). " +
  "You always return valid JSON exactly matching the requested shape, with no prose or markdown around it, and you always include the provided disclaimer text verbatim.";

function getClient(): Anthropic {
  const { env } = getCloudflareContext();
  const apiKey = (env as unknown as { ANTHROPIC_API_KEY?: string })
    .ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the Worker.");
  }
  return new Anthropic({ apiKey });
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function parseJson<T>(text: string): T {
  let s = text.trim();
  // strip markdown fences if the model wrapped it
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

export interface InstrumentAnalysis {
  rating: string;
  score: number | null;
  strategy: string;
  summary: string;
  rationale: string[];
  risks: string[];
  disclaimer: string;
}

export async function analyzeInstrument(
  m: SukukMetrics
): Promise<{ analysis: InstrumentAnalysis; model: string }> {
  const client = getClient();
  const user =
    "Analyse this single sukuk and suggest suitable general trading/holding methods, grounded ONLY in these metrics.\n\n" +
    "METRICS (JSON):\n" +
    JSON.stringify(m, null, 2) +
    "\n\nReturn ONLY this JSON object:\n" +
    `{
  "rating": "Attractive" | "Fair" | "Rich" | "Avoid",
  "score": <integer 0-100, higher = more attractive on a risk-adjusted, relative-value basis>,
  "strategy": "<one short headline method>",
  "summary": "<2-4 sentence narrative>",
  "rationale": ["<short bullet>", "..."],
  "risks": ["<short bullet>", "..."],
  "disclaimer": ${JSON.stringify(SUKUK_DISCLAIMER)}
}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });

  const analysis = parseJson<InstrumentAnalysis>(textOf(resp.content));
  analysis.disclaimer = SUKUK_DISCLAIMER;
  return { analysis, model: MODEL };
}

export interface UniverseAnalysis {
  commentary: string;
  themes: string[];
  opportunities: Array<{
    code: string;
    name: string | null;
    rating: string;
    note: string;
  }>;
  disclaimer: string;
}

export async function analyzeUniverse(
  all: SukukMetrics[]
): Promise<{ analysis: UniverseAnalysis; model: string }> {
  const client = getClient();
  // Compact rows to keep the prompt small.
  const rows = all.map((m) => ({
    code: m.code,
    name: m.name,
    gov: m.isGovernment,
    type: m.couponType,
    coupon: m.couponRate,
    ytm: m.marketYield,
    yrs: m.yearsToMaturity,
    px: m.price,
    liq: m.liquidity,
    spdGovtBps: m.spreadVsGovtBps,
    pctile: m.yieldPercentile,
    chg30bps: m.yieldChange30dBps,
  }));
  const user =
    `Review the whole Tadawul sukuk & bonds universe (${rows.length} instruments) from these metrics and produce market commentary plus a ranked shortlist of the most interesting relative-value opportunities. Ground everything ONLY in the numbers.\n\n` +
    "UNIVERSE (JSON array):\n" +
    JSON.stringify(rows) +
    "\n\nReturn ONLY this JSON object:\n" +
    `{
  "commentary": "<one-paragraph market overview: yield levels, curve shape, liquidity, notable moves>",
  "themes": ["<short theme bullet>", "..."],
  "opportunities": [
    { "code": "<code>", "name": "<name>", "rating": "Attractive" | "Fair" | "Rich" | "Avoid", "note": "<one-line rationale + suggested method>" }
  ],
  "disclaimer": ${JSON.stringify(SUKUK_DISCLAIMER)}
}
Include up to 12 opportunities, most compelling first. Prefer instruments with real liquidity.`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  const resp = await stream.finalMessage();
  const analysis = parseJson<UniverseAnalysis>(textOf(resp.content));
  analysis.disclaimer = SUKUK_DISCLAIMER;
  return { analysis, model: MODEL };
}
