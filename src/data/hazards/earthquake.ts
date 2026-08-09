// Deterministic mock data — earthquakes.
// All values deliberately synthetic; geometry in the city 12 km × 12 km grid.

import type { CityPoint } from '@/types';

export const EPICENTER: CityPoint = { x: 5600, y: 5600 };
export const MAGNITUDE = 6.8;
export const DEPTH_KM = 12;

/** Seismic intensity (MMI) rings around the epicenter, metres. */
export const INTENSITY_RINGS = [
  { r: 900, mmi: 8.4, label: 'VIII · Severe' },
  { r: 1900, mmi: 7.2, label: 'VII · Very Strong' },
  { r: 3000, mmi: 6.1, label: 'VI · Strong' },
  { r: 4400, mmi: 4.8, label: 'V · Moderate' },
];

/** Event script: tick → beat. */
export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'USGS', text: 'Earthquake detected — M6.8, depth 12 km', severity: 'warning' },
  { atTick: 3, tag: 'SEISMIC', text: 'Magnitude estimate confirmed 6.8 Mw', severity: 'warning' },
  { atTick: 6, tag: 'SHAKING', text: 'Strong shaking reaches Zone C — urban core', severity: 'critical' },
  { atTick: 9, tag: 'DAMAGE', text: 'Buildings damaged in Zone C & D', severity: 'critical' },
  { atTick: 12, tag: 'ROADS', text: 'Road blockages detected — rescue re-routed', severity: 'warning' },
  { atTick: 18, tag: 'CASUALTIES', text: 'Hospitals begin receiving casualties', severity: 'critical' },
  { atTick: 24, tag: 'SOS', text: 'SOS requests increase across affected blocks', severity: 'critical' },
  { atTick: 28, tag: 'CHIEF', text: 'Chief AI: SAR deployment + hospital surge + road closures', severity: 'warning' },
];

export const ZONE_PROFILES = {
  C: { share: 0.62, name: 'Urban Core' },
  D: { share: 0.28, name: 'Industrial Belt' },
  E: { share: 0.1, name: 'Residential Hills' },
} as const;