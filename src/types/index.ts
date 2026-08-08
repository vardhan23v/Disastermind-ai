// DisasterMind AI — shared contracts. All agent inputs/outputs are typed here.

export type ZoneId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red' | 'purple';
export type Phase = 'standby' | 'storm-watch' | 'heavy-rain' | 'flood' | 'crisis' | 'recovery';
export type VehicleKind = 'ambulance' | 'boat' | 'drone' | 'relief';
export type UnitKind = 'fire' | 'police';
export type UnitStatus = 'ready' | 'deployed';
export type SosKind = 'trapped' | 'medical' | 'food' | 'infrastructure' | 'fire';
export type SosStatus = 'pending' | 'dispatched' | 'enroute' | 'resolved';
export type SosSource = 'citizen' | 'social' | 'etl';
export type VehicleStatus = 'idle' | 'enroute' | 'loading' | 'returning';
export type AgentId =
  | 'weather'
  | 'flood'
  | 'resource'
  | 'evacuation'
  | 'satellite'
  | 'social'
  | 'call-priority'
  | 'shelter'
  | 'decision-support'
  | 'report';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'restore';
export type RecStatus = 'pending' | 'approved' | 'rejected';
export type RecActionKind = 'evacuate' | 'deploy' | 'open-shelter' | 'close-road' | 'alert';
export type LayerKey =
  | 'weather'
  | 'flood'
  | 'zones'
  | 'roads'
  | 'blockedRoads'
  | 'hospitals'
  | 'shelters'
  | 'ambulances'
  | 'boats'
  | 'drones'
  | 'relief'
  | 'fireStations'
  | 'policeStations'
  | 'sos'
  | 'social'
  | 'satellite'
  | 'routes';
export type SpeedMult = 1 | 2 | 4;

export interface CityPoint {
  x: number;
  y: number;
}

export type CityPolygon = CityPoint[];

export interface Zone {
  id: ZoneId;
  name: string;
  polygon: CityPolygon;
  center: CityPoint;
  elevationM: number;
  population: number;
  coastal: boolean;
  evacuating?: boolean;
  evacDone?: boolean;
  evacuatedCount?: number;
}

export interface Hospital {
  id: string;
  name: string;
  pos: CityPoint;
  zone: ZoneId;
  totalBeds: number;
  occupiedBeds: number;
  icuTotal: number;
  icuOccupied: number;
  oxygen: 'ok' | 'low' | 'critical';
  capacityPct: number;
}

export interface Shelter {
  id: string;
  name: string;
  pos: CityPoint;
  zone: ZoneId;
  capacity: number;
  occupancy: number;
  hasFood: boolean;
  hasWater: boolean;
  hasMedicalStaff: boolean;
  womenSafe: boolean;
  petFriendly: boolean;
  openedAtTick: number;
}

export interface Vehicle {
  id: string;
  kind: VehicleKind;
  name: string;
  pos: CityPoint;
  home: CityPoint;
  speedKmh: number;
  status: VehicleStatus;
  path: CityPoint[];
  pathProgress: number;
  assignedSosId?: string;
  etaMin: number;
}

export interface UnitStation {
  id: string;
  kind: UnitKind;
  name: string;
  pos: CityPoint;
  zone: ZoneId;
  status: UnitStatus;
  staffOnDuty: number;
}

export type RoadKind = 'highway' | 'arterial' | 'local' | 'bridge';

export interface RoadSegment {
  id: string;
  name: string;
  kind: RoadKind;
  from: CityPoint;
  to: CityPoint;
  lengthM: number;
  zone: ZoneId;
  traffic: number;
  flooded: boolean;
  floodLevel: number;
  damaged: boolean;
  closed: boolean;
}

export interface ZoneFlood {
  zone: ZoneId;
  depthM: number;
  level: number;
}

export interface SosIncident {
  id: string;
  pos: CityPoint;
  zone: ZoneId;
  kind: SosKind;
  description: string;
  peopleCount: number;
  urgency: number;
  reason: string;
  createdAtTick: number;
  status: SosStatus;
  vehicleId?: string;
  source: SosSource;
}

export interface SocialPost {
  id: string;
  platform: 'twitter' | 'whatsapp' | 'news';
  author: string;
  content: string;
  pos: CityPoint;
  zone: ZoneId;
  category: SosKind;
  credibility: number;
  createdAtTick: number;
  verified: boolean;
}

