// All tuning values for the demo live here. No magic numbers elsewhere.

import type { AlertLevel, CityPoint, LayerKey, SpeedMult, ZoneId } from '@/types';

export const TICK_MINUTES = 5; // one tick = five simulated minutes
export const TICK_INTERVAL_MS = 3500; // wall-clock per tick → 44 ticks ≈ 2.6 min demo
export const START_CLOCK_MIN = 6 * 60; // demo begins 06:00 local
export const DEMO_TICKS = 44;
export const SPEEDS: SpeedMult[] = [1, 2, 4];

export const CITY: { widthM: number; heightM: number; label: string } = {
  widthM: 12000,
  heightM: 12000,
  label: 'Port City KARUNA',
};

export const ZONE_IDS: ZoneId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ZONE_META: Record<
  ZoneId,
  { name: string; elevationM: number; population: number; coastal: boolean }
> = {
  A: { name: 'Coastal Lowlands', elevationM: 2, population: 210000, coastal: true },
  B: { name: 'River Delta', elevationM: 3, population: 180000, coastal: false },
  C: { name: 'Urban Core', elevationM: 8, population: 420000, coastal: false },
  D: { name: 'Industrial Belt', elevationM: 6, population: 150000, coastal: false },
  E: { name: 'Residential Hills', elevationM: 15, population: 190000, coastal: false },
  F: { name: 'Airport & Port', elevationM: 4, population: 90000, coastal: true },
};

export const ALERT_META: Record<AlertLevel, { label: string; color: string; glow: string }> = {
  green: { label: 'NORMAL', color: '#34d399', glow: 'rgba(52,211,153,0.5)' },
  yellow: { label: 'WATCH', color: '#fbbf24', glow: 'rgba(251,191,36,0.5)' },
  orange: { label: 'ALERT', color: '#fb923c', glow: 'rgba(251,146,60,0.5)' },
  red: { label: 'EMERGENCY', color: '#f87171', glow: 'rgba(248,113,113,0.6)' },
  purple: { label: 'CATASTROPHE', color: '#c084fc', glow: 'rgba(192,132,252,0.6)' },
};

export const AGENT_META: Record<
  string,
  { label: string; color: string; short: string }
> = {
  weather: { label: 'Weather Intelligence', color: '#22d3ee', short: 'WX' },
  flood: { label: 'Flood Prediction', color: '#60a5fa', short: 'FL' },
  resource: { label: 'Emergency Resources', color: '#34d399', short: 'RE' },
  evacuation: { label: 'Smart Evacuation', color: '#fb923c', short: 'EV' },
  satellite: { label: 'Satellite Vision', color: '#a78bfa', short: 'SV' },
  social: { label: 'Social Intelligence', color: '#f472b6', short: 'SM' },
  'call-priority': { label: 'Call Prioritization', color: '#f87171', short: 'CP' },
  shelter: { label: 'Shelter Recommendation', color: '#2dd4bf', short: 'SH' },
  'decision-support': { label: 'Decision Support · Chief AI', color: '#fbbf24', short: 'CH' },
  report: { label: 'Government Report', color: '#94a3b8', short: 'GR' },
};

export const SOS_META: Record<
  'trapped' | 'medical' | 'food' | 'infrastructure' | 'fire',
  { label: string; color: string }
> = {
  trapped: { label: 'Trapped', color: '#f87171' },
  medical: { label: 'Medical', color: '#fb923c' },
  food: { label: 'Food / Water', color: '#fbbf24' },
  infrastructure: { label: 'Infrastructure', color: '#a78bfa' },
  fire: { label: 'Fire', color: '#f472b6' },
};

export const PRIMARY_LAYERS: { key: LayerKey; label: string; icon: string }[] = [
  { key: 'hospitals', label: 'Hospitals', icon: '🏥' },
  { key: 'shelters', label: 'Shelters', icon: '⛑' },
  { key: 'ambulances', label: 'Ambulances', icon: '🚑' },
  { key: 'sos', label: 'SOS', icon: '🆘' },
  { key: 'fireStations', label: 'Fire Stations', icon: '🚒' },
  { key: 'policeStations', label: 'Police Stations', icon: '🛡' },
  { key: 'boats', label: 'Rescue Boats', icon: '🚤' },
  { key: 'flood', label: 'Flood Zones', icon: '🌊' },
  { key: 'blockedRoads', label: 'Blocked Roads', icon: '🚧' },
  { key: 'routes', label: 'Emergency Routes', icon: '🧭' },
  { key: 'weather', label: 'Cyclone Track', icon: '🌀' },
];

