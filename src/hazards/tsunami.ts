// Tsunami scenario — deterministic wave propagation, coastal inundation and
// high-ground evacuation.

import type { HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runMarine } from '@/agents/marine';
import { runSatellite } from '@/agents/satellite';
import { EVENTS, WAVE_RINGS } from '@/data/hazards/tsunami';
import { COAST_PATH } from '@/data/city';
import type { CityPoint, TimelineEntry } from '@/types';

export const tsunamiScenario: HazardScenario = {
  definition: hazardDefOf('tsunami'),

  seedWorld(world) {
    world.hazardMetrics = {
      waveHeightM: 4.8,
      etaMin: 22,
      populationAtRisk: 96_400,
      inundationKm2: 0,
      evacProgressPct: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    metrics.waveHeightM = waveHeight(tick);
    metrics.etaMin = Math.max(0, 22 - tick * 2);
    metrics.inundationKm2 = tick >= 9 ? Math.min(34, (tick - 9) * 2.1) : 0;
    metrics.evacProgressPct = tick >= 3 ? Math.min(100, Math.round((tick - 3) * 6.4)) : 0;

    if (tick === 4) spawnSos(world, tick, { zone: 'A', dx: -500, dy: 300 }, 'Quayside barge crew — cannot leave vessel', 3, 8);
    if (tick === 9) spawnSos(world, tick, { zone: 'A', dx: -900, dy: 500 }, 'Flooded ground floor — family on roof', 5, 10);
    if (tick === 12) spawnSos(world, tick, { zone: 'F', dx: 400, dy: -300 }, 'Port worker pinned under mooring gear', 1, 9);

    if (!world.damage && tick >= 28) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: 260,
        roadsDestroyedKm: 31,
        powerLossPct: 39,
        affectedPopulation: 96_400,
        economicLossInr: 960e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 6) return 'purple';
    if (tick >= 1) return 'red';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 22) return 'recovery';
    if (tick >= 1) return 'active';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 9) out.push(beat(tick, 'INUNDATE', `Inundation ${metrics.inundationKm2?.toFixed(1)} km² at 09:00 peak`, 'critical'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runMarine(world, tick), runSatellite(world, tick));
  },

paint(_world, tick) {
    const rings = WAVE_RINGS.map((ring, i) => ({
      cx: 6000,
      cy: 11200,
      r: ring.r,
      stroke: `rgba(56, 189, 248, ${tick > (i + 1) * 4 ? 0.55 : 0.15})`,
      fill: tick > (i + 1) * 4 ? 'rgba(56, 189, 248, 0.10)' : undefined,
      dotted: tick <= (i + 1) * 3,
    }));
    const water: CityPoint[] = [];
    const n = COAST_PATH.length;
    const depthIn = Math.max(0, tick - 9) * 60;
    for (let i = 0; i < n * 2; i++) {
      if (i < n) {
        const p = COAST_PATH[i];
        water.push({ x: p.x, y: p.y + 140 });
      } else {
        const p = COAST_PATH[n * 2 - 1 - i];
        water.push({ x: p.x, y: p.y + 140 + depthIn * 0.3 });
      }
    }
    return [
      { layer: 'hazard', rings, markers: [{ x: CENTER.x, y: CENTER.y, label: 'Coast · 4.8 m wave', color: '#38bdf8' }] },
      { layer: 'hazardZone', polygons: [{ pts: water, fill: 'rgba(56,189,248,0.35)', stroke: '#38bdf8' }] },
    ];
  },
};

const CENTER = { x: 6000, y: 11200 };

function waveHeight(tick: number): number {
  if (tick <= 3) return 4.8;
  return Math.max(1.6, 4.8 - tick * 0.06);
}