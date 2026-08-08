// Facility registry: hospitals, shelters, vehicles — deterministic per seed.

import {
  AMBULANCE_COUNT,
  BOAT_COUNT,
  DRONE_COUNT,
  HOSPITAL_COUNT,
  RELIEF_TRUCK_COUNT,
  SHELTER_COUNT,
  VEHICLE_SPEEDS,
} from '@/constants';
import type { CityPoint, Hospital, Shelter, UnitStation, Vehicle, Zone, ZoneId } from '@/types';
import type { SeededRandom } from '@/utils/seededRandom';

const HOSPITAL_NAMES = [
  'Central District Hospital',
  'Lifeline Multispecialty',
  'Anna Memorial Hospital',
  'Metro Medical College',
  'St. Verghese Hospital',
  'City Government Hospital',
  'Green Valley Hospital',
  'Port Trust Clinic',
  'Srinivasa Institute',
  'Mother Care Hospital',
  'Vijaya Super Speciality',
  'North Shore Hospital',
  'Delta Research Center',
  'Station Health Campus',
  'Hillside Clinic',
];

const SHELTER_NAMES = [
  'Community Hall A',
  'St. Marys School',
  'Panchayat Bhavan',
  'Govt High School',
  'Auditorium Ground',
  'Ashraya Relief Camp',
  'Nagar Palika Complex',
  'Railway Welfare Centre',
  'Zilla Parishad Hall',
  'Public Health Annex',
];

const AMBULANCE_BASES: CityPoint[] = [
  { x: 3600, y: 3600 },
  { x: 5400, y: 4200 },
  { x: 7200, y: 4800 },
  { x: 8800, y: 5200 },
  { x: 6400, y: 7000 },
  { x: 5400, y: 8600 },
  { x: 7800, y: 9800 },
  { x: 4400, y: 8000 },
];

function randomPointInZone(rng: SeededRandom, zone: Zone): CityPoint {
  const xs = zone.polygon.map((p) => p.x);
  const ys = zone.polygon.map((p) => p.y);
  const minX = Math.min(...xs) + 260;
  const maxX = Math.max(...xs) - 260;
  const minY = Math.min(...ys) + 260;
  const maxY = Math.max(...ys) - 260;
  return {
    x: rng.nextFloat(minX, Math.max(minX + 10, maxX)),
    y: rng.nextFloat(minY, Math.max(minY + 10, maxY)),
  };
}

