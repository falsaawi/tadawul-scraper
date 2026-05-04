"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  X,
  ShieldAlert,
  Lock,
  Eye,
  ListTree,
  Hash,
  Tag,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Network,
  LayoutDashboard,
  HeartHandshake,
} from "lucide-react";
import {
  MARSAD,
  TOTAL_ELEMENTS,
  CLASSIFICATIONS,
  DATA_TYPES,
  type DataElement,
  type Domain,
} from "@/lib/marsad-dictionary";

type MandatoryFilter = "all" | "mandatory" | "optional";
type ClassificationFilter = "all" | (typeof CLASSIFICATIONS)[number];

const CLASS_STYLES: Record<string, { bg: string; text: string; icon: typeof Eye }> = {
  Public: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", icon: Eye },
  Confidential: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", icon: Lock },
  Secret: { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400", icon: ShieldAlert },
  "Top Secret": { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400", icon: ShieldAlert },
};

function classificationKey(value?: string): keyof typeof CLASS_STYLES | undefined {
  if (!value) return undefined;
  const v = value.trim();
  return (CLASSIFICATIONS as readonly string[]).find((c) => v.toLowerCase() === c.toLowerCase()) as
    | keyof typeof CLASS_STYLES
    | undefined;
}

function isMandatory(el: DataElement): boolean {
  return (el.mandatory || "").toLowerCase().startsWith("mandatory");
}

function cleanName(name: string): string {
  return name.replace(/\s*\[[\d,\s]+\]\s*$/g, "").trim();
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-500/30 text-foreground rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function ClinicalSchemaExplorer() {
  const [domainId, setDomainId] = useState<string>("__all");
  const [query, setQuery] = useState("");
  const [mandatoryFilter, setMandatoryFilter] = useState<MandatoryFilter>("all");
  const [classFilter, setClassFilter] = useState<ClassificationFilter>("all");
  const [dataTypeFilter, setDataTypeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: { domain: Domain; el: DataElement }[] = [];
    for (const dom of MARSAD.domains) {
      if (domainId !== "__all" && dom.id !== domainId) continue;
      for (const el of dom.elements) {
        if (mandatoryFilter === "mandatory" && !isMandatory(el)) continue;
        if (mandatoryFilter === "optional" && isMandatory(el)) continue;
        if (classFilter !== "all") {
          if ((el.classification || "").trim().toLowerCase() !== classFilter.toLowerCase())
            continue;
        }
        if (dataTypeFilter !== "all") {
          if ((el.dataType || "").trim().toLowerCase() !== dataTypeFilter.toLowerCase())
            continue;
        }
        if (q) {
          const blob = [
            el.name,
            el.definition,
            el.dataType,
            el.format,
            el.encounterTypes,
            el.codeSet,
            el.guidance,
            el.validationRules,
          ]
            .filter(Boolean)
            .join("  ")
            .toLowerCase();
          if (!blob.includes(q)) continue;
        }
        list.push({ domain: dom, el });
      }
    }
    return list;
  }, [domainId, query, mandatoryFilter, classFilter, dataTypeFilter]);

  const groupedByDomain = useMemo(() => {
    const map = new Map<string, { domain: Domain; els: DataElement[] }>();
    for (const { domain, el } of allMatches) {
      const entry = map.get(domain.id) ?? { domain, els: [] };
      entry.els.push(el);
      map.set(domain.id, entry);
    }
    return Array.from(map.values());
  }, [allMatches]);

  const selected = useMemo(() => {
    if (!selectedId) return allMatches[0];
    return allMatches.find((m) => m.el.id === selectedId) ?? allMatches[0];
  }, [selectedId, allMatches]);

  const stats = useMemo(() => {
    let mand = 0;
    let conf = 0;
    for (const { el } of allMatches) {
      if (isMandatory(el)) mand++;
      const k = classificationKey(el.classification);
      if (k && k !== "Public") conf++;
    }
    return { count: allMatches.length, mandatory: mand, confidential: conf };
  }, [allMatches]);

  const filtersActive =
    !!query ||
    mandatoryFilter !== "all" ||
    classFilter !== "all" ||
    dataTypeFilter !== "all" ||
    domainId !== "__all";

  function clearFilters() {
    setQuery("");
    setMandatoryFilter("all");
    setClassFilter("all");
    setDataTypeFilter("all");
    setDomainId("__all");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Activity className="h-5 w-5 text-primary" />
              <span>Marsad Schema Explorer</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/clinical"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-foreground bg-accent inline-flex items-center gap-1.5"
              >
                <ListTree className="h-4 w-4" />
                Elements
              </Link>
              <Link
                href="/clinical/graph"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <Network className="h-4 w-4" />
                Network
              </Link>
              <Link
                href="/clinical/dashboard"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/clinical/care-plan"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <HeartHandshake className="h-4 w-4" />
                Care Plan
              </Link>
            </nav>
            <span className="hidden md:inline text-xs text-muted-foreground">
              v{MARSAD.version}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{MARSAD.domains.length} domains</span>
            <span className="w-px h-4 bg-border" />
            <span>{TOTAL_ELEMENTS} elements</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        {/* Search + filter row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search element name, definition, code set, validation…"
              className="w-full pl-8 pr-8 py-1.5 text-sm bg-input/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={mandatoryFilter}
            onChange={(e) => setMandatoryFilter(e.target.value as MandatoryFilter)}
            className="text-sm bg-input/40 border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All requirement</option>
            <option value="mandatory">Mandatory</option>
            <option value="optional">Optional</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as ClassificationFilter)}
            className="text-sm bg-input/40 border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All classifications</option>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={dataTypeFilter}
            onChange={(e) => setDataTypeFilter(e.target.value)}
            className="text-sm bg-input/40 border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All data types</option>
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 border border-border rounded-md hover:bg-accent"
            >
              Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ListTree className="h-3.5 w-3.5" />
              {stats.count} matching
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {stats.mandatory} mandatory
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              {stats.confidential} sensitive
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Domain sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-[72px]">
              <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                Domains
              </div>
              <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                <button
                  onClick={() => setDomainId("__all")}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b border-border hover:bg-accent transition-colors ${
                    domainId === "__all" ? "bg-accent text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="font-medium">All domains</span>
                  <span className="text-[10px] tabular-nums">{TOTAL_ELEMENTS}</span>
                </button>
                {MARSAD.domains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDomainId(d.id);
                      setSelectedId(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b border-border hover:bg-accent transition-colors ${
                      domainId === d.id ? "bg-accent text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span className="truncate pr-2">
                      {d.name
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())
                        .replace(/Nhic|Moh|His|Mawid|Opd/g, (m) => m.toUpperCase())}
                    </span>
                    <span className="text-[10px] tabular-nums">{d.elementCount}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Element list */}
          <section className="col-span-12 md:col-span-5 lg:col-span-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-3 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground flex justify-between">
                <span>Elements</span>
                {filtersActive && <span>{stats.count} match</span>}
              </div>
              <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                {groupedByDomain.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No elements match your filters.
                  </div>
                )}
                {groupedByDomain.map(({ domain, els }) => (
                  <div key={domain.id}>
                    {domainId === "__all" && (
                      <div className="px-3 py-1.5 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground sticky top-0 backdrop-blur">
                        {domain.name}
                        <span className="ml-2 text-muted-foreground/60">{els.length}</span>
                      </div>
                    )}
                    {els.map((el) => {
                      const isSel = selected?.el.id === el.id;
                      const cKey = classificationKey(el.classification);
                      const cs = cKey ? CLASS_STYLES[cKey] : null;
                      const Icon = cs?.icon;
                      return (
                        <button
                          key={el.id}
                          onClick={() => setSelectedId(el.id)}
                          className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-accent transition-colors ${
                            isSel ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground truncate">
                                {highlight(cleanName(el.name), query)}
                              </div>
                              {el.definition && (
                                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {highlight(el.definition.split("\n")[0], query)}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {el.dataType && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                                    <Hash className="h-2.5 w-2.5" />
                                    {el.dataType}
                                  </span>
                                )}
                                {isMandatory(el) ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Mandatory
                                  </span>
                                ) : el.mandatory ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                                    {el.mandatory}
                                  </span>
                                ) : null}
                                {cs && Icon && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${cs.bg} ${cs.text}`}
                                  >
                                    <Icon className="h-2.5 w-2.5" />
                                    {el.classification}
                                  </span>
                                )}
                                {el.codeTable && el.codeTable.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Tag className="h-2.5 w-2.5" />
                                    {el.codeTable.length} codes
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 mt-0.5 shrink-0 ${
                                isSel ? "text-foreground" : "text-muted-foreground"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Detail panel */}
          <section className="col-span-12 md:col-span-4 lg:col-span-6">
            {selected ? (
              <ElementDetail domain={selected.domain} el={selected.el} query={query} />
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground text-sm">
                Pick an element to view its definition, validation rules, and code set.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ElementDetail({
  domain,
  el,
  query,
}: {
  domain: Domain;
  el: DataElement;
  query: string;
}) {
  const cKey = classificationKey(el.classification);
  const cs = cKey ? CLASS_STYLES[cKey] : null;
  const Icon = cs?.icon;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {domain.name} · #{el.number}
          </div>
          <h2 className="text-lg font-semibold mt-0.5 break-words">
            {highlight(cleanName(el.name), query)}
          </h2>
        </div>
        {cs && Icon && (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border whitespace-nowrap ${cs.bg} ${cs.text}`}
          >
            <Icon className="h-3 w-3" />
            {el.classification}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {el.definition && (
          <Field label="Definition">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {highlight(el.definition, query)}
            </p>
          </Field>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Meta label="Data Type" value={el.dataType} />
          <Meta label="Format" value={el.format} />
          <Meta label="Requirement" value={el.mandatory} highlight={isMandatory(el)} />
          <Meta label="Encounter Types" value={el.encounterTypes} />
          <Meta label="Maximum Occurrences" value={el.maxOccurrences} />
          <Meta label="Classification" value={el.classification} />
        </div>

        {el.codeSet && (
          <Field label="Code Set / Standard">
            <p className="text-sm whitespace-pre-line">{el.codeSet}</p>
          </Field>
        )}

        {el.codeTable && el.codeTable.length > 0 && (
          <Field label={`Code Values (${el.codeTable.length})`}>
            <div className="border border-border rounded-md overflow-hidden">
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium">Code</th>
                      {hasShortLong(el.codeTable) ? (
                        <>
                          <th className="text-left px-2 py-1.5 font-medium">Short</th>
                          <th className="text-left px-2 py-1.5 font-medium">Description</th>
                        </>
                      ) : (
                        <th className="text-left px-2 py-1.5 font-medium">Description</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {el.codeTable.map((row, i) => (
                      <tr
                        key={`${row.code}-${i}`}
                        className="border-t border-border hover:bg-accent/40"
                      >
                        <td className="px-2 py-1.5 font-mono text-xs whitespace-nowrap align-top">
                          {row.code}
                        </td>
                        {hasShortLong(el.codeTable!) ? (
                          <>
                            <td className="px-2 py-1.5 align-top">
                              {row.shortDescription || "—"}
                            </td>
                            <td className="px-2 py-1.5 align-top">
                              {row.longDescription || row.description || "—"}
                            </td>
                          </>
                        ) : (
                          <td className="px-2 py-1.5 align-top">
                            {row.description || row.longDescription || "—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Field>
        )}

        {el.guidance && (
          <Field label="Guidance for Use">
            <p className="text-sm leading-relaxed whitespace-pre-line">{el.guidance}</p>
          </Field>
        )}

        {el.validationRules && (
          <Field label="Validation Rules">
            <p className="text-sm leading-relaxed flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span className="whitespace-pre-line">{el.validationRules}</span>
            </p>
          </Field>
        )}

        {el.rawText && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View raw dictionary entry
            </summary>
            <pre className="mt-2 p-3 bg-muted/40 border border-border rounded-md text-[11px] whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground">
              {el.rawText}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function hasShortLong(rows: { shortDescription?: string }[]) {
  return rows.some((r) => r.shortDescription !== undefined);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function Meta({
  label,
  value,
  highlight: hl,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="bg-muted/40 border border-border rounded-md px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-sm mt-0.5 break-words ${hl ? "text-emerald-400 font-medium" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
