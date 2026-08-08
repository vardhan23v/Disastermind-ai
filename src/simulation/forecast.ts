// Deterministic climate + flood model. Every value is a pure function of tick,
// so the demo replays identically and the timeline slider can extrapolate.

import {
  FLOOD_PHASES,
  RAIN_PROFILE,
  RIVER_PROFILE,
  STORM_PATH,
  WIND_PROFILE,
  ZONE_IDS,
} from '@/constants';
import type { AlertLevel, CityPoint, ZoneFlood, ZoneId } from '@/types';
import { clamp, lerp, smoothstep } from '@/utils/geo';
import { rngFor } from '@/utils/seededRandom';
import { SEED } from '@/utils/seededRandom';

function rngFromSeed(code: number) {
  return rngFor(SEED, code);
}

export function rainfallAt(tick: number): number {
  const { rampStart, rampEnd, peak } = RAIN_PROFILE;
  if (tick <= rampStart) return 2;
  const t = smoothstep((tick - rampStart) / (rampEnd - rampStart));
  const decay = tick > rampEnd ? 1 - smoothstep((tick - rampEnd) / 14) * 0.85 : 1;
  return clamp(2 + t * peak, 2, peak) * decay;
}

export function windAt(tick: number): number {
  const { base, peak, riseEnd } = WIND_PROFILE;
  const t = smoothstep(tick / riseEnd);
  const decay = tick > riseEnd ? 1 - smoothstep((tick - riseEnd) / 12) * 0.55 : 1;
  return base + (peak - base) * t * t * decay;
}

export function riverAt(tick: number): number {
  const { base, riseStart, riseEnd, peak, fallStart, fallEnd } = RIVER_PROFILE;
  if (tick <= riseStart) return base;
  const rising = smoothstep((tick - riseStart) / (riseEnd - riseStart));
  if (tick <= riseEnd) return base + (peak - base) * rising;
  return peak - (peak - base) * smoothstep((tick - fallStart) / (fallEnd - fallStart));
}

/** Cyclone eye position along the scripted track. */
export function stormAt(tick: number): CityPoint {
  const path = STORM_PATH;
  const t = clamp(tick / (STORM_PATH.length - 1) / 6, 0, 1);
  const point = lerpPath(path, t);
  // add tiny deterministic wobble so the eye visibly pulses
  const wobble = Math.sin(tick * 0.7) * 90;
  return { x: point.x, y: point.y + wobble };
}

function lerpPath(path: CityPoint[], t: number): CityPoint {
  const total = path.length - 1;
  const scaled = t * total;
  const i = Math.min(Math.floor(scaled), path.length - 2);
  const local = scaled - i;
  return {
    x: lerp(path[i].x, path[i + 1].x, local),
    y: lerp(path[i].y, path[i + 1].y, local),
  };
}

function zonePhase(z: ZoneId): { start: number; max: number; ramp: number } {
  return FLOOD_PHASES[z];
}

export function floodDepthAt(z: ZoneId, tick: number): number {
  const { start, max, ramp } = zonePhase(z);
  if (tick < start) return 0;
  const t = smoothstep((tick - start) / ramp);
  return max * t;
}

export function floodLevelAt(z: ZoneId, tick: number): number {
  const { max } = zonePhase(z);
  if (max <= 0) return 0;
  return clamp(floodDepthAt(z, tick) / max, 0, 1);
}

export function floodFx(z: ZoneId, tick: number): ZoneFlood {
  const depth = floodDepthAt(z, tick);
  const level = floodLevelAt(z, tick);
  return { zone: z, depthM: round2(depth), level };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function alertAt(tick: number): AlertLevel {
  if (tick >= 42) return 'orange';
  if (tick >= 34) return 'red'; // bridge collapse
  if (tick >= 8) return 'orange'; // heavy rain begins
  if (tick >= 1) return 'yellow';
  return 'green';
}

export function phaseAt(tick: number): string {
  if (tick >= 42) return 'recovery';
  if (tick >= 34) return 'crisis';
  if (tick >= 20) return 'flood';
  if (tick >= 8) return 'heavy-rain';
  if (tick >= 0) return 'storm-watch';
  return 'standby';
}

/** Road flood level in [0,1] for a road living in a zone at tick. */
export function roadFloodAt(z: ZoneId, tick: number): number {
  const depth = floodDepthAt(z, tick);
  if (depth <= 0.15) return 0;
  return clamp((depth - 0.15) / 1.5, 0, 1);
}

export function jitter(value: number, seed: number, tick: number, spread: number): number {
  const r = rngFromSeed(seed * 31 + tick);
  return value + r.nextFloat(-spread, spread);
}

/** Deterministic per-zone flood jitter — small but stable noise for visuals. */
export function floodDepthAtNoisy(z: ZoneId, tick: number): number {
  const base = floodDepthAt(z, tick);
  if (base <= 0) return 0;
  const n = jitter(base, tick, z.charCodeAt(0), 0.03);
  return Math.max(0, round2(n));
}

export function affectedPopulation(tick: number): number {
  const totals = {
    A: 210000,
    B: 180000,
    C: 420000,
    D: 150000,
    E: 190000,
    F: 90000,
  } as Record<ZoneId, number>;

  let pct = 0;
  for (const z of ZONE_IDS) {
    const d = floodLevelAt(z, tick);
    pct += totals[z] * d * 0.85;
  }
  return Math.round(pct);
}

export function powerLossPct(tick: number): number {
  return clamp(4 + floodPeakShare(tick) * 42, 2, 60);
}

export function floodPeakShare(tick: number): number {
  const share = ZONE_IDS.reduce((acc, z) => acc + floodLevelAt(z, tick), 0) / ZONE_IDS.length;
  return clamp(share, 0, 1);
}

export function damageCurves(tick: number): { buildings: number; roads: number } {
  const share = floodPeakShare(tick);
  return {
    buildings: Math.round(214 * share * (0.6 + 0.4 * smoothstep((tick - 30) / 10))),
    roads: round1(3.2 * share),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}