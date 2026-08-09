// Tornado scenario — deterministic supercell tracking an EF3 wedge across
// the industrial belt into the core.

import type { HazardPaint, HazardScenario } from '@/hazards/types';
import { hazardDefOf } from '@/hazards/definitions';
import { beat, mergeAgents, spawnSos, tallyDamage } from '@/hazards/common';
import { runTornado } from '@/agents/tornado';
import { runStructural } from '@/agents/structural';
import { CELL_END, CELL_START, EVENTS, SWATH } from '@/data/hazards/tornado';
import type { CityPoint, TimelineEntry } from '@/types';
import { rngFor } from '@/utils/seededRandom';

export const tornadoScenario: HazardScenario = {
  definition: hazardDefOf('tornado'),

  seedWorld(world) {
    world.hazardMetrics = {
      windKmh: 0,
      widthM: 0,
      pathKm: 0,
      buildingsDamaged: 0,
      populationAffected: 0,
      onGround: 0,
    };
    return world;
  },

  step(world, tick, metrics) {
    const seg = segmentAt(tick);
    metrics.windKmh = tick >= 4 && tick <= 27 ? 210 + Math.round(60 * Math.sin(tick * 0.21)) + 40 : 18;
    metrics.widthM = seg ? seg.width : 0;
    metrics.pathKm = seg ? Math.round((tick - 4) * 0.9 * 10) / 10 : 0;
    metrics.buildingsDamaged = tick >= 10 ? Math.min(420, Math.round((tick - 10) * 14)) : 0;
    metrics.populationAffected = tick >= 10 ? Math.round(14_000 + (tick - 10) * 950) : 0;
    metrics.onGround = seg ? 1 : 0;

    if (tick === 10) spawnSos(world, tick, { zone: 'D', dx: -400, dy: 300 }, 'Warehouse collapse — workers trapped under racking', 4, 10);
    if (tick === 16) spawnSos(world, tick, { zone: 'C', dx: 500, dy: 400 }, 'High-rise windows blown — family needs rescue', 3, 9);
    if (tick === 22) spawnSos(world, tick, { zone: 'D', dx: 700, dy: -200 }, 'Garage roof crushed — vehicle occupant', 2, 9);

    if (!world.damage && tick >= 29) {
      world.damage = tallyDamage(metrics, {
        buildingsDamaged: metrics.buildingsDamaged ?? 266,
        roadsDestroyedKm: 24,
        powerLossPct: 38,
        affectedPopulation: 38_600,
        economicLossInr: 620e6,
      });
    }
    return metrics;
  },

  alertAt(tick) {
    if (tick >= 4 && tick <= 27) return 'red';
    if (tick > 27) return 'yellow';
    if (tick >= 1) return 'yellow';
    return 'green';
  },

  phaseAt(tick) {
    if (tick > 27) return 'recovery';
    if (tick >= 4) return 'active';
    return 'standby';
  },

  events(_world, tick, metrics) {
    const out: TimelineEntry[] = EVENTS.filter((e) => e.atTick === tick).map((e) => ({ tick, tag: e.tag, text: e.text, severity: e.severity }));
    if (tick === 16) out.push(beat(tick, 'STORM', `EF3 wedge width ${Math.round(metrics.widthM ?? 0)} m — crossing Ring Road`, 'critical'));
    return out;
  },

  recommendations() {
    return [];
  },

  agents(world, tick) {
    return mergeAgents(runTornado(world, tick), runStructural(world, tick));
  },

  paint(_world, tick) {
    const rng = rngFor(hazardDefOf('tornado').seed, tick);
    
    const pathPts: CityPoint[] = [CELL_START];
    for (let i = 0; i < SWATH.length; i++) {
      const s = SWATH[i];
      if (tick >= s.tick) pathPts.push(s.p);
    }
    if (tick >= 27) pathPts.push(CELL_END);

    const seg = segmentAt(tick);
    const paints: HazardPaint[] = [];
    if (pathPts.length > 1) {
      paints.push({ layer: 'hazardPath', paths: [{ pts: pathPts, stroke: '#94a3b8', width: 4, dash: '10 6' }] });
      if (seg) {
        const w = seg.width;
        const band: CityPoint[] = [];
        for (const p of pathPts) band.push({ x: p.x + (rng.next() - 0.5) * w * 0.4, y: p.y - w / 2 });
        for (let i = pathPts.length - 1; i >= 0; i--) {
          const p = pathPts[i];
          band.push({ x: p.x + (rng.next() - 0.5) * w * 0.4, y: p.y + w / 2 });
        }
        paints.push({ layer: 'hazardZone', polygons: [{ pts: band, fill: 'rgba(148,163,184,0.35)', stroke: '#94a3b8' }] });
      }
    }
    const cell: CityPoint = seg?.p ?? CELL_START;
    const wind = tick >= 4 && tick <= 27 ? 210 + Math.round(60 * Math.sin(tick * 0.21)) + 40 : 18;
    paints.push({
      layer: 'hazard',
      markers: [{ x: cell.x, y: cell.y, label: `EF3 · ${wind} km/h`, color: '#94a3b4' }],
      rings: [{ cx: cell.x, cy: cell.y, r: 240, stroke: 'rgba(148,163,184,0.8)', fill: 'rgba(148,163,184,0.15)' }],
    });
    return paints;
  },
};

function segmentAt(tick: number): (typeof SWATH)[number] | null {
  let prev: (typeof SWATH)[number] | null = null;
  for (const s of SWATH) {
    if (tick === s.tick) return s;
    if (tick < s.tick) return prev;
    prev = s;
  }
  return null;
}