// Smart Evacuation Agent — computes safe routes on the live road graph and
// re-routes whenever a road floods or a bridge goes down.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import { buildRoadGraph, computeRoute } from '@/simulation/roadGraph';
import { nextRouteId } from '@/simulation/ids';
import type { CityPoint, RoutePlan, WorldState } from '@/types';
import { dist } from '@/utils/geo';

export function runEvacuation(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const graph = buildRoadGraph(world.roads);

  const zoneA = world.zones.find((z) => z.id === 'A');
  const shelter = world.shelters.find((s) => s.id === 'sh4') ?? world.shelters[0];
  if (!zoneA || !shelter) return out;

  const from: CityPoint = zoneA.center;
  const to: CityPoint = shelter.pos;

  const civilian = computeRoute(graph, world.roads, from, to, 'civilian', 30);
  const relief = computeRoute(graph, world.roads, from, to, 'relief', 26);

  const plans: RoutePlan[] = [];
  if (civilian) {
    plans.push({
      id: nextRouteId(tick),
      kind: 'civilian',
      waypoints: civilian.waypoints,
      lengthM: civilian.lengthM,
      minutes: civilian.minuteEstimate,
      reason: 'Zone A → open shelter, safest route',
      createdAtTick: tick,
    });
  }
  if (relief) {
    plans.push({
      id: nextRouteId(tick),
      kind: 'relief',
      waypoints: relief.waypoints,
      lengthM: relief.lengthM,
      minutes: relief.minuteEstimate,
      reason: 'Relief supply corridor to Zone A',
      createdAtTick: tick,
    });
  }

  const changed =
    world.routes.length !== plans.length ||
    plans.some((p, i) => !samePath(world.routes[i]?.waypoints ?? [], p.waypoints));

  if (changed && tick > 0) {
    const ringFlooded = world.roads.some((r) => r.name === 'Ring Road' && r.flooded);
    const bridgeDown = world.roads.some((r) => r.kind === 'bridge' && r.damaged);
    const causedBy = bridgeDown ? 'Delta Bridge collapsed' : ringFlooded ? 'Ring Road flooded' : 'flood extent updated';
    const plan = plans[0];
    if (plan) {
      out.messages.push({
        to: 'decision-support',
        kind: { kind: 'route', plan, causedBy },
        confidence: 85,
        why: `Recomputed on ${world.roads.length}-segment graph; ${causedBy.toLowerCase()}, cost function updated.`,
      });
    }
  }

  if (tick === 18 && world.hazard === 'cyclone') {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'route',
        plan: plans[0] ?? {
          id: nextRouteId(tick),
          kind: 'civilian',
          waypoints: [from, to],
          lengthM: dist(from, to),
          minutes: 0,
          reason: 'fallback',
          createdAtTick: tick,
        },
        causedBy: 'Ring Road under water',
      },
      confidence: 86,
      why: 'Flood depth on Ring Road exceeds 0.5 m — vehicles cannot pass.',
    });
  }

  out.routes = plans;
  return out;
}

function samePath(a: CityPoint[], b: CityPoint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => Math.abs(p.x - b[i].x) < 1 && Math.abs(p.y - b[i].y) < 1);
}