// Deterministic tick runner for hazard scenarios (everything except the
// flagship cyclone/flood demo, which keeps its own engine path verbatim).
// tickHazardWorld(prev, scenario) → next is pure: no timers, no IO.

import { runCallPriority } from '@/agents/callPriority';
import { runEvacuation } from '@/agents/evacuation';
import { runReport } from '@/agents/report';
import { runShelter } from '@/agents/shelter';
import type { Agent, AgentResult } from '@/agents/contract';
import { EVAC_BUDGET, HISTORY_EVERY_TICK, MAX_HISTORY, START_CLOCK_MIN, TICK_MINUTES } from '@/constants';
import type { HazardScenario } from '@/hazards/types';
import { dispatchNearestToSos, moveVehicles } from '@/simulation/dispatch';
import { computeAnalytics, pendingPriority } from '@/simulation/engine';
import { nextMessageId } from '@/simulation/ids';
import type { AgentId, WorldState } from '@/types';

/** Hazard-agnostic agents that run for every scenario. */
const GENERIC_AGENTS: { id: AgentId; run: Agent }[] = [
  { id: 'call-priority', run: runCallPriority },
  { id: 'evacuation', run: runEvacuation },
  { id: 'shelter', run: runShelter },
  { id: 'report', run: runReport },
];

export function tickHazardWorld(prev: WorldState, scenario: HazardScenario): WorldState {
  const next: WorldState = structuredClone(prev);
  const tick = next.tick + 1;
  next.tick = tick;
  next.clockMin = START_CLOCK_MIN + tick * TICK_MINUTES;

  // scenario advance
  const metrics = scenario.step(next, tick, prev.hazardMetrics);
  next.hazardMetrics = metrics;
  next.alert = scenario.alertAt(tick, metrics);
  next.phase = scenario.phaseAt(tick, metrics);

  // evacuation waves for approved Evacuate recs
  evacWaves(next, tick);

  // auto-dispatch highest-priority pending SOSs + fleet motion
  for (const sos of pendingPriority(next).slice(0, 2)) {
    dispatchNearestToSos(next, sos.id);
  }
  moveVehicles(next);

  // specialist + generic agents
  const results: { id: AgentId; result: AgentResult }[] = [
    { id: specialistId(scenario.definition.id), result: scenario.agents(next, tick, metrics) },
  ];
  for (const agent of GENERIC_AGENTS) {
    results.push({ id: agent.id, result: agent.run(next, tick) });
  }
  stampResults(next, tick, results);

  // timeline beats
  for (const e of scenario.events(next, tick, metrics)) next.timeline.push(e);
  next.messages = next.messages.slice(-400);
  next.recommendations = next.recommendations.slice(-25);

  // analytics + history
  next.analytics = computeAnalytics(next);
  if (tick % HISTORY_EVERY_TICK === 0) {
    next.history.push({
      tick,
      flood: next.flood.map((f) => ({ zone: f.zone, depthM: f.depthM, level: f.level })),
      pendingSos: next.analytics.pendingSos,
      rescued: next.rescuedCount,
      alert: next.alert,
      riverPct: metrics.riverPct ?? next.riverPct,
      rainfallMmHr: metrics.rainfallMmHr ?? next.rainfallMmHr,
    });
    if (next.history.length > MAX_HISTORY) next.history.shift();
  }

  return next;
}

function specialistId(hazard: string): AgentId {
  switch (hazard) {
    case 'earthquake':
      return 'seismic';
    case 'volcano':
      return 'seismic';
    case 'tsunami':
      return 'marine';
    case 'wildfire':
      return 'fire';
    case 'heatwave':
      return 'heat';
    case 'drought':
      return 'drought';
    case 'tornado':
      return 'tornado';
    case 'flood':
      return 'flood';
    default:
      return 'report';
  }
}

function stampResults(world: WorldState, tick: number, results: { id: AgentId; result: AgentResult }[]): void {
  for (const { id, result } of results) {
    result.messages.forEach((m, i) => {
      world.messages.push({
        id: nextMessageId(tick, id, i),
        from: id,
        to: m.to ?? 'decision-support',
        kind: m.kind,
        confidence: m.confidence,
        why: m.why,
        tick,
      });
    });
    if (result.recommendations.length > 0) world.recommendations.push(...result.recommendations);
    if (result.routes && result.routes.length > 0) world.routes.push(...result.routes);
  }
}

function evacWaves(world: WorldState, tick: number): void {
  for (const zone of world.zones) {
    if (!zone.evacuating || zone.evacDone) continue;
    const budget = EVAC_BUDGET[zone.id as 'A' | 'B'] ?? 1200;
    const movedSoFar = zone.evacuatedCount ?? 0;
    if (movedSoFar >= budget) {
      zone.evacuating = false;
      zone.evacDone = true;
      world.timeline.push({
        tick,
        tag: 'EVAC COMPLETE',
        text: `${zone.name} evacuated — ${budget.toLocaleString('en-IN')} people cleared`,
        severity: 'restore',
      });
      continue;
    }
    const opened = world.shelters
      .filter((s) => s.openedAtTick > 0 && s.occupancy < s.capacity - 1)
      .sort((a, b) => a.occupancy / a.capacity - b.occupancy / b.capacity);
    const moved = Math.min(budget - movedSoFar, Math.ceil(budget / 10));
    zone.evacuatedCount = movedSoFar + moved;
    world.evacuatedCount += moved;
    let rem = moved;
    for (const s of opened) {
      const take = Math.min(rem, s.capacity - 1 - s.occupancy);
      s.occupancy += take;
      rem -= take;
      if (rem <= 0) break;
    }
  }
}