"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Network, ListTree, RotateCcw, LayoutDashboard, HeartHandshake } from "lucide-react";
import { MARSAD } from "@/lib/marsad-dictionary";
import {
  buildMarsadGraph,
  normalizeElementName,
  type GraphNode,
} from "@/lib/marsad-graph";

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

const WIDTH = 1100;
const HEIGHT = 720;

function initialPositions(nodes: GraphNode[]): SimNode[] {
  // Place domain nodes around an outer ring, element nodes in an inner ring.
  const doms = nodes.filter((n) => n.kind === "domain");
  const els = nodes.filter((n) => n.kind === "element");
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const outerR = Math.min(WIDTH, HEIGHT) * 0.42;
  const innerR = Math.min(WIDTH, HEIGHT) * 0.18;

  const place = (arr: GraphNode[], r: number, offset = 0): SimNode[] =>
    arr.map((n, i) => {
      const a = (i / arr.length) * Math.PI * 2 + offset;
      return {
        ...n,
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        vx: 0,
        vy: 0,
        pinned: false,
      };
    });

  return [...place(doms, outerR), ...place(els, innerR, Math.PI / els.length)];
}

function step(
  nodes: SimNode[],
  edges: { source: string; target: string }[],
  draggingId: string | null
) {
  const byId: Record<string, SimNode> = {};
  for (const n of nodes) byId[n.id] = n;

  const repulsion = 9000;
  const springK = 0.012;
  const restLen = 130;
  const damping = 0.82;
  const center = { x: WIDTH / 2, y: HEIGHT / 2 };

  // Repulsion between every pair (n is small so O(n²) is fine).
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a.pinned || a.id === draggingId) continue;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dist2 = dx * dx + dy * dy;
      if (dist2 < 1) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        dist2 = 1;
      }
      const dist = Math.sqrt(dist2);
      const force = repulsion / dist2;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
    }
  }

  // Springs along edges.
  for (const e of edges) {
    const a = byId[e.source];
    const b = byId[e.target];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
    const diff = dist - restLen;
    const fx = (dx / dist) * diff * springK;
    const fy = (dy / dist) * diff * springK;
    if (!a.pinned && a.id !== draggingId) {
      a.vx += fx;
      a.vy += fy;
    }
    if (!b.pinned && b.id !== draggingId) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Soft centering.
  for (const n of nodes) {
    if (n.pinned || n.id === draggingId) continue;
    n.vx += (center.x - n.x) * 0.0015;
    n.vy += (center.y - n.y) * 0.0015;
  }

  // Integrate.
  const padding = 30;
  for (const n of nodes) {
    if (n.pinned || n.id === draggingId) continue;
    n.vx *= damping;
    n.vy *= damping;
    n.x = Math.max(padding, Math.min(WIDTH - padding, n.x + n.vx));
    n.y = Math.max(padding, Math.min(HEIGHT - padding, n.y + n.vy));
  }
}

