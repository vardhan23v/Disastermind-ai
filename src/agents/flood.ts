// Flood Prediction Agent — depth per zone, time-to-impact, roads at risk.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import { floodDepthAt, floodLevelAt, roadFloodAt } from '@/simulation/forecast';
import type { WorldState, ZoneId } from '@/types';

const STAGES: { tick: number; zone: ZoneId }[] = [
  { tick: 12, zone: 'A' },
  { tick: 16, zone: 'B' },
  { tick: 20, zone: 'C' },
  { tick: 24, zone: 'D' },
  { tick: 26, zone: 'F' },
];

export function runFlood(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  for (const stage of STAGES) {
    if (stage.tick !== tick) continue;
    const depth = floodDepthAt(stage.zone, tick);
    const level = floodLevelAt(stage.zone, tick);
    const etaMin = Math.round((1 - level) * 90) + 10;
    const roads = world.roads.filter((r) => r.zone === stage.zone && roadFloodAt(stage.zone, tick) > 0.2).slice(0, 3);
    out.messages.push({
      to: 'evacuation',
      kind: {
        kind: 'flood',
        zone: stage.zone,
        depthM: depth,
        horizonMin: etaMin,
        roads: roads.map((r) => r.name),
      },
      confidence: Math.round(78 + level * 14),
      why: `Zone ${stage.zone} elevation ${elevationOf(stage.zone)} m + cumulative rainfall ${Math.round(
        rainfallHr(tick)
      )} mm + river overflow coupling.`,
    });
  }

  if (tick === 18) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'flood',
        zone: 'C',
        depthM: floodDepthAt('C', tick),
        horizonMin: 40,
        roads: ['Ring Road (E-bound)'],
      },
      confidence: 87,
      why: 'Ring Road submerges first due to low underpasses; model and gauge agree.',
    });
  }

  if (tick === 36) {
    out.messages.push({
      to: 'evacuation',
      kind: {
        kind: 'flood',
        zone: 'B',
        depthM: floodDepthAt('B', tick),
        horizonMin: 70,
        roads: ['Delta Bridge approach'],
      },
      confidence: 90,
      why: 'Backwater effect from collapsed bridge raises Zone B depth 0.4 m above forecast.',
    });
  }

  return out;
}

function elevationOf(zone: ZoneId): number {
  const map: Record<ZoneId, number> = { A: 2, B: 3, C: 8, D: 6, E: 15, F: 4 };
  return map[zone];
}

function rainfallHr(tick: number): number {
  return Math.min(118, 30 + tick * 3.4);
}