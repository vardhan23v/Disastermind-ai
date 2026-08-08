import { describe, expect, it } from 'vitest';
import { createInitialWorld, tickWorld } from '@/simulation/engine';
import { executeRecommendation } from '@/simulation/dispatch';
import { runCallPriority } from '@/agents/callPriority';
import { floodFx } from '@/simulation/forecast';
import { DEMO_TICKS, BRIDGE_COLLAPSE_TICK } from '@/constants';
import type { ZoneId } from '@/types';

function runDemo(): ReturnType<typeof createInitialWorld> {
  let w = createInitialWorld();
  for (let t = 1; t <= DEMO_TICKS; t++) w = tickWorld(w);
  return w;
}

describe('deterministic engine', () => {
  it('is purely deterministic across two replays', () => {
    const a = runDemo();
    const b = runDemo();
    expect(a.analytics).toEqual(b.analytics);
    expect(a.messages.length).toBe(b.messages.length);
    expect(a.history.length).toBe(b.history.length);
  });

  it('carries the demo narrative to completion', () => {
    const a = runDemo();
    expect(a.tick).toBe(DEMO_TICKS);
    expect(a.phase).toBe('recovery');
    expect(a.rescuedCount).toBeGreaterThanOrEqual(341);
    expect(a.analytics.peopleRescued).toBe(a.rescuedCount);
    expect(a.messages.length).toBeGreaterThanOrEqual(30);
    expect(a.hits.some((h) => h.kind === 'collapse')).toBe(true);
    expect(a.timeline.length).toBeGreaterThanOrEqual(8);
  });

  it('issues the Chief reco at the scripted tick', () => {
    let w = createInitialWorld();
    for (let t = 1; t <= 24; t++) w = tickWorld(w);
    const rec = w.recommendations.find((r) => r.title.includes('Evacuate Zones A & B'));
    expect(rec).toBeDefined();
    expect(rec?.band).toBe('critical');
  });

  it('never routes a message back to its own agent', () => {
    const a = runDemo();
    const selfLoops = a.messages.filter((m) => m.from === m.to);
    expect(selfLoops).toEqual([]);
  });

  it('emits exactly one triage signal per high-urgency SOS, routed to resource', () => {
    const w = createInitialWorld();
    let deepZone: ZoneId = 'A';
    let deepTick = 0;
    for (let t = 1; t <= DEMO_TICKS; t++) {
      for (const zone of ['A', 'B', 'C', 'D', 'E', 'F'] as ZoneId[]) {
        if (floodFx(zone, t).depthM >= 1.2) {
          deepZone = zone;
          deepTick = t;
        }
      }
    }
    expect(deepTick).toBeGreaterThan(0);
    const sos = w.sos[0];
    sos.zone = deepZone;
    sos.kind = 'trapped';
    sos.peopleCount = 8;
    sos.status = 'dispatched';
    sos.triageSignalSent = undefined;
    w.sos = [sos];

    const first = runCallPriority(w, deepTick);
    const alerts = first.messages.filter((m) => m.kind.kind === 'sos-alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].to).toBe('resource');
    const alert = alerts[0].kind;
    if (alert.kind !== 'sos-alert') throw new Error('expected an sos-alert payload');
    expect(alert.peopleCount).toBe(8);
    expect(alert.zone).toBe(deepZone);

    const second = runCallPriority(w, deepTick + 1);
    expect(second.messages.filter((m) => m.kind.kind === 'sos-alert')).toHaveLength(0);
  });

  it('opens the shelter on approval', () => {
    let w = createInitialWorld();
    for (let t = 1; t <= 26; t++) w = tickWorld(w);
    const rec = w.recommendations.find((r) => r.title.includes('Evacuate Zones A & B'));
    expect(rec).toBeDefined();
    const shell = w.shelters.find((s) => s.id === 'sh4');
    expect(shell?.openedAtTick).toBe(0);
  });

  it('follows the scripted choreography: bridge, alerts, flooding, determinism', () => {
    const SEVERITY: string[] = ['green', 'yellow', 'orange', 'red', 'purple'];
    const rank = (level: string): number => SEVERITY.indexOf(level);

    let w = createInitialWorld();
    const alerts: string[] = [w.alert];
    for (let t = 1; t <= DEMO_TICKS; t++) {
      w = tickWorld(w);
      alerts.push(w.alert);
    }

    expect(w.timeline.some((e) => e.tick === BRIDGE_COLLAPSE_TICK && e.tag === 'BRIDGE')).toBe(true);
    expect(w.roads.filter((r) => r.kind === 'bridge' && r.damaged).length).toBeGreaterThan(0);

    const ranks = alerts.map((a) => rank(a));
    expect(ranks[0]).toBe(0);
    expect(Math.max(...ranks)).toBe(rank('red'));
    let descended = false;
    let reEscalated = false;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] < ranks[i - 1]) descended = true;
      else if (descended && ranks[i] > ranks[i - 1]) reEscalated = true;
    }
    expect(descended).toBe(true);
    expect(reEscalated).toBe(false);
    const seen = new Set(alerts);
    expect(['yellow', 'orange', 'red'].every((l) => seen.has(l))).toBe(true);

    const w0 = createInitialWorld();
    expect(w0.alert).toBe('green');
    expect(w0.analytics.floodedRoadsKm).toBe(0);
    let wm = createInitialWorld();
    let floodedSeen = false;
    for (let t = 1; t <= DEMO_TICKS; t++) {
      wm = tickWorld(wm);
      if (wm.analytics.floodedRoadsKm > 0) floodedSeen = true;
    }
    expect(floodedSeen).toBe(true);

    expect(runDemo()).toEqual(runDemo());
  });

  it('evacuation waves clear the zones after the commander approves', () => {
    let w = createInitialWorld();
    for (let t = 1; t <= 26; t++) w = tickWorld(w);
    const rec = w.recommendations.find((r) => r.title.includes('Evacuate Zones A & B'));
    if (!rec) throw new Error('missing Evacuate recommendation');
    executeRecommendation(w, rec, 'commander');
    for (let t = 27; t <= DEMO_TICKS; t++) w = tickWorld(w);
    expect(w.evacuatedCount).toBeGreaterThan(0);
    expect(w.zones.find((z) => z.id === 'A')?.evacDone).toBe(true);
    expect(w.analytics.savedEstimate).toBeGreaterThan(0);
  });
});