export default function ClinicalNetworkGraph() {
  const graph = useMemo(() => buildMarsadGraph(3), []);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [nodes, setNodes] = useState<SimNode[]>(() => initialPositions(graph.nodes));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const tickRef = useRef(0);

  // Adjacency for highlighting.
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [graph.edges]);

  // Run simulation.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      tickRef.current += 1;
      setNodes((prev) => {
        const copy = prev.map((n) => ({ ...n }));
        step(copy, graph.edges, draggingId);
        return copy;
      });
      // Run ~250 frames of cooldown then continue lazily for drag.
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  function svgPoint(e: React.MouseEvent | MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = "clientX" in e ? e.clientX : 0;
    pt.y = "clientY" in e ? e.clientY : 0;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: pt.x, y: pt.y };
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  }

  function onNodeMouseDown(e: React.MouseEvent, n: SimNode) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(n.id);
    const p = svgPoint(e);
    dragOffsetRef.current = { dx: p.x - n.x, dy: p.y - n.y };
    setDraggingId(n.id);
  }

  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: MouseEvent) => {
      const p = svgPoint(e);
      const off = dragOffsetRef.current;
      if (!off) return;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingId
            ? { ...n, x: p.x - off.dx, y: p.y - off.dy, vx: 0, vy: 0 }
            : n
        )
      );
    };
    const onUp = () => {
      setDraggingId(null);
      dragOffsetRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingId]);

  function reset() {
    setNodes(initialPositions(graph.nodes));
    setSelectedId(null);
  }

  const highlighted = selectedId
    ? new Set([selectedId, ...(adjacency.get(selectedId) || [])])
    : null;

  const selectedNode = nodes.find((n) => n.id === selectedId);

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
                className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1.5"
              >
                <ListTree className="h-4 w-4" />
                Elements
              </Link>
              <Link
                href="/clinical/graph"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-foreground bg-accent inline-flex items-center gap-1.5"
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
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{nodes.filter((n) => n.kind === "domain").length} domains</span>
            <span className="w-px h-4 bg-border" />
            <span>{nodes.filter((n) => n.kind === "element").length} shared elements</span>
            <span className="w-px h-4 bg-border" />
            <span>{graph.edges.length} links</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-9">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Integration spine</div>
                <div className="text-xs text-muted-foreground">
                  Domains (outer) linked through shared "spine" data elements (inner). Click a node
                  to inspect; drag to reposition.
                </div>
              </div>
              <button
                onClick={reset}
                className="text-xs px-2 py-1 border border-border rounded-md hover:bg-accent inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset layout
              </button>
            </div>
            <div className="bg-[hsl(222,47%,5%)]">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full h-[720px] select-none"
                onClick={() => setSelectedId(null)}
              >
                <defs>
                  <radialGradient id="domGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(142 76% 45%)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="hsl(142 76% 25%)" stopOpacity="1" />
                  </radialGradient>
                  <radialGradient id="elGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(38 92% 60%)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="hsl(38 92% 38%)" stopOpacity="1" />
                  </radialGradient>
                </defs>

                {/* Edges */}
                {graph.edges.map((e, i) => {
                  const a = nodes.find((n) => n.id === e.source);
                  const b = nodes.find((n) => n.id === e.target);
                  if (!a || !b) return null;
                  const isHi =
                    highlighted &&
                    highlighted.has(a.id) &&
                    highlighted.has(b.id);
                  const dim = highlighted && !isHi;
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={isHi ? "hsl(142 76% 50%)" : "hsl(215 20% 30%)"}
                      strokeOpacity={dim ? 0.12 : isHi ? 0.85 : 0.45}
                      strokeWidth={isHi ? 1.6 : 0.9}
                    />
                  );
                })}

                {/* Nodes */}
                {nodes.map((n) => {
                  const isSel = n.id === selectedId;
                  const isHover = n.id === hoverId;
                  const isHi = highlighted ? highlighted.has(n.id) : true;
                  const r =
                    n.kind === "domain"
                      ? 12 + Math.min(18, Math.sqrt(n.weight) * 1.5)
                      : 6 + Math.min(14, n.weight * 1.2);
                  const fill = n.kind === "domain" ? "url(#domGrad)" : "url(#elGrad)";
                  const stroke = isSel
                    ? "hsl(0 0% 100%)"
                    : isHover
                      ? "hsl(210 40% 90%)"
                      : "hsl(215 20% 25%)";
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x},${n.y})`}
                      style={{ cursor: "pointer", opacity: isHi ? 1 : 0.25 }}
                      onMouseDown={(ev) => onNodeMouseDown(ev, n)}
                      onMouseEnter={() => setHoverId(n.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedId(n.id);
                      }}
                    >
                      <circle
                        r={r}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSel ? 2.5 : 1}
                      />
                      <text
                        y={r + 12}
                        textAnchor="middle"
                        fill={
                          isSel || isHover
                            ? "hsl(210 40% 95%)"
                            : "hsl(210 40% 75%)"
                        }
                        fontSize={n.kind === "domain" ? 11 : 10}
                        fontWeight={n.kind === "domain" ? 600 : 400}
                        style={{
                          pointerEvents: "none",
                          paintOrder: "stroke",
                          stroke: "hsl(222 47% 5%)",
                          strokeWidth: 3,
                          strokeLinejoin: "round",
                        }}
                      >
                        {truncate(n.label, n.kind === "domain" ? 22 : 18)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="px-3 py-2 border-t border-border flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> Domain
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> Shared element
              </span>
              <span className="ml-auto">
                Bigger node = more elements (domain) or more domains (element)
              </span>
            </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-3">
          <DetailPanel
            node={selectedNode}
            adjacency={adjacency}
            graph={graph}
          />
        </section>
      </main>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function DetailPanel({
  node,
  adjacency,
  graph,
}: {
  node: SimNode | undefined;
  adjacency: Map<string, Set<string>>;
  graph: ReturnType<typeof buildMarsadGraph>;
}) {
  if (!node) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground mb-2">How to read this</div>
        <p className="leading-relaxed">
          Each <span className="text-emerald-400">green</span> node is a clinical domain. Each{" "}
          <span className="text-amber-400">amber</span> node is a data element that appears in 3
          or more domains — the integration spine.
        </p>
        <p className="leading-relaxed mt-2">
          The four central hubs (Patient Unique Number, Facility Code, MRN, Encounter Number) tie
          virtually every domain together — these are the join keys for any cross-domain query.
        </p>
        <p className="text-xs mt-3 text-muted-foreground/80">
          Click a node for details. Drag to reposition.
        </p>
      </div>
    );
  }

  const neighborIds = Array.from(adjacency.get(node.id) || []);

  if (node.kind === "domain") {
    const domId = node.id.replace(/^dom:/, "");
    const dom = MARSAD.domains.find((d) => d.id === domId);
    const sharedEls = neighborIds.map((nid) =>
      graph.nodes.find((n) => n.id === nid)
    );
    return (
      <div className="bg-card border border-border rounded-lg p-4 text-sm">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Domain</div>
        <h2 className="text-base font-semibold mt-0.5 mb-2">{dom?.name}</h2>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="Total elements" value={dom?.elementCount ?? 0} />
          <Stat label="Shared with others" value={neighborIds.length} />
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Shared elements ({sharedEls.length})
        </div>
        <ul className="space-y-1 max-h-[420px] overflow-auto">
          {sharedEls.map((el) =>
            el ? (
              <li
                key={el.id}
                className="px-2 py-1.5 bg-muted/40 border border-border rounded text-xs flex items-center justify-between gap-2"
              >
                <span className="truncate">{el.label}</span>
                <span className="text-[10px] text-amber-400 whitespace-nowrap">
                  {el.weight} doms
                </span>
              </li>
            ) : null
          )}
        </ul>
        <Link
          href={`/clinical?domain=${dom?.id}`}
          className="mt-3 inline-block text-xs text-primary hover:underline"
        >
          Browse all elements →
        </Link>
      </div>
    );
  }

  // element node
  const key = node.id.replace(/^el:/, "");
  const occList = graph.elementOccurrences[key] || [];
  return (
    <div className="bg-card border border-border rounded-lg p-4 text-sm">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Shared element
      </div>
      <h2 className="text-base font-semibold mt-0.5 mb-2">{node.label}</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat label="Domains" value={node.weight} />
        <Stat label="Occurrences" value={occList.length} />
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        Appears in
      </div>
      <ul className="space-y-1 max-h-[420px] overflow-auto">
        {occList.map((o, i) => (
          <li
            key={o.domain.id + ":" + i}
            className="px-2 py-1.5 bg-muted/40 border border-border rounded text-xs"
          >
            <div className="font-medium text-foreground">{o.domain.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {o.element.dataType ? `${o.element.dataType} · ` : ""}
              {o.element.mandatory || "—"}
              {o.element.classification ? ` · ${o.element.classification}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-muted/40 border border-border rounded px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

// Use the imported helper to satisfy the type checker re: re-export.
void normalizeElementName;
