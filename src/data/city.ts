// Procedurally generated mock city: zones, road network, river, coast.
// Coordinates are metres in a 12 km × 12 km grid; origin at north-west.

import { CITY, ZONE_META, ZONE_IDS } from '@/constants';
import type { CityPoint, CityPolygon, RoadSegment, Zone, ZoneId } from '@/types';
import { dist, pointInPolygon } from '@/utils/geo';
import type { SeededRandom } from '@/utils/seededRandom';

const W = CITY.widthM;
const H = CITY.heightM;

/** Hand-authored zone rectangles (x0, y0, x1, y1) — shaped like a river delta city. */
const ZONE_RECTS: Record<ZoneId, [number, number, number, number]> = {
  A: [4400, 9200, 7600, 11600],
  B: [2400, 6200, 6000, 9200],
  C: [5000, 4000, 8200, 7600],
  D: [1400, 2900, 5000, 6200],
  E: [8200, 3200, 11200, 6800],
  F: [6200, 8000, 9800, 10600],
};

export function buildZones(rng: SeededRandom): Zone[] {
  return ZONE_IDS.map((id) => {
    const [x0, y0, x1, y1] = ZONE_RECTS[id];
    const j = 160;
    const polygon: CityPolygon = [
      { x: x0 + rng.nextFloat(-j, j), y: y0 + rng.nextFloat(-j, j) },
      { x: x1 + rng.nextFloat(-j, j), y: y0 + rng.nextFloat(-j, j) },
      { x: x1 + rng.nextFloat(-j, j), y: y1 + rng.nextFloat(-j, j) },
      { x: x0 + rng.nextFloat(-j, j), y: y1 + rng.nextFloat(-j, j) },
    ];
    return {
      id,
      name: ZONE_META[id].name,
      polygon,
      center: {
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
      },
      elevationM: ZONE_META[id].elevationM,
      population: ZONE_META[id].population,
      coastal: ZONE_META[id].coastal,
    };
  });
}

export function zoneAt(zones: Zone[], p: CityPoint): ZoneId {
  for (const zone of zones) {
    if (pointInPolygon(p, zone.polygon)) return zone.id;
  }
  return 'C';
}

/** River Ootha — runs west to east then turns south to the port bay. */
export const RIVER_PATH: CityPoint[] = [
  { x: 0, y: 6300 },
  { x: 2400, y: 6200 },
  { x: 4400, y: 6100 },
  { x: 6000, y: 5850 },
  { x: 7400, y: 5250 },
  { x: 8600, y: 5200 },
  { x: 9200, y: 6400 },
  { x: 9600, y: 7600 },
  { x: 10000, y: 9000 },
  { x: 10400, y: 10000 },
];

export const COAST_PATH: CityPoint[] = [
  { x: 0, y: 10500 },
  { x: 2000, y: 10800 },
  { x: 4000, y: 11050 },
  { x: 6000, y: 11200 },
  { x: 7800, y: 11300 },
  { x: 9600, y: 11450 },
  { x: 12000, y: 11600 },
];

const mid = (a: CityPoint, b: CityPoint): CityPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function buildRoads(zones: Zone[], rng: SeededRandom): RoadSegment[] {
  const segments: RoadSegment[] = [];
  let counter = 0;

  const add = (name: string, kind: RoadSegment['kind'], a: CityPoint, b: CityPoint) => {
    const from = snap(a);
    const to = snap(b);
    segments.push({
      id: `r${counter++}`,
      name,
      kind,
      from,
      to,
      lengthM: dist(from, to),
      zone: zoneAt(zones, mid(from, to)),
      traffic: rng.nextInt(0, 2),
      flooded: false,
      floodLevel: 0,
      damaged: false,
      closed: false,
    });
  };

  // north-south avenues
  for (const x of [3200, 4900, 7000, 8600]) {
    add('Avenue', 'arterial', { x, y: 2800 }, { x, y: 9600 });
  }
  // east-west streets
  for (const y of [3400, 5000, 6600, 8200, 9400]) {
    add('Street', 'arterial', { x: 1800, y }, { x: 10600, y });
  }
  // ring road around the urban core
  add('Ring Road', 'highway', { x: 4700, y: 4600 }, { x: 7600, y: 4600 });
  add('Ring Road', 'highway', { x: 7600, y: 4600 }, { x: 7600, y: 7400 });
  add('Ring Road', 'highway', { x: 7600, y: 7400 }, { x: 4700, y: 7400 });
  add('Ring Road', 'highway', { x: 4700, y: 7400 }, { x: 4700, y: 4600 });
  // national highways
  add('NH-7', 'highway', { x: 2200, y: 9800 }, { x: 9900, y: 3400 });
  add('NH-49 Coast', 'highway', { x: 2200, y: 10200 }, { x: 10600, y: 11400 });
  add('Airport Spur', 'highway', { x: 7000, y: 8200 }, { x: 8800, y: 9600 });
  add('Port Bypass', 'highway', { x: 6600, y: 9400 }, { x: 8600, y: 10200 });
  // bridges across the river (collapse candidate = Delta Bridge)
  add('Delta Bridge', 'bridge', { x: 4700, y: 5600 }, { x: 4700, y: 6600 });
  add('Gandhi Bridge', 'bridge', { x: 6400, y: 5200 }, { x: 6400, y: 6200 });
  add('East Bridge', 'bridge', { x: 8400, y: 4700 }, { x: 8400, y: 5700 });
  return segments;
}

function snap(p: CityPoint): CityPoint {
  return { x: Math.round(p.x / 5) * 5, y: Math.round(p.y / 5) * 5 };
}

/** Island of land used for map framing. */
export function cityBounds(): { min: CityPoint; max: CityPoint } {
  return { min: { x: 0, y: 0 }, max: { x: W, y: H } };
}