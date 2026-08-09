// Heat wave scenario — deterministic heat-index surge, cooling centers and
// grid stress across the urban core.

import type { HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runHeat } from '@/agents/heat';
import { runResources } from '@/agents/resources';
import { EVENTS } from '@/data/hazards/heatwave';
import type { TimelineEntry } from '@/types';
import { rngFor } from '@/utils/seededRandom';

const CORE: { x: number; y: number }[] = [
  { x: 5600, y: 5800 },
  { x: 6800, y: 5200 },
  { x: 4400, y: 6300 },
  { x: 6200, y: 6900 },
];

export const heatwaveScenario: HazardScenario = {
  definition: hazardDefOf('heatwave'),

  seedWorld(world) {
    world.hazardMetrics = {
      temperatureC: 40.4,
      heatIndex: 45,
      aqi: 90,
      powerDemand: 3200,
      heatCasualties: 0,
      hospitalLoad: 0,
      waterStations: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    
    metrics.temperatureC = tempCurve(tick);
    metrics.heatIndex = metrics.temperatureC + 5 + Math.sin(tick * 0.3) * 1.5;
    metrics.aqi = tick >= 8 ? Math.min(150, 90 + (tick - 8) * 2.4) : 90;
    metrics.powerDemand = tick >= 14 ? Math.min(4800, 3200 + (tick - 14) * 110) : 3200;
    metrics.heatCasualties = tick >= 16 ? Math.round((tick - 16) * 5 + 6) : 0;
    metrics.hospitalLoad = tick >= 16 ? Math.min(100, Math.round(52 + (tick - 16) * 1.7)) : 38;
    metrics.waterStations = tick >= 4 ? Math.min(24, Math.round((tick - 4) * 1.4)) : 0;

    if (tick === 8) spawnSos(world, tick, { zone: 'A', dx: 600, dy: 400 }, 'Elderly resident — heat exhaustion, needs transport', 1, 8);
    if (tick === 18) spawnSos(world, tick, { zone: 'C', dx: -500, dy: 300 }, 'Construction worker collapse — heat stroke', 1, 9);
    if (tick === 26) spawnSos(world, tick, { zone: 'D', dx: 300, dy: -400 }, 'Clinic without power — patients need cooling', 4, 6);

    if (!world.damage && tick >= 36) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: 0,
        roadsDestroyedKm: 0,
        powerLossPct: 8,
        affectedPopulation: 320_000,
        economicLossInr: 84e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 4) return 'red';
    if (tick >= 1) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 32) return 'recovery';
    if (tick >= 1) return 'active';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 20) out.push(beat(tick, 'HEAT', `Heat index ${metrics.heatIndex?.toFixed(1)} °C — vulnerable-block advisories`, 'critical'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runHeat(world, tick), runResources(world, tick));
  },

  paint(_world, tick) {
    const rng = rngFor(hazardDefOf('heatwave').seed, tick);
    
    const strength = Math.min(1, tick / 20);
    const heat = CORE.map((c) => ({
      cx: c.x + (rng.next() - 0.5) * 200,
      cy: c.y + (rng.next() - 0.5) * 200,
      strength: 0.25 + strength * 0.6,
      radius: 1500 + strength * 500,
    }));
    const pts: { x: number; y: number; r: number; color: string; pulse?: boolean }[] = [];
    const n = Math.min(12, 3 + tick);
    for (let i = 0; i < n; i++) {
      pts.push({
        x: 3600 + rng.next() * 7200,
        y: 3600 + rng.next() * 7200,
        r: 80 + rng.next() * 120,
        color: tick > 16 ? '#f87171' : '#fbbf24',
      });
    }
    return [{ layer: 'hazardHeat', heat }, { layer: 'hazardPoints', points: pts }];
  },
};

function tempCurve(tick: number): number {
  if (tick <= 2) return 40.4;
  const base = 40.4 + Math.min(5.8, tick * 0.28);
  return Math.round(base * 10) / 10;
}