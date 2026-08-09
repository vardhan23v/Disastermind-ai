// Volcano scenario — deterministic VEI 3 with ash rings, drifting plume and
// lava lobe.

import type { HazardPaint, HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runSatellite } from '@/agents/satellite';
import { runSeismic } from '@/agents/seismic';
import { ASH_RINGS, EVENTS, VEI, VENT } from '@/data/hazards/volcano';
import type { CityPoint, TimelineEntry } from '@/types';
import { rngFor } from '@/utils/seededRandom';

export const volcanoScenario: HazardScenario = {
  definition: hazardDefOf('volcano'),

  seedWorld(world) {
    world.hazardMetrics = {
      vei: VEI,
      ashColumnKm: 3.1,
      ashDensity: 0,
      evacZonePct: 0,
      airQuality: 75,
      lavaKm: 0,
      buildingsThreatened: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    const rng = rngFor(hazardDefOf('volcano').seed, tick);
    
    if (tick >= 3) {
      metrics.ashDensity = Math.min(2.4, (tick - 3) * 0.3 + (rng.next() - 0.5) * 0.1);
      metrics.ashColumnKm = 3.1 + Math.min(1.4, (tick - 3) * 0.07);
      metrics.airQuality = tick >= 18 ? Math.min(320, 75 + (tick - 18) * 12) : 75;
      metrics.evacZonePct = tick >= 10 ? Math.min(100, Math.round((tick - 10) * 7.5)) : 0;
      metrics.lavaKm = tick >= 16 ? Math.min(3.4, (tick - 16) * 0.19) : 0;
      metrics.buildingsThreatened = tick >= 16 ? Math.round(54 + 16 * Math.min(1, (tick - 16) / 10)) : 0;
    }
    if (tick === 8) spawnSos(world, tick, { zone: 'E', dx: 500, dy: 300 }, 'Ashfall — elderly couple needs oxygen support', 2, 7);
    if (tick === 12) spawnSos(world, tick, { zone: 'E', dx: 100, dy: -400 }, 'Isolated residents cannot self-evacuate', 3, 9);
    if (tick === 20) spawnSos(world, tick, { zone: 'F', dx: -700, dy: 400 }, 'Port worker — ash inhalation difficulty', 1, 6);
    if (tick === 28) spawnSos(world, tick, { zone: 'E', dx: -300, dy: 200 }, 'Lava fringe crossing — stranded livestock family', 4, 7);

    if (!world.damage && tick >= 36) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: 214,
        roadsDestroyedKm: 9,
        powerLossPct: 31,
        affectedPopulation: 38_400,
        economicLossInr: 410e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 10) return 'orange';
    if (tick >= 3) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick >= 28) return 'recovery';
    if (tick >= 3) return 'active';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 16) out.push(beat(tick, 'LAVA', `Lava flow ${(metrics.lavaKm ?? 0).toFixed(1)} km down the west flank`, 'critical'));
    if (tick === 26) out.push(beat(tick, 'ASHFALL', `Air quality ${Math.round(metrics.airQuality ?? 75)} — masks distributed`, 'warning'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runSeismic(world, tick), runSatellite(world, tick));
  },

  paint(_world, tick) {
    
    const rng = rngFor(hazardDefOf('volcano').seed, tick);
    const rings = ASH_RINGS.map((ring) => ({
      cx: VENT.x,
      cy: VENT.y,
      r: ring.r,
      stroke: `rgba(249, 115, 22, ${tick >= 3 ? 0.7 : 0.25})`,
      fill: tick >= 6 ? 'rgba(249, 115, 22, 0.06)' : undefined,
      dotted: tick < 7,
    }));
    const plume: CityPoint[] = [];
    for (let i = 0; i < 10; i++) {
      plume.push({
        x: VENT.x - i * 260 + (rng.next() - 0.5) * 120 * (i / 3),
        y: VENT.y - i * 240,
      });
    }
    const lava: CityPoint[] = [];
    const lavaLen = Math.max(0, (tick - 16) * 95);
    for (let i = 0; i < 14; i++) {
      lava.push({
        x: VENT.x - 60 + i * 60,
        y: VENT.y + 260 + Math.min(lavaLen, i * 110) + Math.sin(i * 0.9) * 40,
      });
    }
    const paint: HazardPaint[] = [
      {
        layer: 'hazard',
        rings,
        markers: [{ x: VENT.x, y: VENT.y, label: `Vent · VEI ${VEI}`, color: '#f97316' }],
      },
    ];
    if (tick >= 3) {
      paint.push({
        layer: 'hazardPath',
        paths: [{ pts: plume, stroke: '#cbd5e1', width: 3 + Math.min(40, tick), dash: '6 6' }],
      });
    }
    if (tick >= 16) {
      paint.push({
        layer: 'hazardZone',
        polygons: [{ pts: lava, fill: 'rgba(249,115,22,0.45)', stroke: '#f97316' }],
      });
    }
    return paint;
  },
};