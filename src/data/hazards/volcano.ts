// Deterministic mock data — volcanic eruption.

import type { CityPoint } from '@/types';

export const VENT: CityPoint = { x: 8500, y: 3500 };
export const VEI = 3;

/** Distance rings around the ridge vent, in metres. */
export const ASH_RINGS = [
  { r: 950, density: 2.2, label: 'Exclusion Zone' },
  { r: 2100, density: 1.1, label: 'Ashfall Zone' },
  { r: 3600, density: 0.4, label: 'Advisory Zone' },
];

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'KVERT', text: 'Volcano alert raised: seismicity surge at East Ridge', severity: 'warning' },
  { atTick: 3, tag: 'SEISMIC', text: 'Continuous tremor detected, ash column 3.1 km', severity: 'warning' },
  { atTick: 6, tag: 'ERUPTION', text: 'Explosive eruption begins — VEI 3, ash toward Zone E', severity: 'critical' },
  { atTick: 10, tag: 'EVACUATION', text: 'Zone E foothills under mandatory evacuation', severity: 'critical' },
  { atTick: 16, tag: 'LAVA', text: 'Lava flow descends west flank at 1.2 km/h', severity: 'critical' },
  { atTick: 22, tag: 'ASHFALL', text: 'Ashfall 2 cm accumulating at airport apron', severity: 'warning' },
  { atTick: 28, tag: 'AIR QUALITY', text: 'AQI deteriorates to 210 in ash path', severity: 'warning' },
  { atTick: 34, tag: 'CHIEF', text: 'Chief AI: ext‑flow diversion + shelter surge in port side', severity: 'warning' },
];

export const ZONE_PROFILES = { E: { share: 0.7, name: 'Residential Hills' }, F: { share: 0.3, name: 'Port Zone' } } as const;