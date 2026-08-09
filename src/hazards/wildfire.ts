// Wildfire scenario — deterministic wind-driven perimeter expansion with
// hotspots, smoke plume and staged evacuation.

import type { HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runFire } from '@/agents/fire';
import { runSatellite } from '@/agents/satellite';
import { EVENTS, FIRE_ANCHORS, IGNITION } from '@/data/hazards/wildfire';
import type { CityPoint, TimelineEntry } from '@/types';
import { rngFor } from '@/utils/seededRandom';

export const wildfireScenario: HazardScenario = {
  definition: hazardDefOf('wildfire'),

  seedWorld(world) {
    world.hazardMetrics = {
      fireAreaKm2: 0,
      spreadRate: 0,
      windKmh: 18,
      smokeAqi: 40,
      buildingsThreatened: 0,
      fireUnits: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    
    metrics.windKmh = tick >= 2 && tick <= 24 ? 34 : 18;
    const area = perimeterArea(tick);
    metrics.fireAreaKm2 = Math.round(area * 10) / 10;
    metrics.spreadRate = tick >= 2 && tick <= 24 ? 1.8 : 0.3;
    metrics.smokeAqi = tick >= 6 ? Math.min(360, Math.round(40 + (tick - 6) * 11)) : 40;
    metrics.buildingsThreatened = tick >= 10 ? Math.round(54 + (tick - 10) * 13) : 0;
    metrics.fireUnits = tick >= 8 ? Math.min(14, 2 + Math.round((tick - 8) / 2)) : 0;

    if (tick === 10) spawnSos(world, tick, { zone: 'E', dx: 800, dy: 300 }, 'Smoke-filled home — family cannot breathe', 4, 9);
    if (tick === 16) spawnSos(world, tick, { zone: 'E', dx: 400, dy: -600 }, 'Fire crosses road — residents shelter in place', 6, 10);
    if (tick === 26) spawnSos(world, tick, { zone: 'F', dx: -500, dy: 200 }, 'Burned homestead — evacuee needs transport', 3, 7);

    if (!world.damage && tick >= 36) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: 88,
        roadsDestroyedKm: 6,
        powerLossPct: 12,
        affectedPopulation: 22_400,
        economicLossInr: 210e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 10) return 'orange';
    if (tick >= 2) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 30) return 'recovery';
    if (tick >= 2) return 'active';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 20) out.push(beat(tick, 'PERIMETER', `Fire area ${metrics.fireAreaKm2?.toFixed(1)} km² — 210 homes in path`, 'critical'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runFire(world, tick), runSatellite(world, tick));
  },

  paint(_world, tick) {
    const rng = rngFor(hazardDefOf('wildfire').seed, tick);
    
    const grow = Math.min(1, tick / 26);
    const ring: CityPoint[] = [];
    for (const a of FIRE_ANCHORS) {
      const dx = a.x - IGNITION.x;
      const dy = a.y - IGNITION.y;
      ring.push({ x: IGNITION.x + dx * grow + (rng.next() - 0.5) * 60, y: IGNITION.y + dy * grow });
    }
    const smoke: CityPoint[] = [];
    for (let i = 0; i < 8; i++) {
      smoke.push({ x: IGNITION.x - 600 - i * 340, y: IGNITION.y - 900 + i * 90 + (rng.next() - 0.5) * 60 });
    }
    const hotspots: { x: number; y: number; r: number; color: string; pulse?: boolean }[] = [];
    const n = Math.min(10, 2 + Math.floor(tick / 4));
    for (let i = 0; i < n; i++) {
      hotspots.push({
        x: IGNITION.x + (rng.next() - 0.5) * 1400,
        y: IGNITION.y + (rng.next() - 0.5) * 1200,
        r: 70 + rng.next() * 90,
        color: '#fb923c',
        pulse: true,
      });
    }
    return [
      {
        layer: 'hazardZone',
        polygons: [{ pts: ring, fill: 'rgba(239,68,68,0.25)', stroke: '#ef4444', dash: '8 5' }],
      },
      { layer: 'hazardPath', paths: [{ pts: smoke, stroke: 'rgba(148,163,184,0.5)', width: 90, dash: '20 20' }] },
      { layer: 'hazardPoints', points: hotspots },
    ];
  },
};

function perimeterArea(tick: number): number {
  if (tick < 2) return 0;
  const peak = Math.min(1, tick / 26);
  return 6 * peak * peak + 1.2 * tick;
}