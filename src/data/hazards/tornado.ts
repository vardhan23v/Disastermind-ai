// Deterministic mock data — tornado supercell.

import type { CityPoint } from '@/types';

export const CELL_START: CityPoint = { x: 1600, y: 2100 };
export const CELL_END: CityPoint = { x: 9800, y: 8700 };
/** Tornado sweep waypoints over time. */
export const SWATH: { p: CityPoint; tick: number; width: number }[] = [
  { p: { x: 2200, y: 2400 }, tick: 4, width: 260 },
  { p: { x: 4200, y: 3400 }, tick: 10, width: 420 },
  { p: { x: 6400, y: 4600 }, tick: 16, width: 560 },
  { p: { x: 8300, y: 5200 }, tick: 22, width: 460 },
  { p: { x: 9600, y: 4800 }, tick: 27, width: 300 },
];

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'NWS', text: 'Tornado watch for industrial belt — supercell developing', severity: 'warning' },
  { atTick: 4, tag: 'TORNADO', text: 'EF3 wedge tornado on the ground — Zone D', severity: 'critical' },
  { atTick: 10, tag: 'DAMAGE', text: 'Warehouse district hit — reports of structural failure', severity: 'critical' },
  { atTick: 16, tag: 'STORM', text: 'Tornado crosses Ring Road into urban core', severity: 'critical' },
  { atTick: 22, tag: 'SOS', text: 'SOS volley from Zone C apartments', severity: 'critical' },
  { atTick: 27, tag: 'WEAKEN', text: 'Cell weakening — path length 14 km', severity: 'warning' },
  { atTick: 31, tag: 'ALL CLEAR', text: 'Tornado dissipated — damage assessment begins', severity: 'info' },
];

export const ZONE_PROFILES = { D: { share: 0.4, name: 'Industrial Belt' }, C: { share: 0.4, name: 'Urban Core' }, B: { share: 0.2, name: 'Lowlands' } } as const;