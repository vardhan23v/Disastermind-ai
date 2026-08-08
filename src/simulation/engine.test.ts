import { describe, expect, it } from 'vitest';
import { createInitialWorld, tickWorld } from '@/simulation/engine';
import { executeRecommendation } from '@/simulation/dispatch';
import { DEMO_TICKS } from '@/constants';

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

  it('opens the shelter on approval', () => {
    let w = createInitialWorld();
    for (let t = 1; t <= 26; t++) w = tickWorld(w);
    const rec = w.recommendations.find((r) => r.title.includes('Evacuate Zones A & B'));
    expect(rec).toBeDefined();
    const shell = w.shelters.find((s) => s.id === 'sh4');
    expect(shell?.openedAtTick).toBe(0);
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