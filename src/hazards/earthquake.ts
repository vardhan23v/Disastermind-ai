// Earthquake scenario — deterministic M6.8 with intensity rings, damage
// ramp, structural collapse SOS spawns and full twin paint.

import type { HazardPaint, HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runSatellite } from '@/agents/satellite';
import { runSeismic } from '@/agents/seismic';
import { runStructural } from '@/agents/structural';
import { EPICENTER, EVENTS, INTENSITY_RINGS } from '@/data/hazards/earthquake';
import type { TimelineEntry } from '@/types';
import { rngFor } from '@/utils/seededRandom';

export const earthquakeScenario: HazardScenario = {
  definition: hazardDefOf('earthquake'),

  seedWorld(world) {
    world.hazardMetrics = {
      magnitude: 6.8,
      depthKm: 12,
      buildingsDamaged: 0,
      hospitalsUnderLoad: 0,
      aftershocks: 0,
      criticalSos: 0,
      intensityPeak: 8.4,
    };
    return world;
  },

  step(world, tick, metrics) {
    const rng = rngFor(hazardDefOf('earthquake').seed, tick);
    
    const damage = damageCurve(tick);
    metrics.magnitude = 6.8;
    metrics.depthKm = 12;
    metrics.buildingsDamaged = damage;
    metrics.hospitalsUnderLoad = tick >= 30 ? Math.min(100, Math.round(40 + tick * 1.6)) : 0;
    metrics.aftershocks = tick >= 16 && tick % 6 === 0 ? 3 + Math.floor(rng.next() * 3) : metrics.aftershocks ?? 0;
    metrics.criticalSos = world.sos.filter((s) => s.status !== 'resolved' && s.urgency >= 9).length;

    if (tick === 6) spawnSos(world, tick, { zone: 'C', dx: 300, dy: 300 }, 'Wintering stairwell collapse — 5 trapped', 5, 9);
    if (tick === 12) spawnSos(world, tick, { zone: 'C', dx: 900, dy: -500 }, 'Mall atrium collapse — office workers', 4, 8);
    if (tick === 18) spawnSos(world, tick, { zone: 'D', dx: -600, dy: -200 }, 'Warehouse debris — family of 3', 3, 10);
    if (tick === 24) spawnSos(world, tick, { zone: 'D', dx: -1000, dy: 400 }, 'Medical — crushed leg, needs transport', 1, 8);
    if (tick === 30) spawnSos(world, tick, { zone: 'E', dx: 500, dy: 700 }, 'Ridge trail party trapped by slides', 6, 7);

    if (!world.damage && tick >= 34) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: damage,
        roadsDestroyedKm: 42,
        powerLossPct: 46,
        affectedPopulation: 84_320,
        economicLossInr: 1.18e9,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 1) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 30) return 'recovery';
    if (tick >= 1) return 'active';
    return 'standby';
  },

  events(_world, tick) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 20) {
      out.push({ tick, tag: 'SEISMIC', text: 'Aftershock M4.2 — felt across Zone C', severity: 'warning' });
    }
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runSeismic(world, tick), runStructural(world, tick), runSatellite(world, tick));
  },

  paint(_world, tick) {
    const scaled = INTENSITY_RINGS.map((ring) => ({
      cx: EPICENTER.x,
      cy: EPICENTER.y,
      r: ring.r,
      stroke: `rgba(245, 158, 11, ${Math.max(0.15, 1 - tick / 50)})`,
      fill: 'rgba(245, 158, 11, 0.05)',
      dotted: tick < 6,
    }));
    const shards = shardPoints(tick);
    return [
      { layer: 'hazard', rings: scaled as HazardPaint['rings'], markers: [{ x: EPICENTER.x, y: EPICENTER.y, label: 'Epicenter M6.8', color: '#f59e0b' }] },
      { layer: 'hazardPoints', points: shards },
    ];
  },
};

function damageCurve(tick: number): number {
  if (tick <= 4) return 0;
  if (tick <= 16) return Math.round(90 + tick * 42);
  return Math.round(340 + 320 * Math.min(1, (tick - 16) / 20));
}

function shardPoints(tick: number): HazardPoint[] {
  if (tick < 4) return [];
  const rng = rngFor(hazardDefOf('earthquake').seed, tick);
  const n = Math.min(14, 4 + tick);
  
  const zoneCenters: { x: number; y: number }[] = [
    { x: 5400, y: 5600 },
    { x: 6600, y: 4800 },
    { x: 4200, y: 6200 },
  ];
  const pts: { x: number; y: number; r: number; color: string; pulse?: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const c = zoneCenters[i % zoneCenters.length];
    pts.push({
      x: c.x + (rng.next() - 0.5) * 1600,
      y: c.y + (rng.next() - 0.5) * 1400,
      r: 90 + rng.next() * 120,
      color: '#f87171',
      pulse: true,
    });
  }
  return pts;
}

type HazardPoint = NonNullable<HazardPaint['points']>[number];