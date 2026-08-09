import { create } from 'zustand';
import {
  DEFAULT_LAYERS,
  DEMO_TICKS,
  SITREP_MIN_TICK,
  TICK_INTERVAL_MS,
} from '@/constants';
import type { HazardId, LayerKey, SpeedMult, Toast, UiState, WorldState } from '@/types';
import { createInitialWorld, tickWorld } from '@/simulation/engine';
import { buildSitrep } from '@/simulation/sitrep';
import { dispatchNearestToSos, executeRecommendation } from '@/simulation/dispatch';
import { scoreSos } from '@/agents/callPriority';
import { scenarioFor } from '@/hazards/registry';
import { hazardDefOf } from '@/hazards/definitions';
import { tickHazardWorld } from '@/hazards/runner';

export interface SimStore {
  world: WorldState;
  ui: UiState;
  speed: SpeedMult;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setHazard: (hazard: HazardId) => void;
  setSpeed: (speed: SpeedMult) => void;
  setTab: (tab: UiState['tab']) => void;
  toggleLayer: (key: LayerKey) => void;
  setTimelineOffset: (offsetTick: number) => void;
  approveRecommendation: (id: string) => void;
  dispatchSos: (sosId: string) => void;
  sendCitizenSos: () => void;
  setPortalOpen: (open: boolean) => void;
  generateSitrep: () => void;
  dismissToast: (id: string) => void;
}

let intervalId: number | null = null;

function clearTimer(): void {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

const freshWorld = (hazard: HazardId = 'cyclone'): WorldState => {
  const w = createInitialWorld();
  w.hazard = hazard;
  const scenario = scenarioFor(hazard);
  if (scenario) scenario.seedWorld(w);
  return w;
};

/** Number of ticks a hazard runs before auto-stopping. */
const runTicks = (hazard: HazardId): number => {
  const scenario = scenarioFor(hazard);
  return scenario ? scenario.definition.durationTicks : DEMO_TICKS;
};

const initialUi = (): UiState => ({
  layers: { ...DEFAULT_LAYERS },
  tab: 'agents',
  timelineOffsetTick: 0,
  toasts: [],
  portalOpen: false,
  sitrep: null,
});

export const useSimulation = create<SimStore>()((set, get) => ({
  world: freshWorld(),
  ui: initialUi(),
  speed: 1,

  start: () => {
    const s = get();
    const maxTicks = runTicks(s.world.hazard);
    if (s.world.tick >= maxTicks) return;
    clearTimer();
    set({ world: { ...s.world, running: true } });
    const step = () => {
      const st = get();
      if (st.world.tick >= maxTicks) {
        clearTimer();
        set({ world: { ...st.world, running: false } });
        return;
      }
      const scenario = scenarioFor(st.world.hazard);
      const next = scenario ? tickHazardWorld(st.world, scenario) : tickWorld(st.world);
      const toasts: Toast[] = [];
      for (const e of next.timeline) {
        if (e.tick === next.tick && (e.severity === 'warning' || e.severity === 'critical')) {
          toasts.push({ id: `t-${next.tick}-${e.tag}`, text: e.text, kind: 'warn' });
        }
      }
      set({
        world: { ...next, running: true },
        ui: { ...st.ui, toasts: [...st.ui.toasts.slice(-3), ...toasts] },
      });
    };
    intervalId = window.setInterval(step, TICK_INTERVAL_MS / get().speed);
  },

  pause: () => {
    clearTimer();
    const s = get();
    set({ world: { ...s.world, running: false } });
  },

  reset: () => {
    clearTimer();
    const s = get();
    set({ world: freshWorld(s.world.hazard), ui: initialUi() });
  },

  setHazard: (hazard) => {
    clearTimer();
    const layers = { ...DEFAULT_LAYERS };
    for (const l of hazardDefOf(hazard).layers) layers[l.key] = true;
    set({ world: freshWorld(hazard), ui: { ...initialUi(), layers }, speed: 1 });
  },

  setSpeed: (speed) => {
    set({ speed });
    const st = get();
    if (st.world.running) {
      clearTimer();
      st.start();
    }
  },

  setTab: (tab) => {
    set((s) => ({ ui: { ...s.ui, tab, portalOpen: false } }));
  },

  toggleLayer: (key) => {
    set((s) => ({ ui: { ...s.ui, layers: { ...s.ui.layers, [key]: !s.ui.layers[key] } } }));
  },

  setTimelineOffset: (offsetTick) => {
    set((s) => ({ ui: { ...s.ui, timelineOffsetTick: offsetTick } }));
  },

  approveRecommendation: (id) => {
    const s = get();
    const w = structuredClone(s.world);
    const rec = w.recommendations.find((r) => r.id === id);
    if (!rec || rec.status !== 'pending') return;
    executeRecommendation(w, rec, 'commander');
    set({
      world: w,
      ui: {
        ...s.ui,
        toasts: [
          ...s.ui.toasts.slice(-3),
          { id: `t-app-${id}`, text: `Approved: ${rec.title} — units in motion`, kind: 'success' },
        ],
      },
    });
  },

  dispatchSos: (sosId) => {
    const s = get();
    const w = structuredClone(s.world);
    const sos = w.sos.find((x) => x.id === sosId);
    if (!sos || sos.status !== 'pending') return;
    const result = dispatchNearestToSos(w, sosId);
    if (!result) return;
    set({
      world: w,
      ui: {
        ...s.ui,
        toasts: [
          ...s.ui.toasts.slice(-3),
          {
            id: `t-d-${sosId}`,
            text: `${result.vehicleId} en route — ETA ${Math.round(result.etaMin)} min`,
            kind: 'info',
          },
        ],
      },
    });
  },

  sendCitizenSos: () => {
    const s = get();
    const zone = s.world.zones.find((z) => z.id === 'A') ?? s.world.zones[0];
    const id = `user-sos-${s.world.tick}`;
    const sos = {
      id,
      pos: { x: zone.center.x + 300, y: zone.center.y + 300 },
      zone: zone.id,
      kind: 'trapped' as const,
      description: 'I am stuck on my rooftop — water rising fast',
      peopleCount: 5,
      urgency: 1,
      reason: '',
      createdAtTick: s.world.tick,
      status: 'pending' as const,
      source: 'citizen' as const,
    };
    const scored = scoreSos(sos, s.world.tick);
    sos.urgency = scored.urgency;
    sos.reason = scored.reason;
    set({
      world: { ...s.world, sos: [...s.world.sos, sos] },
      ui: {
        ...s.ui,
        toasts: [
          ...s.ui.toasts.slice(-3),
          {
            id: `t-sos-${id}`,
            text: `SOS received — urgency ${sos.urgency}/10 · ${sos.description}`,
            kind: 'critical',
          },
        ],
      },
    });
  },

  setPortalOpen: (open) => {
    set((s) => ({ ui: { ...s.ui, portalOpen: open } }));
  },

  generateSitrep: () => {
    const s = get();
    if (s.world.tick < SITREP_MIN_TICK) return;
    set((st) => ({ ui: { ...st.ui, sitrep: buildSitrep(s.world) } }));
  },

  dismissToast: (id) => {
    set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } }));
  },
}));