export function buildFacilities(rng: SeededRandom, zones: Zone[]): {
  hospitals: Hospital[];
  shelters: Shelter[];
  vehicles: Vehicle[];
  units: UnitStation[];
} {
  const hospitals: Hospital[] = [];
  const shelters: Shelter[] = [];
  const vehicles: Vehicle[] = [];
  const units: UnitStation[] = [];

  for (let i = 0; i < HOSPITAL_COUNT; i++) {
    const zone = rng.pick(zones);
    const pos = randomPointInZone(rng, zone);
    const totalBeds = rng.nextInt(150, 420);
    const occupiedBeds = Math.round(totalBeds * rng.nextFloat(0.3, 0.5));
    const icuTotal = Math.max(6, Math.round(totalBeds * 0.1));
    const icuOccupied = Math.round(icuTotal * rng.nextFloat(0.3, 0.66));
    hospitals.push({
      id: `h${i + 1}`,
      name: HOSPITAL_NAMES[i],
      pos,
      zone: zone.id,
      totalBeds,
      occupiedBeds,
      icuTotal,
      icuOccupied,
      oxygen: 'ok',
      capacityPct: Math.round((occupiedBeds / totalBeds) * 100),
    });
  }

  const shelterZones: ZoneId[] = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < SHELTER_COUNT; i++) {
    const zone = zones.find((z) => z.id === shelterZones[i % shelterZones.length]);
    if (!zone) continue;
    const pos = randomPointInZone(rng, zone);
    shelters.push({
      id: `sh${i + 1}`,
      name: SHELTER_NAMES[i],
      pos,
      zone: zone.id,
      capacity: rng.nextInt(180, 900),
      occupancy: rng.nextInt(12, 60),
      hasFood: rng.nextBool(0.72),
      hasWater: rng.nextBool(0.88),
      hasMedicalStaff: rng.nextBool(0.56),
      womenSafe: rng.nextBool(0.72),
      petFriendly: rng.nextBool(0.38),
      openedAtTick: 0,
    });
  }

  for (let i = 0; i < AMBULANCE_COUNT; i++) {
    const base = rng.pick(AMBULANCE_BASES);
    const pos: CityPoint = { x: base.x + rng.nextFloat(-380, 380), y: base.y + rng.nextFloat(-380, 380) };
    vehicles.push({
      id: `amb-${100 + i}`,
      kind: 'ambulance',
      name: `AMB-${100 + i}`,
      pos: { ...pos },
      home: { ...pos },
      speedKmh: VEHICLE_SPEEDS.ambulance,
      status: 'idle',
      path: [],
      pathProgress: 0,
      etaMin: 0,
    });
  }
  for (let i = 0; i < BOAT_COUNT; i++) {
    const pos: CityPoint = { x: 7800 + rng.nextFloat(0, 700), y: 9400 + rng.nextFloat(0, 700) };
    vehicles.push({
      id: `boat-${i}`,
      kind: 'boat',
      name: `RB-${i + 1}`,
      pos: { ...pos },
      home: { ...pos },
      speedKmh: VEHICLE_SPEEDS.boat,
      status: 'idle',
      path: [],
      pathProgress: 0,
      etaMin: 0,
    });
  }
  for (let i = 0; i < DRONE_COUNT; i++) {
    const pos: CityPoint = { x: 5200 + rng.nextFloat(-800, 800), y: 6200 + rng.nextFloat(-800, 800) };
    vehicles.push({
      id: `drone-${i}`,
      kind: 'drone',
      name: `UAV-${i + 1}`,
      pos: { ...pos },
      home: { ...pos },
      speedKmh: VEHICLE_SPEEDS.drone,
      status: 'idle',
      path: [],
      pathProgress: 0,
      etaMin: 0,
    });
  }
  for (let i = 0; i < RELIEF_TRUCK_COUNT; i++) {
    const pos: CityPoint = { x: 4800 + rng.nextFloat(-500, 500), y: 7800 + rng.nextFloat(-300, 300) };
    vehicles.push({
      id: `truck-${i}`,
      kind: 'relief',
      name: `RT-${i + 1}`,
      pos: { ...pos },
      home: { ...pos },
      speedKmh: VEHICLE_SPEEDS.relief,
      status: 'idle',
      path: [],
      pathProgress: 0,
      etaMin: 0,
    });
  }

  const firePost: { zone: ZoneId; pos: CityPoint; name: string }[] = [
    { zone: 'C', pos: { x: 5600, y: 5200 }, name: 'Central Fire Station' },
    { zone: 'D', pos: { x: 2500, y: 4200 }, name: 'East End Firehouse' },
    { zone: 'E', pos: { x: 3900, y: 2050 }, name: 'Riverside Fire Station' },
  ];
  for (let i = 0; i < firePost.length; i++) {
    units.push({
      id: `fire-${i + 1}`,
      kind: 'fire',
      name: firePost[i].name,
      pos: firePost[i].pos,
      zone: firePost[i].zone,
      status: 'ready',
      staffOnDuty: 18 + i * 4,
    });
  }

  const policePost: { zone: ZoneId; pos: CityPoint; name: string }[] = [
    { zone: 'C', pos: { x: 6360, y: 4660 }, name: 'City Police HQ' },
    { zone: 'B', pos: { x: 3700, y: 3000 }, name: 'Suburban Police Post' },
    { zone: 'A', pos: { x: 5400, y: 8600 }, name: 'Port Police Station' },
  ];
  for (let i = 0; i < policePost.length; i++) {
    units.push({
      id: `pol-${i + 1}`,
      kind: 'police',
      name: policePost[i].name,
      pos: policePost[i].pos,
      zone: policePost[i].zone,
      status: 'ready',
      staffOnDuty: 12 + i * 3,
    });
  }

  return { hospitals, shelters, vehicles, units };
}

export interface InitialWorldInput {
  hospitals: Hospital[];
  shelters: Shelter[];
  vehicles: Vehicle[];
}