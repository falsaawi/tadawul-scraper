import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { StockMetrics } from "./stock-metrics";

const MODEL = "claude-opus-5";

export const STOCK_DISCLAIMER =
  "Informational and educational analysis only — not investment advice, not a recommendation to buy or sell securities, and not a regulated financial service. Figures are derived from scraped filings and prices and may be stale, incomplete, or misstated. Verify independently before acting.";

const SYSTEM =
  "You are a sell-side equity analyst covering Saudi (Tadawul) listed companies. " +
  "You produce concise, rigorous, educational analysis. You reason ONLY from the metrics provided and never fabricate numbers; if a metric is null, treat it as unavailable and say so. " +
  "Financials are in thousands of SAR unless noted. You do NOT give personalised investment advice; you explain the fundamental picture, a valuation stance, and general strategy — framed as analysis, not a directive to trade. " +
  "You always return valid JSON exactly matching the requested shape, with no prose or markdown around it, and always include the provided disclaimer verbatim.";

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
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

export interface StockAnalysis {
  rating: string; // Strong Buy | Buy | Hold | Reduce | Sell
  score: number | null; // 0-100
  recommendation: string; // short action headline
  valuation: string; // Cheap | Fair | Expensive + one line
  priceTarget: number | null; // 12-month fair-value target (SAR)
  upside: number | null; // % vs current price
  summary: string;
  strengths: string[];
  risks: string[];
  catalysts: string[];
  disclaimer: string;
}

export async function analyzeStock(
  m: StockMetrics
): Promise<{ analysis: StockAnalysis; model: string }> {
  const client = getClient();
  const user =
    "Analyse this Tadawul-listed company from the computed fundamentals and price data, then give a valuation stance and a clear recommendation, grounded ONLY in these numbers.\n\n" +
    "METRICS (JSON):\n" +
    JSON.stringify(m, null, 2) +
    "\n\nReturn ONLY this JSON object:\n" +
    `{
  "rating": "Strong Buy" | "Buy" | "Hold" | "Reduce" | "Sell",
  "score": <integer 0-100, higher = more attractive risk-adjusted>,
  "recommendation": "<one short action headline>",
  "valuation": "<Cheap | Fair | Expensive> — <one line why>",
  "priceTarget": <number: a 12-month fair-value price target in SAR, derived from the metrics (e.g. a justified P/E or P/B on forward earnings/book); null only if there is genuinely no basis>,
  "upside": <number: percentage change from currentPrice to priceTarget>,
  "summary": "<3-5 sentence narrative: business quality, growth, profitability, valuation>",
  "strengths": ["<short bullet>", "..."],
  "risks": ["<short bullet>", "..."],
  "catalysts": ["<short bullet>", "..."],
  "disclaimer": ${JSON.stringify(STOCK_DISCLAIMER)}
}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });

  const analysis = parseJson<StockAnalysis>(textOf(resp.content));
  analysis.disclaimer = STOCK_DISCLAIMER;
  return { analysis, model: MODEL };
}
