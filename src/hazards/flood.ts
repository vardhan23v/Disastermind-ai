// Flood scenario — standalone catchment flash flood on the Ootha river,
// reusing the same deterministic forecast curves as the cyclone demo.

import type { HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runFlood } from '@/agents/flood';
import { runWeather } from '@/agents/weather';
import { runEvacuation } from '@/agents/evacuation';
import { EVENTS } from '@/data/hazards/flood';
import { floodFx, rainfallAt, riverAt, windAt } from '@/simulation/forecast';
import { RIVER_PATH } from '@/data/city';
import type { CityPoint, TimelineEntry, ZoneId } from '@/types';
import { rngFor } from '@/utils/seededRandom';

export const floodScenario: HazardScenario = {
  definition: hazardDefOf('flood'),

  seedWorld(world) {
    world.hazardMetrics = {
      rainfallMmHr: 2,
      riverPct: 46,
      floodDepthM: 0,
      floodedRoadsKm: 0,
      peopleInShelters: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    metrics.rainfallMmHr = rainfallAt(tick);
    metrics.riverPct = riverAt(tick);
    const depths = ['A', 'B', 'C'].map((z) => floodFx(z as ZoneId, tick).depthM);
    metrics.floodDepthM = Math.max(0, ...depths);
    world.flood = (['A', 'B', 'C'] as ZoneId[]).map((z) => {
      const d = floodFx(z, tick).depthM;
      return { zone: z, depthM: d, level: d > 1 ? 0.8 : d > 0.4 ? 0.5 : d, fill: d > 1.2 ? 'rgba(30,64,175,0.8)' : d > 0.6 ? 'rgba(37,99,235,0.62)' : d > 0 ? 'rgba(59,130,246,0.44)' : 'rgba(147,197,253,0.08)' };
    });
    for (const r of world.roads) {
      r.flooded = r.zone === 'A' || r.zone === 'B' ? floodFx(r.zone, tick).depthM > 0.15 : r.flooded;
      r.damaged = r.kind === 'bridge' && floodFx(r.zone, tick).depthM >= 0.7 && tick >= 30;
    }
    const floodedKm = world.roads.filter((r) => r.flooded).reduce((a, r) => a + r.lengthM / 1000, 0);
    metrics.floodedRoadsKm = Math.round(floodedKm * 10) / 10;
    metrics.peopleInShelters = world.shelters.reduce((a, s) => a + (s.openedAtTick > 0 ? s.occupancy : 0), 0);
    metrics.windKmh = windAt(tick);

    if (tick === 12) spawnSos(world, tick, { zone: 'A', dx: 900, dy: 700 }, 'Rooftop family — water rising fast', 6, 10);
    if (tick === 18) spawnSos(world, tick, { zone: 'B', dx: -800, dy: 600 }, 'Trapped in pickup — currents too strong', 2, 9);
    if (tick === 24) spawnSos(world, tick, { zone: 'C', dx: -300, dy: -300 }, 'Home flooded — elderly couple needs meds', 2, 8);

    if (!world.damage && tick >= 34) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: 128,
        roadsDestroyedKm: 11,
        powerLossPct: 21,
        affectedPopulation: 61_200,
        economicLossInr: 340e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 16) return 'red';
    if (tick >= 8) return 'orange';
    if (tick >= 1) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 30) return 'recovery';
    if (tick >= 8) return 'flood';
    if (tick >= 1) return 'heavy-rain';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 15) out.push(beat(tick, 'ROADS', `${metrics.floodedRoadsKm?.toFixed(1)} km of approach roads under water`, 'critical'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runFlood(world, tick), runWeather(world, tick), runEvacuation(world, tick));
  },

  paint(_world, tick) {
    const rng = rngFor(hazardDefOf('flood').seed, tick);
    
    const water: CityPoint[] = [];
    for (const p of RIVER_PATH) {
      water.push({ x: p.x + (rng.next() - 0.5) * 40, y: p.y });
    }
    return [
      { layer: 'flood', polygons: [{ pts: water, fill: 'rgba(59,130,246,0.4)', stroke: '#3b82f6' }] },
      { layer: 'hazardZone', polygons: [{ pts: riverBand(tick), fill: 'rgba(37,99,235,0.35)', stroke: '#3b82f6' }] },
    ];
  },
};

function riverBand(tick: number): CityPoint[] {
  const w = 60 + Math.max(0, tick - 6) * 9;
  const pts: CityPoint[] = [];
  for (const p of RIVER_PATH) pts.push({ x: p.x, y: p.y });
  const curve: CityPoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    curve.push({ x: p.x - w, y: p.y - 90 });
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    curve.push({ x: p.x + w, y: p.y + 90 });
  }
  return curve;
}