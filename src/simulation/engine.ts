// The deterministic tick engine. tickWorld(prev) → next is a pure function:
// no timers, no random, no IO — identical demo every run.

import {
  BRIDGE_COLLAPSE_TICK,
  HISTORY_EVERY_TICK,
  MAX_HISTORY,
  START_CLOCK_MIN,
  TICK_MINUTES,
  ZONE_IDS,
  EVAC_BUDGET,
} from '@/constants';
import type { AgentId, AgentMessage, CityPoint, Phase, SosIncident, WorldState, ZoneId } from '@/types';
import { buildFacilities } from '@/data/resources';
import { buildRoads, buildZones, zoneAt } from '@/data/city';
import { SOCIAL_CORPUS, SOS_PATROL } from '@/data/corpus';
import { SEED, worldRng } from '@/utils/seededRandom';
import {
  affectedPopulation,
  alertAt,
  damageCurves,
  floodDepthAt,
  floodFx,
  floodPeakShare,
  phaseAt,
  powerLossPct,
  rainfallAt,
  riverAt,
  stormAt,
  windAt,
} from '@/simulation/forecast';
import { executeRecommendation, dispatchNearestToSos, moveVehicles } from '@/simulation/dispatch';
import { nextMessageId } from '@/simulation/ids';
import { runCallPriority } from '@/agents/callPriority';
import { runDecisionSupport } from '@/agents/decisionSupport';
import { runEvacuation } from '@/agents/evacuation';
import { runFlood } from '@/agents/flood';
import { runReport } from '@/agents/report';
import { runResources } from '@/agents/resources';
import { runSatellite } from '@/agents/satellite';
import { runShelter } from '@/agents/shelter';
import { runSocial } from '@/agents/social';
import { runWeather } from '@/agents/weather';
import type { Agent } from '@/agents/contract';
import type { FloodFx, TimelineEntry } from '@/types';

const AGENTS: { id: AgentId; run: Agent }[] = [
  { id: 'weather', run: runWeather },
  { id: 'flood', run: runFlood },
  { id: 'resource', run: runResources },
  { id: 'evacuation', run: runEvacuation },
  { id: 'satellite', run: runSatellite },
  { id: 'social', run: runSocial },
  { id: 'call-priority', run: runCallPriority },
  { id: 'shelter', run: runShelter },
  { id: 'decision-support', run: runDecisionSupport },
  { id: 'report', run: runReport },
];

export function createInitialWorld(): WorldState {
  const rng = worldRng(SEED);
  const zones = buildZones(rng);
  const roads = buildRoads(zones, rng);
  const facility = buildFacilities(rng, zones);
  return {
    tick: 0,
    clockMin: START_CLOCK_MIN,
    running: false,
    phase: 'standby' as Phase,
    alert: 'green',
    hazard: 'cyclone',
    hazardMetrics: cycloneMetrics(0),
    rainfallMmHr: 2,
    riverPct: 46,
    windKmh: 18,
    storm: { x: -2600, y: 5800 },
    stormOnscreen: false,
    flood: ZONE_IDS.map((z) => fx(z, 0)),
    zones,
    hospitals: facility.hospitals,
    shelters: facility.shelters,
    vehicles: facility.vehicles,
    units: facility.units,
    roads,
    sos: [
      {
        id: 'sos-0-a',
        pos: { x: 5050, y: 9240 },
        zone: 'A',
        kind: 'trapped',
        description: 'Family of 5 awaiting evacuation — high tide approaching',
        peopleCount: 5,
        urgency: 8,
        reason: '',
        createdAtTick: 0,
        status: 'pending',
        source: 'citizen',
      },
      {
        id: 'sos-0-b',
        pos: { x: 3680, y: 7060 },
        zone: 'B',
        kind: 'medical',
        description: 'Asthma patient needs nebulizer, nearby clinic closed',
        peopleCount: 1,
        urgency: 5,
        reason: '',
        createdAtTick: 0,
        status: 'pending',
        source: 'citizen',
      },
    ],
    posts: [],
    hits: [],
    routes: [],
    recommendations: [],
    messages: [],
    timeline: [],
    analytics: emptyAnalytics(),
    damage: null,
    rescuedCount: 0,
    evacuatedCount: 0,
    history: [],
  };
}

