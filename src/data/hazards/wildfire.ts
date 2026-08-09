// Deterministic mock data — wildfire.

import type { CityPoint } from '@/types';

export const IGNITION: CityPoint = { x: 10200, y: 2600 };

/** Fire perimeter anchors on the east flank (metres relative to grid). */
export const FIRE_ANCHORS: CityPoint[] = [
  { x: 9800, y: 2100 },
  { x: 10600, y: 2300 },
  { x: 10900, y: 3200 },
  { x: 10200, y: 3900 },
  { x: 9300, y: 3700 },
];

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'MODS', text: 'MOD hotspot detected 8 km east of Zone E settlements', severity: 'warning' },
  { atTick: 4, tag: 'FIRE', text: 'Fire perimeter 6 km² — wind 34 km/h pushing NW', severity: 'critical' },
  { atTick: 10, tag: 'EVACUATION', text: 'Zone E foothills: staged evacuation begins', severity: 'critical' },
  { atTick: 16, tag: 'PERIMETER', text: 'Perimeter crosses forest road — 210 homes threatened', severity: 'critical' },
  { atTick: 24, tag: 'AIR', text: 'Aerial retardant drops coordinated with ground units', severity: 'warning' },
  { atTick: 32, tag: 'CONTAIN', text: '35% contained — spot fires under watch', severity: 'info' },
  { atTick: 38, tag: 'CHIEF', text: 'Chief AI: repopulation plan + air quality advisory', severity: 'info' },
];

export const ZONE_PROFILES = { E: { share: 0.55, name: 'Hills Settlements' }, F: { share: 0.3, name: 'Forest Edge' }, C: { share: 0.15, name: 'Core Buffer' } } as const;