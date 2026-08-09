import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

// Leaflet needs a DOM/window at import time; the real map only works in the
// browser, so the tests stub the leaflet surface for SSR renders.
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
import { SimBar } from '@/features/chrono/SimBar';
import { TimelineZone } from '@/features/chrono/TimelineZone';
import { MapView } from '@/features/map/MapView';
import { AnalyticsBar } from '@/features/analytics/AnalyticsBar';
import { Rail } from '@/features/rail/Rail';
import { AgentFeed } from '@/features/feed/AgentFeed';
import { MissionPanel } from '@/features/mission/MissionPanel';
import { ChiefPanel } from '@/features/chief/ChiefPanel';
import { CitizenPortal } from '@/features/citizen/CitizenPortal';
import { SitrepPanel } from '@/features/sitrep/SitrepPanel';
import { useSimulation } from '@/store/simulationStore';

describe('app shell', () => {
  it('renders the full mission-control tree without crashing', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Disaster');
    expect(html).toContain('Simulate');
    expect(html).toContain('Tropical Cyclone');
    expect(html).toContain('SIMULATION / DEMO');
    expect(html).toContain('Citizen App');
    expect(html).toContain('NORMAL');
    expect(html).toContain('06:00');
    expect(html).toMatch(/ZONE\s*<!-- -->A/);
    expect(html).toContain('Agent bus silent');
  });
});

describe('feature components', () => {
  it('SimBar renders transport controls and clock', () => {
    const html = renderToString(<SimBar />);
    expect(html).toContain('Simulate');
    expect(html).toContain('Tropical Cyclone');
    expect(html).toContain('06:00');
  });

  it('TimelineZone renders the scrubber markers', () => {
    const html = renderToString(<TimelineZone />);
    expect(html).toContain('−24h');
    expect(html).toContain('+6h');
  });

  it('MapView renders SVG map with zone labels', () => {
    const html = renderToString(<MapView />);
    expect(html).toContain('<svg');
    expect(html).toMatch(/ZONE\s*<!-- -->[A-F]/);
    expect(html).toContain('Zoom in');
  });

  it('AnalyticsBar renders river line chart at t=0', () => {
    const html = renderToString(<AnalyticsBar />);
    expect(html).toContain('Hospital load');
    expect(html).toContain('Active units');
  });

  it('Rail renders all four tabs', () => {
    const html = renderToString(<Rail />);
    expect(html).toContain('AGENTS');
    expect(html).toContain('MISSION');
    expect(html).toContain('CHIEF AI');
    expect(html).toContain('SITREP');
  });

  it('AgentFeed renders empty-state when silent', () => {
    const html = renderToString(<AgentFeed />);
    expect(html).toContain('Agent bus silent');
  });

  it('MissionPanel renders the initial SOS queue at t=0', () => {
    const html = renderToString(<MissionPanel />);
    expect(html).toContain('SOS Queue (2)');
    expect(html).toContain('Dispatch');
  });

  it('ChiefPanel renders empty-state at t=0', () => {
    const html = renderToString(<ChiefPanel />);
    expect(html).toContain('No recommendations');
  });

  it('CitizenPortal is closed by default', () => {
    const html = renderToString(<CitizenPortal />);
    expect(html).not.toContain('Report Emergency');
  });

  it('SitrepPanel shows the locked empty-state before tick 40', () => {
    const html = renderToString(<SitrepPanel />);
    expect(html).toContain('available after tick');
  });
});

describe('store engine', () => {
  it('starts at tick 0 with a silent agent bus', () => {
    expect(useSimulation.getState().world.tick).toBe(0);
    expect(useSimulation.getState().world.messages.length).toBe(0);
    expect(useSimulation.getState().ui.portalOpen).toBe(false);
  });

  it('reset() restores the pristine demo state', () => {
    useSimulation.getState().setTimelineOffset(120);
    useSimulation.getState().toggleLayer('flood');
    useSimulation.getState().setTab('mission');
    useSimulation.getState().reset();
    const s = useSimulation.getState();
    expect(s.ui.timelineOffsetTick).toBe(0);
    expect(s.ui.layers.flood).toBe(true);
    expect(s.ui.tab).toBe('agents');
  });
});