export function tickWorld(prev: WorldState): WorldState {
  const tick = prev.tick + 1;
  const next: WorldState = structuredClone(prev);
  next.tick = tick;
  next.clockMin = START_CLOCK_MIN + tick * TICK_MINUTES;

  // climate
  next.rainfallMmHr = rainfallAt(tick);
  next.riverPct = riverAt(tick);
  next.windKmh = windAt(tick);
  next.storm = stormAt(tick);
  next.stormOnscreen = tick <= 34;
  next.alert = alertAt(tick);
  next.phase = phaseAt(tick) as Phase;
  next.hazardMetrics = cycloneMetrics(tick);

  // flood state
  next.flood = ZONE_IDS.map((z) => fx(z, tick));

  // road flooding
  for (const r of next.roads) {
    const depth = floodDepthAt(r.zone, tick);
    r.floodLevel = depth;
    r.flooded = depth >= 0.15;
    if (r.kind === 'bridge' && depth >= 0.7 && tick >= BRIDGE_COLLAPSE_TICK) r.damaged = true;
  }

  if (tick === 24) {
    const h1 = next.hospitals.find((h) => h.name === 'Central District Hospital');
    if (h1) {
      h1.occupiedBeds = Math.round(h1.totalBeds * 0.9);
      h1.icuOccupied = h1.icuTotal - 1;
      h1.oxygen = 'low';
      h1.capacityPct = 90;
    }
    pushTimeline(next, tick, 'PRESSURE', 'Central District Hospital at 90% — Chief AI recommends evacuation', 'warning');
  }

  if (tick === BRIDGE_COLLAPSE_TICK) {
    pushHit(next, 'collapse', 'Delta Bridge collapse — span shifted 14 m', 91);
    pushTimeline(next, tick, 'BRIDGE', 'Delta Bridge collapsed — satellite confirmed, routes redrawn', 'critical');
  }
  if (tick === 31) pushHit(next, 'fire', 'Thermal anomaly at transformer yard', 67);
  if (tick === 34) pushHit(next, 'flood', 'Deep water over coastal blocks', 88);

  // corpus posts
  for (const post of SOCIAL_CORPUS) {
    if (post.createdAtTick === tick) next.posts.push({ ...post });
  }

  // mayday spawns
  const spawnIdx = SOS_PATROL.findIndex((t) => t.createdAt === tick);
  if (spawnIdx >= 0) {
    const spawn = SOS_PATROL[spawnIdx];
    next.sos.push({
      id: `sos-${tick}`,
      pos: spawn.pos,
      zone: zoneAt(next.zones, spawn.pos),
      kind: spawn.kind,
      description: spawn.description,
      peopleCount: spawn.peopleCount,
      urgency: Math.max(3, 10 - spawnIdx * 2),
      reason: '',
      createdAtTick: tick,
      status: 'pending',
      source: 'etl',
    });
  }

  // real evacuation waves for zones marked by an approved Evacuate rec
  for (const zone of next.zones) {
    if (!zone.evacuating || zone.evacDone) continue;
    const budget = EVAC_BUDGET[zone.id as 'A' | 'B'] ?? 1200;
    const movedSoFar = zone.evacuatedCount ?? 0;
    if (movedSoFar >= budget) {
      zone.evacuating = false;
      zone.evacDone = true;
      pushTimeline(next, tick, 'EVAC COMPLETE', `${zone.name} evacuated — ${budget.toLocaleString('en-IN')} people cleared`, 'restore');
      continue;
    }
    const opened = next.shelters
      .filter((s) => s.openedAtTick > 0 && s.occupancy < s.capacity - 1)
      .sort((a, b) => a.occupancy / a.capacity - b.occupancy / b.capacity);
    const moved = Math.min(budget - movedSoFar, Math.ceil(budget / 10));
    zone.evacuatedCount = movedSoFar + moved;
    next.evacuatedCount += moved;
    let rem = moved;
    for (const s of opened) {
      const take = Math.min(rem, s.capacity - 1 - s.occupancy);
      s.occupancy += take;
      rem -= take;
      if (rem <= 0) break;
    }
    if (moved === 0) continue;
  }

  // units — auto-dispatch the highest-priority pending SOS every tick so the
  // fleet visibly responds without a click (commander can still override).
  for (const sos of pendingPriority(next)
    .slice(0, 2)
    .map((s) => s)) {
    dispatchNearestToSos(next, sos.id);
  }
  moveVehicles(next);

  // auto-execute fallback: keeps the demo beat alive without a click
  if (tick === 30) {
    const rec = next.recommendations.find((r) => r.status === 'pending' && r.title.includes('Evacuate Zones A & B'));
    if (rec) executeRecommendation(next, rec, 'auto');
  }
  if (tick === 37) {
    const rec = next.recommendations.find((r) => r.status === 'pending' && r.title.includes('rescue boats'));
    if (rec) executeRecommendation(next, rec, 'auto');
  }

  // agents
  for (const agent of AGENTS) {
    const result = agent.run(next, tick);
    result.messages.forEach((m, i) => {
      const msg: AgentMessage = {
        id: nextMessageId(tick, agent.id, i),
        from: agent.id,
        to: m.to ?? 'decision-support',
        kind: m.kind,
        confidence: m.confidence,
        why: m.why,
        tick,
      };
      next.messages.push(msg);
    });
    if (result.recommendations.length > 0) next.recommendations.push(...result.recommendations);
    if (result.routes && result.routes.length > 0) next.routes.push(...result.routes);
  }
  next.messages = next.messages.slice(-400);
  next.recommendations = next.recommendations.slice(-25);

  // recovery / final tally
  if (tick === 42) {
    next.rescuedCount = Math.max(next.rescuedCount, 341);
  }
  if (tick >= 42 && !next.damage) {
    const curves = damageCurves(tick);
    next.damage = {
      buildingsDamaged: curves.buildings,
      roadsDestroyedKm: curves.roads,
      powerLossPct: Math.round(powerLossPct(tick)),
      affectedPopulation: affectedPopulation(tick),
      economicLossInr: Math.round(1040e6 * floodPeakShare(tick)),
    };
  }

  // analytics
  next.analytics = computeAnalytics(next);

  // scripted timeline beats
  const beat = TIMELINE_BEATS[tick];
  if (beat) {
    for (const b of beat) pushTimeline(next, tick, b.tag, b.text, b.severity);
  }

  // history for timeline slider + charts
  if (tick % HISTORY_EVERY_TICK === 0) {
    next.history.push({
      tick,
      flood: next.flood.map((f) => ({ zone: f.zone, depthM: f.depthM, level: f.level })),
      pendingSos: next.analytics.pendingSos,
      rescued: next.rescuedCount,
      alert: next.alert,
      riverPct: next.riverPct,
      rainfallMmHr: next.rainfallMmHr,
    });
    if (next.history.length > MAX_HISTORY) next.history.shift();
  }

  return next;
}

