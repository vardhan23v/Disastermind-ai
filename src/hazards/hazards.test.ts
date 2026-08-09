// Hazard scenarios must be fully deterministic: two runs with the same
// seed/tick sequence produce byte-identical worlds, and every non-cyclone
// scenario is self-consistent through its full duration.

import { describe, expect, it } from 'vitest';
import { createInitialWorld } from '@/simulation/engine';
import { scenarioFor } from '@/hazards/registry';
import { tickHazardWorld } from '@/hazards/runner';
import { HAZARD_DEFS } from '@/hazards/definitions';
import type { HazardId } from '@/types';

const NON_CYCLONE = HAZARD_DEFS.filter((d) => d.id !== 'cyclone').map((d) => d.id as HazardId);

describe('hazard scenarios', () => {
  for (const hazard of NON_CYCLONE) {
    it(`${hazard} runs to completion deterministically`, () => {
      const def = HAZARD_DEFS.find((d) => d.id === hazard)!;
      const scenario = scenarioFor(hazard)!;

      const run = () => {
        let w = createInitialWorld();
        w.hazard = hazard;
        scenario.seedWorld(w);
        for (let t = 1; t <= def.durationTicks; t++) {
          w = tickHazardWorld(w, scenario);
        }
        return w;
      };

      const a = run();
      const b = run();
      expect(a).toEqual(b);

      expect(a.tick).toBe(def.durationTicks);
      expect(a.hazard).toBe(hazard);
      expect(a.timeline.length).toBeGreaterThan(0);
      expect(a.messages.length).toBeGreaterThan(0);
      expect(a.hazardMetrics.magnitude ?? a.hazardMetrics.fireAreaKm2 ?? a.hazardMetrics.temperatureC ?? 1).toBeGreaterThan(0);
    });
  }

  it('cyclone keeps its original engine path intact', () => {
    const scenario = scenarioFor('cyclone');
    expect(scenario).toBeNull();
    const w = createInitialWorld();
    expect(w.hazard).toBe('cyclone');
    expect(w.hazardMetrics.windKmh).toBe(18);
  });

  it('scenario seeds are unique per hazard', () => {
    const seeds = HAZARD_DEFS.map((d) => d.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});
