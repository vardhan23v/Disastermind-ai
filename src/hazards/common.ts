// Shared helpers for hazard scenarios — all deterministic.

import type { AgentResult } from '@/agents/contract';
import type { DamageState, TimelineEntry, WorldState } from '@/types';

export function mergeAgents(...results: AgentResult[]): AgentResult {
  const merged: AgentResult = {
    messages: [],
    recommendations: [],
    routes: [],
  };
  for (const r of results) {
    merged.messages.push(...r.messages);
    merged.recommendations.push(...r.recommendations);
    if (r.routes) merged.routes?.push(...r.routes);
  }
  return merged;
}/**
 * Deterministic SOS spawn: anchor is zone + metre offset. The id encodes
 * everything about the spawn, so re-simulation yields identical ids.
 */
export function spawnSos(
  world: WorldState,
  tick: number,
  anchor: { zone: string; dx: number; dy: number },
  desc: string,
  people: number,
  urgency: number
): void {
  const z = world.zones.find((x) => x.id === anchor.zone);
  if (!z) return;
  world.sos.push({
    id: `hz-${tick}-${anchor.zone}-${people}-${urgency}`,
    pos: { x: z.center.x + anchor.dx, y: z.center.y + anchor.dy },
    zone: z.id,
    kind: 'trapped',
    description: desc,
    peopleCount: people,
    urgency,
    reason: '',
    createdAtTick: tick,
    status: 'pending',
    source: 'etl',
  });
}

export function tallyDamage(metrics: Record<string, number>, fallback: DamageState): DamageState {
  return {
    buildingsDamaged: Math.round(metrics.buildingsDamaged ?? fallback.buildingsDamaged),
    roadsDestroyedKm: Math.round((metrics.roadsDestroyedKm ?? fallback.roadsDestroyedKm) * 10) / 10,
    powerLossPct: Math.round(metrics.powerLossPct ?? fallback.powerLossPct),
    affectedPopulation: Math.round(metrics.affectedPopulation ?? fallback.affectedPopulation),
    economicLossInr: Math.round(metrics.economicLossInr ?? fallback.economicLossInr),
  };
}

/** Format a simulated city-clock into a readable "Day N / HH:MM" label. */
export function clockSince(startMin: number, tick: number, tickMinutes: number): string {
  const mins = startMin + tick * tickMinutes;
  const day = Math.floor(mins / 1440);
  const hm = mins % 1440;
  const hh = String(Math.floor(hm / 60)).padStart(2, '0');
  const mm = String(hm % 60).padStart(2, '0');
  return `Day ${Math.max(1, day + 1)} · ${hh}:${mm}`;
}

export function beat(tick: number, tag: string, text: string, severity: RiskEntry['severity']): TimelineEntry {
  return { tick, tag, text, severity };
}

type RiskEntry = TimelineEntry;