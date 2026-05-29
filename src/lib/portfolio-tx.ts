import { prisma } from "@/lib/db";

type EntityType =
  | "upload"
  | "saudi-stock"
  | "saudi-fund"
  | "usa-stock"
  | "gulf-stock"
  | "cash";
type Action = "upload" | "update";

// Records an investment-related change. Failures are swallowed so the
// underlying mutation still reports success even if the audit row fails to
// write — we'd rather lose an audit line than break the user's edit.
export async function logTransaction(
  entityType: EntityType,
  action: Action,
  changes: Record<string, unknown>,
  options: { entityId?: string | null; summary?: string | null } = {}
): Promise<void> {
  try {
    await prisma.investmentTransaction.create({
      data: {
        entityType,
        action,
        // Prisma's typed Json column will reject `undefined`; coerce.
        changes: JSON.parse(JSON.stringify(changes)),
        entityId: options.entityId ?? null,
        summary: options.summary ?? null,
      },
    });
  } catch (err) {
    console.error("[portfolio-tx] failed to log transaction", err);
  }
}

// Returns the subset of `updates` whose values actually differ from `existing`.
// Result is keyed by field with both old and new values so the audit log can
// show what changed.
export function buildDiff(
  existing: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    const old = existing[k];
    const oldNorm = old == null ? null : old;
    const newNorm = v == null ? null : v;
    if (oldNorm !== newNorm) {
      diff[k] = { from: oldNorm, to: newNorm };
    }
  }
  return diff;
}
