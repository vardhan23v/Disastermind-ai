// Emergency Resources Agent — hospital capacity, ICU, oxygen, nearby units.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import type { Hospital, WorldState } from '@/types';
import { dist } from '@/utils/geo';

export function runResources(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  if (tick === 0) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'capacity',
        facility: 'Fleet readiness',
        pct: 96,
        near: ['25 ambulances', '6 boats', '4 relief trucks'],
      },
      confidence: 95,
      why: 'All units pre-positioned at bases with fuel and medical kits.',
    });
  }

  for (const hospital of world.hospitals) {
    const prevPct = hospital.capacityPct;
    if (crosses(prevPct, hospital.capacityPct)) continue;
    if (hospital.capacityPct < 80) continue;
    const near = nearestVehicles(world, hospital.pos, 2);
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'capacity',
        facility: hospital.name,
        pct: hospital.capacityPct,
        near: near.length ? [near[0].name, near[1]?.name ?? ''] : ['no unit nearby'],
      },
      confidence: 92,
      why: `Occupancy ${hospital.capacityPct}% · ICU ${hospital.icuOccupied}/${hospital.icuTotal} · O₂ ${hospital.oxygen.toUpperCase()} · nearest unit ${Math.round(
        near[0] ? dist(hospital.pos, near[0].pos) / 1000 : 0
      )} km`,
    });
  }

  if (tick === 24) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'capacity',
        facility: 'Central District Hospital',
        pct: 90,
        near: ['AMB-101', 'AMB-118'],
      },
      confidence: 94,
      why: 'Trauma admissions from Zone A surged; ICU 1 bed left; O₂ low.',
    });
  }

  return out;
}

function crosses(prev: number, next: number): boolean {
  // only report when threshold band changes (60/80/90) between ticks
  const band = (p: number): number => (p >= 90 ? 3 : p >= 80 ? 2 : p >= 60 ? 1 : 0);
  return band(prev) === band(next);
}

function nearestVehicles(world: WorldState, pos: Hospital['pos'], count: number) {
  return world.vehicles
    .filter((v) => v.status === 'idle')
    .sort((a, b) => dist(pos, a.pos) - dist(pos, b.pos))
    .slice(0, count);
}