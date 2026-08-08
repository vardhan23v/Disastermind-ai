# DisasterMind AI

An emergency operations center (EOC) digital-twin dashboard for a synthetic coastal city, built as a client-side simulation of a cyclone landfall response. It renders a live tactical map alongside an operations column — agencies, assets, and incidents all move in a deterministic, tick-driven world.

**Live demo:** https://disastermind-ai.vercel.app

## Overview

DisasterMind AI simulates the hours around a severe cyclonic storm making landfall near a city. The simulation advances in fixed ticks (one tick = 5 simulated minutes), and a set of decision agents transform the raw world state into operational intelligence: dispatch decisions, fleet movement, shelter occupancy, resource pressure, hazard forecasts, and bilingual citizen reports.

The product surfaces that intelligence in three layers:

- **Tactical map** — Leaflet base with an SVG overlay: hospitals, shelters, SOS incidents, fleet assets, flood extent, blocked roads, and emergency routes, with screen-space clustering at low zoom and enriched hover tooltips.
- **Ops column** — an agent collaboration feed, a chief-of-staff briefing panel, and a mission-control board with dispatch queues and resource telemetry.
- **Chronology strip** — simulation phase control (pause, speed, phase scrubbing) plus engagement analytics.

Everything runs in the browser; there is no backend.

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 18 + TypeScript 5 |
| Build | Vite 5 |
| State | Zustand |
| Map | Leaflet + custom SVG overlay |
| Charts | Recharts |
| Docs / PDF | jsPDF + autotable |
| Testing | Vitest |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm test         # unit + component tests (vitest)
npm run lint     # eslint, zero warnings tolerated
npm run build    # tsc typecheck + vite production build
npm run preview  # serve the production build locally
```

## Architecture

The data flow is a deliberate unidirectional loop:

```
setInterval → simulationStore(tickWorld) → WorldState
                                              │
              ┌──────────────┬───────────────┤
              │              │               │
        agent modules   dispatch engine   mission/analytics
              │              │               │
              └──────────────┴───────────────┘
                                              │
                       React features (map, ops, sitrep, timeline)
```

### Simulation core — `src/simulation/`

- `engine.ts` — pure, total state transition functions (`createInitialWorld`, `tickWorld`). No I/O, no time dependence; the whole scenario is deterministic and reproducible from a seed.
- `dispatch.ts` — unit / vehicle routing against a hand-authored road graph, with pacing calibrated to simulated speed.
- `forecast.ts`, `roadGraph.ts`, `sitrep.ts`, `ids.ts` — hazard progression, pathfinding, situation-report aggregation, and stable ID generation.
- `engine.test.ts` — contract tests over the tick pipeline.

The clock lives in `src/store/simulationStore.ts`: a `setInterval` scaled by simulation speed (e.g. 30x), the authoritative driver for all UI.

### Agent modules — `src/agents/`

Pure decision functions (no React) that interpret world state per agency: weather, flood, satellite, social, call priority, shelter, evacuation, resources, and decision support. Each module is independently replaceable/fault-injectable, which keeps the scenario legible and testable.

### Features — `src/features/`

- `map/MapView.tsx` — Leaflet base with a `preserveAspectRatio="none"` SVG overlay for zones, flood, vehicles, and dynamic labels. Screen-space clustering; hover tooltips; toggleable layer set driven by `src/constants.ts` (`PRIMARY_LAYERS` / `EXTRA_LAYERS`).
- `ops/OpsColumn.tsx` — agent feed, chief brief, and mission control (SOS / resources / hospitals / shelters).
- `chrono/` — `SimBar` (phase, trend, aux-task toggles) and `TimelineZone`.
- `sitrep/` — executive situation report with PDF export.
- `analytics/` — time-series charts fed by the same store slices as the map (single source of truth).

### Authoritative data — `src/data/`

`city.ts` (geometries, zones, road graph), `resources.ts` (hospitals, shelters, stations, fleet), `corpus.ts` (localized report corpus). All synthetic.

## Deploying

CI-free, two paths:

- **Vercel**: `vercel --prod` (project already linked; Vite framework auto-detected — build `vite build`, output `dist`).
- **GitHub**: create the repo, push `main`, and connect the Vercel project to the repository for automatic deployments on push. This repo ships with `sourcemap: true` for debugging production builds.

Push to `main`, then either re-run `vercel --prod` or rely on the Git integration.

## Repository layout

```
src/
  agents/        agency decision logic (pure)
  data/          synthetic city, fleet, corpus
  features/      map, ops, chrono, analytics, sitrep, feed, citizen
  simulation/    engine, dispatch, forecast, road graph, sitrep
  store/         zustand store — the ticking heartbeat
  styles/        global.css (the design system)
  types/         shared domain types
```