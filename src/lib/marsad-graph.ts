import { MARSAD, type DataElement, type Domain } from "./marsad-dictionary";

export type NodeKind = "domain" | "element";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** For element nodes: how many domains share it. For domain nodes: element count. */
  weight: number;
  /** Domain id (only for kind=element) — undefined for domain nodes */
  domainIds?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface MarsadGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Map from normalized element name -> the originating element entries grouped by domain. */
  elementOccurrences: Record<string, { domain: Domain; element: DataElement }[]>;
}

function normalizeElementName(name: string): string {
  return name
    .replace(/\s*\[[\d,\s]+\]\s*/g, "") // drop footnote refs like "[1]"
    .replace(/([A-Za-z0-9])\(/g, "$1 (") // "code(nhic)" -> "code (nhic)"
    .replace(/\)([A-Za-z0-9])/g, ") $1")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/Nhic|Mrn|Moh|Spo2|Id|Dmft/gi, (m) => m.toUpperCase());
}

/**
 * Build a bipartite graph of domains and shared "spine" elements.
 *
 * Edges connect a domain to an element node only if that element appears
 * in `minDomains` or more domains (default 3). Elements unique to a single
 * domain are excluded — they aren't part of the integration spine.
 */
export function buildMarsadGraph(minDomains = 3): MarsadGraph {
  const occurrences: Record<string, { domain: Domain; element: DataElement }[]> = {};
  for (const dom of MARSAD.domains) {
    for (const el of dom.elements) {
      const key = normalizeElementName(el.name);
      if (!key) continue;
      (occurrences[key] ||= []).push({ domain: dom, element: el });
    }
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Track which domains will end up with at least one shared element.
  const linkedDomains = new Set<string>();

  for (const [key, occList] of Object.entries(occurrences)) {
    const uniqueDomains = Array.from(new Set(occList.map((o) => o.domain.id)));
    if (uniqueDomains.length < minDomains) continue;
    const elNodeId = `el:${key}`;
    nodes.push({
      id: elNodeId,
      kind: "element",
      label: titleCase(key),
      weight: uniqueDomains.length,
      domainIds: uniqueDomains,
    });
    for (const domId of uniqueDomains) {
      edges.push({ source: `dom:${domId}`, target: elNodeId });
      linkedDomains.add(domId);
    }
  }

  for (const dom of MARSAD.domains) {
    nodes.push({
      id: `dom:${dom.id}`,
      kind: "domain",
      label: dom.name,
      weight: dom.elementCount,
    });
  }

  return { nodes, edges, elementOccurrences: occurrences };
}

export { normalizeElementName };
