// Road graph + Dijkstra route solver in city coordinates.

import { NET } from '@/constants';
import type { CityPoint, RoadSegment } from '@/types';
import { dist, roundTo } from '@/utils/geo';

const nodeKey = (p: CityPoint): string => `${roundTo(p.x, NET.nodeSnapM)}:${roundTo(p.y, NET.nodeSnapM)}`;

export type CostKind = 'civilian' | 'ambulance' | 'relief';

interface GraphEdge {
  to: string;
  lengthM: number;
  segmentIndex: number;
}

interface GraphNode {
  id: string;
  pos: CityPoint;
}

export interface RoadGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;
}

export function buildRoadGraph(segments: RoadSegment[]): RoadGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge[]>();

  const touch = (p: CityPoint): string => {
    const k = nodeKey(p);
    if (!nodes.has(k)) nodes.set(k, { id: k, pos: { x: p.x, y: p.y } });
    return k;
  };

  segments.forEach((seg, i) => {
    const a = touch(seg.from);
    const b = touch(seg.to);
    const push = (fromKey: string, toKey: string) => {
      const list = edges.get(fromKey) ?? [];
      list.push({ to: toKey, lengthM: seg.lengthM, segmentIndex: i });
      edges.set(fromKey, list);
    };
    push(a, b);
    push(b, a);
  });

  return { nodes, edges };
}

export interface RouteResult {
  waypoints: CityPoint[];
  lengthM: number;
  minuteEstimate: number;
}

function depthLimitFor(kind: CostKind): number {
  if (kind === 'ambulance') return NET.ambulanceBlockDepthM;
  if (kind === 'relief') return NET.reliefBlockDepthM;
  return NET.civilianBlockDepthM;
}

function isBlocked(seg: RoadSegment, kind: CostKind): boolean {
  if (seg.closed || seg.damaged) return true;
  const limit = depthLimitFor(kind);
  return seg.flooded && seg.floodLevel >= limit;
}

export function computeRoute(
  graph: RoadGraph,
  segments: RoadSegment[],
  from: CityPoint,
  to: CityPoint,
  kind: CostKind,
  speedKmh: number
): RouteResult | null {
  const startKey = nearestNode(graph, from);
  const targetKey = nearestNode(graph, to);
  if (!startKey || !targetKey) return null;

  const best = new Map<string, number>();
  const prev = new Map<string, { node: string; segmentIndex: number }>();
  const settled = new Set<string>();
  const queue: { key: string; score: number }[] = [{ key: startKey, score: 0 }];
  best.set(startKey, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.score - b.score);
    const cur = queue.shift();
    if (!cur || settled.has(cur.key)) continue;
    settled.add(cur.key);
    if (cur.key === targetKey) break;

    const curBest = best.get(cur.key) ?? 0;
    const outEdges = graph.edges.get(cur.key) ?? [];
    for (const edge of outEdges) {
      const seg = segments[edge.segmentIndex];
      if (isBlocked(seg, kind)) continue;
      const cost = edge.lengthM * (1 + seg.traffic * NET.trafficPenalty);
      const nextScore = curBest + cost;
      const known = best.get(edge.to);
      if (known === undefined || nextScore < known) {
        best.set(edge.to, nextScore);
        prev.set(edge.to, { node: cur.key, segmentIndex: edge.segmentIndex });
        queue.push({ key: edge.to, score: nextScore });
      }
    }
  }

  if (!best.has(targetKey)) return null;

  const rev: CityPoint[] = [];
  const usedSegments: number[] = [];
  let cursor: string | undefined = targetKey;
  while (cursor && cursor !== startKey) {
    const step = prev.get(cursor);
    if (!step) break;
    const node = graph.nodes.get(step.node);
    if (!node) break;
    rev.push({ x: node.pos.x, y: node.pos.y });
    usedSegments.push(step.segmentIndex);
    cursor = step.node;
  }
  rev.reverse();

  const head = graph.nodes.get(startKey);
  if (!head) return null;
  const waypoints: CityPoint[] = [{ ...from }, ...rev.map((p) => ({ x: p.x, y: p.y }))];

  const lengthM = usedSegments.reduce((acc, i) => acc + segments[i].lengthM, 0);
  return {
    waypoints,
    lengthM,
    minuteEstimate: (lengthM / 1000 / speedKmh) * 60,
  };
}

function nearestNode(graph: RoadGraph, p: CityPoint): string | null {
  let bestKey: string | null = null;
  let bestD = Infinity;
  for (const node of graph.nodes.values()) {
    const d = dist(p, node.pos);
    if (d < bestD) {
      bestD = d;
      bestKey = node.id;
    }
  }
  return bestKey;
}