export const EXTRA_LAYERS: { key: LayerKey; label: string; icon: string }[] = [
  { key: 'zones', label: 'Zone Outlines', icon: '🗺' },
  { key: 'roads', label: 'Road Network', icon: '🛣' },
  { key: 'drones', label: 'Drones', icon: '🛸' },
  { key: 'relief', label: 'Relief Trucks', icon: '🚚' },
  { key: 'social', label: 'Social Signals', icon: '💬' },
  { key: 'satellite', label: 'Satellite Scans', icon: '🛰' },
];

export const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  weather: true,
  flood: true,
  zones: true,
  roads: true,
  blockedRoads: true,
  hospitals: true,
  shelters: true,
  ambulances: true,
  boats: true,
  drones: true,
  relief: true,
  fireStations: true,
  policeStations: true,
  sos: true,
  social: false,
  satellite: true,
  routes: true,
};

export const HOSPITAL_COUNT = 15;
export const SHELTER_COUNT = 10;
export const AMBULANCE_COUNT = 25;
export const BOAT_COUNT = 6;
export const DRONE_COUNT = 3;
export const RELIEF_TRUCK_COUNT = 4;

/** First critical script moment (hospital A pressure) — drives "Evacuate Zones A & B". */
export const EVAC_RECOMMEND_TICK = 24;
export const EVAC_BUDGET: Record<'A'|'B', number> = { A: 1500, B: 1200 }; // demo-scale slice of each zone population
export const RING_ROAD_FLOOD_TICK = 18;
export const BRIDGE_COLLAPSE_TICK = 36;

export const FLOOD_PHASES = {
  A: { start: 12, max: 1.9, ramp: 14 },
  B: { start: 16, max: 1.3, ramp: 14 },
  C: { start: 20, max: 0.7, ramp: 12 },
  D: { start: 24, max: 0.6, ramp: 12 },
  E: { start: 999, max: 0.1, ramp: 6 },
  F: { start: 26, max: 0.5, ramp: 10 },
} as const;

export const FLOOD_COLORS = {
  shallow: 'rgba(56, 130, 246, 0.45)',
  medium: 'rgba(37, 99, 235, 0.6)',
  deep: 'rgba(30, 64, 175, 0.78)',
  edge: 'rgba(125, 211, 252, 0.85)',
};

export const RAIN_PROFILE: { rampStart: number; rampEnd: number; peak: number } = {
  rampStart: 6,
  rampEnd: 26,
  peak: 118, // mm/hr
};

export const RIVER_PROFILE = {
  base: 46,
  riseStart: 6,
  riseEnd: 28,
  peak: 108,
  fallStart: 40,
  fallEnd: 46,
};

export const WIND_PROFILE = {
  base: 18,
  peak: 96,
  riseEnd: 30,
};

export const STORM_PATH: CityPoint[] = [
  { x: -2600, y: 5800 },
  { x: -900, y: 5100 },
  { x: 900, y: 4300 },
  { x: 2700, y: 3600 },
  { x: 4600, y: 3000 },
  { x: 6600, y: 2600 },
  { x: 8800, y: 2400 },
];

export const ALERT_FROM_TICK: { threshold: number; level: AlertLevel }[] = [
  { threshold: 0, level: 'yellow' },
  { threshold: 8, level: 'orange' },
  { threshold: 34, level: 'red' },
  { threshold: 42, level: 'orange' },
  { threshold: 46, level: 'yellow' },
];

export const HISTORY_EVERY_TICK = 2; // history snapshot frequency
export const MAX_HISTORY = 320;

export const VEHICLE_SPEEDS: Record<'ambulance' | 'boat' | 'drone' | 'relief', number> = {
  ambulance: 26,
  boat: 14,
  drone: 45,
  relief: 16,
};

export const NET = {
  nodeSnapM: 5,
  civilianBlockDepthM: 0.35,
  ambulanceBlockDepthM: 1.0,
  reliefBlockDepthM: 1.4,
  trafficPenalty: 0.35,
  bridgeBlockDepthM: 0.6,
};

export const SITREP_MIN_TICK = 40;

export const WATERMARK_TEXT = 'SIMULATION / DEMO — NOT OPERATIONAL DATA';