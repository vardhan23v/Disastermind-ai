import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('leaflet', () => {
  const pane = () => ({ addTo: () => pane(), on: () => pane(), remove: () => {} });
  return {
    default: {
      map: () => ({
        on: () => {},
        off: () => {},
        remove: () => {},
        fitBounds: () => {},
        getBounds: () => ({ contains: () => false }),
        getZoom: () => 9,
        latLngToContainerPoint: () => ({ x: 0, y: 0 }),
      }),
      tileLayer: () => ({ addTo: pane() }),
      svgOverlay: () => ({ addTo: pane() }),
      control: { attribution: () => ({ addTo: pane() }) },
      latLngBounds: () => ({
        contains: () => false,
        getNorth: () => 0,
        getSouth: () => 0,
        getEast: () => 0,
        getWest: () => 0,
      }),
      latLng: () => ({}),
    },
  };
});

import App from '@/App';
import { HAZARD_DEFS } from '@/hazards/definitions';
import { scenarioFor } from '@/hazards/registry';
import { tickHazardWorld } from '@/hazards/runner';
import { tickWorld } from '@/simulation/engine';
import { useSimulation } from '@/store/simulationStore';
import { AGENT_META } from '@/constants';

const steps = (hazard: string): number => {
  const scenario = scenarioFor(hazard as never);
  return Math.min(40, scenario ? scenario.definition.durationTicks : 144);
};

describe('every hazard runs without blanking the app', () => {
  it.each(HAZARD_DEFS.map((d) => d.id))('%s — advance ticks + render App', (hazard) => {
    useSimulation.getState().setHazard(hazard as never);
    const scenario = scenarioFor(hazard as never);
    for (let i = 0; i < steps(hazard); i++) {
      const st = useSimulation.getState();
      const next = scenario ? tickHazardWorld(st.world, scenario) : tickWorld(st.world);
      useSimulation.setState({ world: next });
    }
    const w = useSimulation.getState().world;
    const unknown = [...new Set(w.messages.map((m) => m.from).concat(w.messages.map((m) => m.to)))]
      .filter((id) => !AGENT_META[id]);
    expect(unknown).toEqual([]);
    const html = renderToString(<App />);
    expect(html).toContain('map-wrap');
    expect(html).toContain('Simulate');
    expect(html).not.toBe('');
  });

  it.each(HAZARD_DEFS.map((d) => d.id).filter((id) => id !== 'cyclone'))(
    '%s — scenario.paint never throws across the full run',
    (hazard) => {
      useSimulation.getState().setHazard(hazard as never);
      const scenario = scenarioFor(hazard as never)!;
      for (let i = 0; i < scenario.definition.durationTicks; i++) {
        const st = useSimulation.getState();
        useSimulation.setState({ world: tickHazardWorld(st.world, scenario) });
        const w = useSimulation.getState().world;
        expect(() => scenario.paint(w, w.tick, w.hazardMetrics)).not.toThrow();
      }
    }
  );
});