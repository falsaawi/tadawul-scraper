// Maps Arabic broker company names from the dividend report to Tadawul
// symbols. Robust to short broker shorthand vs. the longer official names
// returned by the scraper.

const STRIP_TOKENS = new Set([
  "شركه", "مجموعه", "بنك", "مصرف", "صندوق", "صكوك",
  "السعوديه", "السعودي", "السعوديا", "العربيه", "العالميه",
  "والصناعيه", "الصناعيه", "الصناعي",
  "co", "company", "corp", "corporation", "ltd", "limited", "inc",
]);

// Normalise Arabic + Latin text for comparison.
function normalise(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "") // diacritics + tatweel
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^؀-ۿa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function tokenise(input: string | null | undefined): string[] {
  const n = normalise(input);
  if (!n) return [];
  return n
    .split(" ")
    .filter((t) => t.length > 0 && !STRIP_TOKENS.has(t));
}

function compact(tokens: string[]): string {
  return tokens.join("");
}

export interface CandidateName {
  symbol: string;
  name: string | null | undefined;
}

export interface MappingIndex {
  // sorted by descending compact length so the most specific match wins first
  candidates: Array<{ symbol: string; tokens: string[]; compact: string }>;
}

export function buildMappingIndex(candidates: CandidateName[]): MappingIndex {
  const seen = new Set<string>();
  const out: MappingIndex["candidates"] = [];
  for (const c of candidates) {
    if (!c.name || !c.symbol) continue;
    const tokens = tokenise(c.name);
    if (tokens.length === 0) continue;
    const compactKey = compact(tokens);
    const dedupKey = c.symbol + ":" + compactKey;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push({ symbol: c.symbol, tokens, compact: compactKey });
  }
  out.sort((a, b) => b.compact.length - a.compact.length);
  return { candidates: out };
}

// Returns the symbol that best matches `name`, or null if no candidate is
// confident enough.
export function resolveSymbol(
  name: string | null | undefined,
  index: MappingIndex
): string | null {
  const tokens = tokenise(name);
  if (tokens.length === 0) return null;
  const compactKey = compact(tokens);
  const tokenSet = new Set(tokens);

  // 1. Exact compact match
  for (const c of index.candidates) {
    if (c.compact === compactKey) return c.symbol;
  }

  // 2. All-token containment (compact). Pick the longest candidate
  // whose compact form contains ours OR vice versa.
  for (const c of index.candidates) {
    if (compactKey.length < 3 || c.compact.length < 3) continue;
    if (c.compact.includes(compactKey) || compactKey.includes(c.compact)) {
      return c.symbol;
    }
  }

  // 3. Full token overlap — every token in the shorter side must appear in
  // the longer side. Prefer candidates whose token set is fully covered by
  // our tokens (broker name is more verbose) or vice versa.
  for (const c of index.candidates) {
    const cSet = new Set(c.tokens);
    const allOursInTheirs = tokens.every((t) => cSet.has(t));
    const allTheirsInOurs = c.tokens.every((t) => tokenSet.has(t));
    if (allOursInTheirs || allTheirsInOurs) return c.symbol;
  }

  // 4. Majority overlap fallback — at least 2 tokens AND >=70% overlap
  if (tokens.length >= 2) {
    let bestSym: string | null = null;
    let bestScore = 0;
    for (const c of index.candidates) {
      if (c.tokens.length < 2) continue;
      const cSet = new Set(c.tokens);
      let hits = 0;
      for (const t of tokens) if (cSet.has(t)) hits++;
      const score = hits / Math.max(tokens.length, c.tokens.length);
      if (hits >= 2 && score >= 0.7 && score > bestScore) {
        bestScore = score;
        bestSym = c.symbol;
      }
    }
    if (bestSym) return bestSym;
  }

  return null;
}