export interface SatelliteHit {
  id: string;
  kind: 'flood' | 'fire' | 'collapse' | 'blockage';
  pos: CityPoint;
  zone: ZoneId;
  bbox: CityPolygon;
  label: string;
  confidence: number;
  createdAtTick: number;
}

export interface RoutePlan {
  id: string;
  kind: 'civilian' | 'ambulance' | 'relief';
  waypoints: CityPoint[];
  lengthM: number;
  minutes: number;
  reason: string;
  createdAtTick: number;
}

export interface Factor {
  agent: AgentId;
  note: string;
  weight: number;
}

export interface RecAction {
  kind: RecActionKind;
  target: string;
  detail: string;
  deploy?: { vehicleKind: VehicleKind; count: number };
}

export interface Recommendation {
  id: string;
  title: string;
  band: 'critical' | 'high' | 'medium';
  confidence: number;
  reasons: string[];
  factors: Factor[];
  actions: RecAction[];
  status: RecStatus;
  createdAtTick: number;
  approvedAtTick: number;
}

export type AgentMessageKind =
  | { kind: 'weather'; headline: string; zone: ZoneId }
  | { kind: 'flood'; zone: ZoneId; depthM: number; horizonMin: number; roads: string[] }
  | { kind: 'route'; plan: RoutePlan; causedBy: string }
  | { kind: 'capacity'; facility: string; pct: number; near: string[] }
  | { kind: 'sos'; sosId: string; zone: ZoneId; urgency: number }
  | { kind: 'shelter-fit'; shelterId: string; fill: number }
  | { kind: 'hazard'; hitId: string; label: string }
  | { kind: 'rec'; recId: string }
  | { kind: 'sitrep'; headline: string };

export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId;
  kind: AgentMessageKind;
  confidence: number;
  why: string;
  tick: number;
}

export interface TimelineEntry {
  tick: number;
  tag: string;
  text: string;
  severity: AlertSeverity;
}

export interface AnalyticsState {
  peopleRescued: number;
  pendingSos: number;
  criticalSos: number;
  hospitalLoadPct: number;
  floodedRoadsKm: number;
  activeVehicles: number;
  avgResponseMin: number;
  savedEstimate: number;
  shelterFillPct: number;
}

export interface DamageState {
  buildingsDamaged: number;
  roadsDestroyedKm: number;
  powerLossPct: number;
  affectedPopulation: number;
  economicLossInr: number;
}

export interface SitrepData {
  generatedAtTick: number;
  timeline: TimelineEntry[];
  resourcesDeployed: string[];
  sosHandled: number;
  casualtiesPrevented: number;
  damage: DamageState;
  rescued: number;
  pendingSos: number;
  alertPeak: AlertLevel;
}

export interface FloodFx {
  zone: ZoneId;
  depthM: number;
  level: number;
  fill: string;
}

export interface WorldState {
  tick: number;
  clockMin: number;
  running: boolean;
  phase: Phase;
  alert: AlertLevel;
  rainfallMmHr: number;
  riverPct: number;
  windKmh: number;
  storm: CityPoint;
  stormOnscreen: boolean;
  flood: FloodFx[];
  zones: Zone[];
  hospitals: Hospital[];
  shelters: Shelter[];
  vehicles: Vehicle[];
  units: UnitStation[];
  roads: RoadSegment[];
  sos: SosIncident[];
  posts: SocialPost[];
  hits: SatelliteHit[];
  routes: RoutePlan[];
  recommendations: Recommendation[];
  messages: AgentMessage[];
  timeline: TimelineEntry[];
  analytics: AnalyticsState;
  damage: DamageState | null;
  rescuedCount: number;
  evacuatedCount: number;
  history: {
    tick: number;
    flood: ZoneFlood[];
    pendingSos: number;
    rescued: number;
    alert: AlertLevel;
    riverPct: number;
    rainfallMmHr: number;
  }[];
}

export interface Toast {
  id: string;
  text: string;
  kind: 'info' | 'warn' | 'critical' | 'success';
}

export interface UiState {
  layers: Record<LayerKey, boolean>;
  tab: 'agents' | 'mission' | 'chief' | 'sitrep';
  timelineOffsetTick: number;
  toasts: Toast[];
  portalOpen: boolean;
  sitrep: SitrepData | null;
}