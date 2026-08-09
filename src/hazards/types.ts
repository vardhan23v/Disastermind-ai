// Universal hazard contracts — every simulated disaster conforms to these
// types so the Mission Control UI, agents and digital twin stay common.

import type { AgentResult } from '@/agents/contract';
import type {
  AgentId,
  AlertLevel,
  CityPoint,
  CityPolygon,
  LayerKey,
  Phase,
  Recommendation,
  TimelineEntry,
  WorldState,
} from '@/types';
import type { HazardId } from '@/types';

export type { HazardId };

export type HazardCategory = 'geological' | 'hydromet' | 'climatological';

/** Time scale of the simulated timeline for this hazard. */
export type HazardTimeScale = 'minutes' | 'days' | 'weeks';

export type HazardSeverity = 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'SEVERE' | 'EXTREME';

export interface HazardMetricDef {
  key: string;
  label: string;
  unit?: string;
  decimals?: number;
}

export interface HazardLayerDef {
  key: LayerKey;
  label: string;
  icon: string;
}

/** Scripted timeline beats produced by the scenario. */
export interface HazardBeat {
  atTick: number;
  label?: string;
  tag: string;
  text: string;
  severity: TimelineEntry['severity'];
}

export interface HazardDefinition {
  id: HazardId;
  name: string;
  category: HazardCategory;
  icon: string;
  description: string;
  seed: number;
  severity: HazardSeverity;
  accent: string;
  accentSoft: string;
  /** Which known zones are directly in the hazard footprint. */
  affectedZones: string[];
  /** Coarse map label for the overview panel (e.g. "Coastal Zone A"). */
  areaLabel: string;
  /** Key metrics surfaced by Mission Control + SITREP. */
  metrics: HazardMetricDef[];
  /** Hazard-specific digital twin layers (beyond the common inventory). */
  layers: HazardLayerDef[];
  timeScale: HazardTimeScale;
  preferredResources: string[];
  requiredAgents: AgentId[];
  durationTicks: number;
  synopsis: string;
}

/** Metric map keyed by HazardMetricDef.key — lives on WorldState. */
export interface HazardMetricMap {
  [key: string]: number;
}

/** Deterministic shape(s) painted on the digital twin for one tick. */
export interface HazardPaint {
  layer: LayerKey;
  rings?: { cx: number; cy: number; r: number; stroke: string; fill?: string; dotted?: boolean }[];
  points?: { x: number; y: number; r: number; color: string; pulse?: boolean }[];
  polygons?: { pts: CityPolygon; fill: string; stroke: string; dash?: string; pulse?: boolean }[];
  paths?: { pts: CityPoint[]; stroke: string; width?: number; dash?: string; label?: string }[];
  heat?: { cx: number; cy: number; strength: number; radius: number }[];
  markers?: { x: number; y: number; label: string; color: string }[];
}

/**
 * A fully implemented hazard scenario. Every method is deterministic:
 * identical (seed, tick, world) → identical output.
 */
export interface HazardScenario {
  definition: HazardDefinition;

  /** Mutates the fresh world once (epicenter pins, fires, pumps…). */
  seedWorld(world: WorldState): WorldState;

  /** Advance simulation one tick: mutate world + return updated metric map. */
  step(world: WorldState, tick: number, metrics: HazardMetricMap): HazardMetricMap;

  /** Alert level at any tick (pure). */
  alertAt(tick: number, metrics: HazardMetricMap): AlertLevel;

  /** Operation phase at any tick (pure). */
  phaseAt(tick: number, metrics: HazardMetricMap): Phase;

  /** Timeline beats for this tick (pure). */
  events(world: WorldState, tick: number, metrics: HazardMetricMap): TimelineEntry[];

  /** Chief AI recommendations (pure). */
  recommendations(world: WorldState, tick: number, metrics: HazardMetricMap): Recommendation[];

  /** Hazard-specialist agent reasoning for the collaboration bus. */
  agents(world: WorldState, tick: number, metrics: HazardMetricMap): AgentResult;

  /** Digital-twin overlay shapes for the map (pure). */
  paint(world: WorldState, tick: number, metrics: HazardMetricMap): HazardPaint[];
}