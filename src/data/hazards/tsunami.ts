// Deterministic mock data — tsunami (offshore M8.1 earthquake).

import type { CityPoint } from '@/types';

export const SEAFLOOR_QUAKE: CityPoint = { x: 3600, y: -1400 };
export const MAGNITUDE = 8.1;
export const WAVE_HEIGHT_M = 4.8;

/** Wavefront arrival radii from the coast, metres (approx). */
export const WAVE_RINGS = [
  { r: 1400, label: 'Wavefront at shelf break' },
  { r: 2600, label: 'Wavefront approaching shore' },
  { r: 3600, label: 'Inundation line' },
];

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'PTWC', text: 'M8.1 undersea earthquake — 190 km offshore', severity: 'warning' },
  { atTick: 2, tag: 'TSUNAMI', text: 'Tsunami warning — ETA to Zone A coast 22 minutes', severity: 'critical' },
  { atTick: 6, tag: 'COAST', text: 'First wave reaches Zone A harbour — drawdown observed', severity: 'critical' },
  { atTick: 9, tag: 'INUNDATE', text: 'Inundation 900 m inland at low-lying blocks', severity: 'critical' },
  { atTick: 14, tag: 'EVACUATION', text: 'High-ground evacuation 68% complete', severity: 'warning' },
  { atTick: 20, tag: 'AFTERSHOCK', text: 'M6.3 aftershock — no new wave expected', severity: 'warning' },
  { atTick: 26, tag: 'RECEDE', text: 'Waves receding — harbour teams back to assess', severity: 'info' },
];

export const ZONE_PROFILES = { A: { share: 0.65, name: 'Coastal Zone A' }, F: { share: 0.35, name: 'Port Zone' } } as const;