function fx(zone: ZoneId, tick: number): FloodFx {
  const f = floodFx(zone, tick);
  return { ...f, fill: fillFor(f.depthM) };
}

function cycloneMetrics(tick: number): Record<string, number> {
  const fx0 = ZONE_IDS.map((z) => floodFx(z, tick));
  return {
    windKmh: windAt(tick),
    rainfallMmHr: rainfallAt(tick),
    riverPct: riverAt(tick),
    floodDepthM: Math.max(0, ...fx0.map((f) => f.depthM)),
    floodedRoadsKm: 0,
  };
}

export function pendingPriority(w: WorldState): SosIncident[] {
  return w.sos
    .filter((s) => s.status === 'pending' && !s.vehicleId)
    .sort((a, b) => b.urgency - a.urgency || a.createdAtTick - b.createdAtTick);
}

export function fillFor(depth: number): string {
  if (depth >= 1.2) return 'rgba(30, 64, 175, 0.8)';
  if (depth >= 0.6) return 'rgba(37, 99, 235, 0.62)';
  if (depth > 0) return 'rgba(59, 130, 246, 0.44)';
  return 'rgba(147, 197, 253, 0.08)';
}

function emptyAnalytics(): WorldState['analytics'] {
  return {
    peopleRescued: 0,
    pendingSos: 0,
    criticalSos: 0,
    hospitalLoadPct: 0,
    floodedRoadsKm: 0,
    activeVehicles: 0,
    avgResponseMin: 0,
    savedEstimate: 0,
    shelterFillPct: 0,
  };
}

