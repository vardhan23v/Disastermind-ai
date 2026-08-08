// Shelter Recommendation Agent — occupancy, opening events and per-zone best fits.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import type { Shelter, WorldState } from '@/types';
import { dist } from '@/utils/geo';

export function runShelter(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  const justOpened = world.shelters.filter((s) => s.openedAtTick === tick);
  for (const s of justOpened) {
    out.messages.push({
      to: 'decision-support',
      kind: { kind: 'shelter-fit', shelterId: s.id, fill: fillPct(s) },
      confidence: 90,
      why: `Shelter activated with ${s.capacity} capacity, food ${yes(s.hasFood)}, water ${yes(s.hasWater)}, medical staff ${yes(
        s.hasMedicalStaff
      )}.`,
    });
  }

  const filling = world.shelters.filter(
    (s) => s.openedAtTick > 0 && s.openedAtTick < tick && tick === s.openedAtTick + 4
  );
  for (const s of filling) {
    out.messages.push({
      to: 'decision-support',
      kind: { kind: 'shelter-fit', shelterId: s.id, fill: fillPct(s) },
      confidence: 83,
      why: `Occupancy ${fillPct(s)}% — ${s.capacity - s.occupancy} beds remain; recommend redirecting evacuees to ${nearestAlt(
        world,
        s
      ).name}.`,
    });
  }

  if (tick === 22) {
    const best = bestShelterFor(world, 'C');
    out.messages.push({
      to: 'decision-support',
      kind: { kind: 'shelter-fit', shelterId: best.id, fill: fillPct(best) },
      confidence: 78,
      why: `Zone C evacuees best served by ${best.name} (${Math.round(dist(best.pos, { x: 6500, y: 5800 }) / 1000)} km, ${best.capacity - best.occupancy} beds left).`,
    });
  }

  return out;
}

function fillPct(s: Shelter): number {
  return Math.round((s.occupancy / s.capacity) * 100);
}

function nearestAlt(world: WorldState, s: Shelter): Shelter {
  const others = world.shelters.filter((x) => x.id !== s.id && x.openedAtTick > 0);
  if (others.length === 0) return s;
  return others.reduce((best, x) => (dist(s.pos, x.pos) < dist(s.pos, best.pos) ? x : best));
}

function bestShelterFor(world: WorldState, zone: string): Shelter {
  const candidates = world.shelters.filter((s) => s.openedAtTick > 0 || s.zone === zone);
  return candidates.reduce((best, s) =>
    s.capacity - s.occupancy > best.capacity - best.occupancy ? s : best
  );
}

function yes(b: boolean): string {
  return b ? 'yes' : 'no';
}