// Drought scenario — a slow-burn 40-week water crisis across the hinterland.

import type { HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runDrought } from '@/agents/drought';
import { runResources } from '@/agents/resources';
import { EVENTS } from '@/data/hazards/drought';
import type { TimelineEntry } from '@/types';
import { rngFor } from '@/utils/seededRandom';

export const droughtScenario: HazardScenario = {
  definition: hazardDefOf('drought'),

  seedWorld(world) {
    world.hazardMetrics = {
      rainfallDeficit: 0,
      reservoirLevel: 100,
      groundwaterM: 6,
      waterDemand: 260,
      agriStress: 0,
      populationAtRisk: 0,
      rationingOn: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    
    metrics.rainfallDeficit = Math.min(80, Math.round(tick * 1.9));
    metrics.reservoirLevel = Math.max(21, Math.round(100 - tick * 1.85));
    metrics.groundwaterM = Math.min(16, 6 + tick * 0.22);
    metrics.waterDemand = 260 + Math.round(tick * 3.1);
    metrics.agriStress = Math.min(96, Math.round(tick * 2.4));
    metrics.populationAtRisk = Math.round(tick * 7400);
    metrics.rationingOn = tick >= 14 ? 1 : 0;

    if (tick === 8) spawnSos(world, tick, { zone: 'B', dx: 800, dy: 300 }, 'Village standpipe dry — clinic water critical', 12, 5);
    if (tick === 18) spawnSos(world, tick, { zone: 'A', dx: -600, dy: 400 }, 'School wells failed — drinking water needed', 40, 6);
    if (tick === 28) spawnSos(world, tick, { zone: 'D', dx: 300, dy: -500 }, 'Farm homestead — cattle hydration emergency', 8, 4);

    if (!world.damage && tick >= 34) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: 0,
        roadsDestroyedKm: 0,
        powerLossPct: 5,
        affectedPopulation: metrics.populationAtRisk ?? 240_000,
        economicLossInr: 540e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 24) return 'orange';
    if (tick >= 10) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 30) return 'recovery';
    if (tick >= 10) return 'active';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 12) out.push(beat(tick, 'RESERVOIR', `Reservoir ${metrics.reservoirLevel}% — rationing plan enacted`, 'warning'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runDrought(world, tick), runResources(world, tick));
  },

  paint(_world, tick) {
    const rng = rngFor(hazardDefOf('drought').seed, tick);
    
    const stress = Math.min(1, tick / 34);
    const heat = [
      { cx: 4200, cy: 6000, strength: 0.2 + stress * 0.55, radius: 2600 },
      { cx: 7400, cy: 4400, strength: 0.15 + stress * 0.5, radius: 2000 },
    ];
    const pts: { x: number; y: number; r: number; color: string; pulse?: boolean }[] = [];
    const n = Math.min(16, 4 + Math.floor(tick / 3));
    for (let i = 0; i < n; i++) {
      pts.push({
        x: 2600 + rng.next() * 7800,
        y: 2600 + rng.next() * 7800,
        r: 60 + rng.next() * 100,
        color: stress > 0.5 ? '#ef4444' : '#f59e0b',
      });
    }
    return [
      { layer: 'hazardHeat', heat },
      { layer: 'hazardPoints', points: pts },
    ];
  },
};