export function computeAnalytics(w: WorldState): WorldState['analytics'] {
  const pendingSos = w.sos.filter((s) => s.status === 'pending' || s.status === 'dispatched');
  const criticalSos = pendingSos.filter((s) => s.urgency >= 9);
  const hospitalLoad = Math.round(w.hospitals.reduce((a, h) => a + h.capacityPct, 0) / Math.max(1, w.hospitals.length));
  const floodedKm = w.roads.filter((r) => r.flooded).reduce((a, r) => a + r.lengthM / 1000, 0);
  const active = w.vehicles.filter((v) => v.status === 'idle').length;
  const resolved = w.sos.filter((s) => s.status === 'resolved');
  const avgResponse = resolved.length
    ? Math.round((resolved.reduce((a, s) => a + (w.tick - s.createdAtTick) * TICK_MINUTES, 0) / resolved.length))
    : 0;
  const openShelters = w.shelters.filter((s) => s.openedAtTick > 0);
  const shelterFill = openShelters.length
    ? Math.round((openShelters.reduce((a, s) => a + s.occupancy, 0) / openShelters.reduce((a, s) => a + s.capacity, 0)) * 100)
    : 0;
  return {
    peopleRescued: w.rescuedCount,
    pendingSos: pendingSos.length,
    criticalSos: criticalSos.length,
    hospitalLoadPct: hospitalLoad,
    floodedRoadsKm: Math.round(floodedKm * 10) / 10,
    activeVehicles: active,
    avgResponseMin: avgResponse,
    savedEstimate: Math.round(w.rescuedCount * 2.4 + w.evacuatedCount * 0.5),
    shelterFillPct: shelterFill,
  };
}

function pushHit(w: WorldState, kind: HitKind, label: string, confidence: number): void {
  const zoneMap: Record<HitKind, ZoneId> = { collapse: 'B', fire: 'F', flood: 'A', blockage: 'C' };
  const zoneObj = w.zones.find((z) => z.id === zoneMap[kind]);
  if (!zoneObj) return;
  const pos: CityPoint = zoneObj.center;
  const size = kind === 'collapse' ? 640 : 480;
  w.hits.push({
    id: `hit-${w.tick}`,
    kind,
    pos,
    zone: zoneMap[kind],
    bbox: [
      { x: pos.x - size, y: pos.y - size },
      { x: pos.x + size, y: pos.y - size },
      { x: pos.x + size, y: pos.y + size },
      { x: pos.x - size, y: pos.y + size },
    ],
    label,
    confidence,
    createdAtTick: w.tick,
  });
}

const TIMELINE_BEATS: Record<number, { tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[]> = {
  0: [{ tag: 'CYCLONE', text: 'Cyclone C-07 appears offshore — advisory issued', severity: 'warning' }],
  8: [{ tag: 'RAIN', text: 'Heavy rain begins · river Ootha rising', severity: 'warning' }],
  12: [{ tag: 'FLOOD', text: 'Flooding starts in Zone A — first SOS received', severity: 'critical' }],
  18: [{ tag: 'REROUTE', text: 'Ring Road flooded — evacuation routes recalculated', severity: 'warning' }],
  36: [{ tag: 'BRIDGE', text: 'Delta Bridge collapsed — satellite confirmed, routes redrawn', severity: 'critical' }],
  42: [{ tag: 'RECOVERY', text: 'Rain easing — flood water receding from Zone A & B', severity: 'info' }],
};

function pushTimeline(w: WorldState, tick: number, tag: string, text: string, severity: TimelineEntry['severity']): void {
  w.timeline.push({ tick, tag, text, severity });
}

type HitKind = 'collapse' | 'fire' | 'flood' | 'blockage';