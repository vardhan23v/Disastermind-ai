# DisasterMind AI

> A multi-agent emergency response platform that turns a simulated cyclone landfall into coordinated, explainable emergency decisions.

**[Live Demo](https://disastermind-ai.vercel.app)** • **[GitHub](https://github.com/vardhan23v/Disastermind-ai)** • **Hackathon Submission**

![DisasterMind AI — tactical command center](./public/screenshots/active-cyclone.png)

⚠️ **DEMO SIMULATION** — DisasterMind AI uses synthetic data and a deterministic simulation. It is a hackathon prototype and must not be used for real-world emergency response decisions.

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-4-8B5CF6?style=for-the-badge&logo=zustand&logoColor=white)](https://zustand-demo.pmnd.rs/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Recharts](https://img.shields.io/badge/Recharts-2-22B8CF?style=for-the-badge&logo=recharts&logoColor=white)](https://recharts.org/)
[![Vitest](https://img.shields.io/badge/Vitest-1-72B149?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![jsPDF](https://img.shields.io/badge/jsPDF-2-5B5B5B?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](https://github.com/parallax/jsPDF)

---

## Why DisasterMind AI?

During a disaster, critical information is fragmented across weather feeds, road closures, hospital capacity, emergency calls, shelters, and field responders. Commanders lose minutes stitching it together by hand.

DisasterMind AI creates a **digital twin of the affected city** and lets specialized agents continuously analyze the situation and coordinate response actions.

The system keeps humans in control:

**AI recommends → Commander reviews → Commander approves → City responds.**

---

## Screenshots

| Initial state | Active cyclone |
| --- | --- |
| ![Initial state](./public/screenshots/initial-state.png) | ![Active cyclone](./public/screenshots/active-cyclone.png) |

| Chief AI recommendation | Post-disaster operations |
| --- | --- |
| ![Chief AI recommendation](./public/screenshots/chief-ai-recommendation.png) | ![Post-disaster ops](./public/screenshots/post-disaster-ops.png) |

## Demo

![Demo walkthrough](./docs/demo.gif)

One click starts the whole cascade:

1. **Click "▶ Simulate Cyclone"** — the deterministic mission clock starts at 06:00 with 44 scripted ticks.
2. **Watch the incident unfold live** — rain strengthens, floods spread across the map, roads flood and re-route, SOS calls arrive, and the fleet redeploys on its own.
3. **Close the loop** — Chief AI recommends evacuation and boats; the commander approves; shelters open; a final SITREP is generated for download.

---

## The 10 Agents

A deterministic multi-agent simulation architecture designed for **explainable and reproducible** emergency decision support. Each agent is a pure, independently replaceable decision module over the shared world state.

| Agent | Responsibility |
| --- | --- |
| Weather | Rainfall, wind & cyclone intelligence |
| Flood | Flood spread & road prediction |
| Resources | Hospital & emergency capacity pressure |
| Evacuation | Dynamic emergency routing & logistics |
| Satellite | Damage detection from space |
| Social | Crowd-sourced incident intelligence |
| Call Priority | SOS triage & escalation |
| Shelter | Shelter recommendation & occupancy |
| Chief AI | Decision support & commander briefing |
| Government SITREP | Automated report generation |

The current prototype uses deterministic agent policies so the entire demo is repeatable. The architecture allows any agent to be individually swapped for a live AI/ML model without touching the rest of the system.

---

## Demo Story — 2-Minute Walkthrough

1. 🟡 Cyclone detected offshore
2. 🌧️ Rainfall intensifies
3. 🌊 Flood zones expand on the map
4. 🚨 SOS incidents rise as citizens report
5. 🛣️ Roads get blocked; emergency routes recalculate
6. 🚑 Fleet automatically redeploys
7. 🏥 Hospital capacity approaches critical
8. 🧠 Chief AI recommends mass evacuation
9. 👤 Commander approves the recommendation
10. 🚑 Ambulances, boats & relief trucks dispatch
11. 🏠 Shelter occupancy rises
12. 📋 Automated SITREP is generated for authorities

---

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 18 + TypeScript 5 |
| Build | Vite 5 |
| State | Zustand |
| Map | Leaflet + custom SVG overlay |
| Charts | Recharts |
| Reporting | jsPDF + autotable |
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

Data flows one way, end to end:

```
world data ──► agents ──► event bus ──► chief AI ──► dispatch ──► map · feed · analytics
```

In practice the loop is a single authoritative clock:

```
setInterval → simulationStore(tickWorld) → WorldState
                                              │
              ┌──────────────┬───────────────┤
              │              │               │
        agent modules   dispatch engine   mission/analytics
              │              │               │
              └──────────────┴───────────────┘
                                              │
                       React features (map, ops, feed, timeline)
```

### Simulation core — `src/simulation/`

- `engine.ts` — pure, total state transition functions (`createInitialWorld`, `tickWorld`). No I/O, no time dependency; the entire scenario is deterministic and reproducible.
- `dispatch.ts` — vessel / vehicle routing over a hand-written road graph, with pacing calibrated to simulated speed.
- `forecast.ts`, `roadGraph.ts`, `sitrep.ts`, `ids.ts` — hazard progression, pathfinding, situation-report aggregation, stable IDs.
- `engine.test.ts` — contract tests over the tick pipeline.

The clock lives in `src/store/simulationStore.ts`: a `setInterval` scaled by simulation speed (up to 4×), the single authoritative driver for every screen.

### Agents — `src/agents/`

Pure decision functions (no React) that turn world state into agency-specific intelligence. Each module is independently replaceable and fault-injectable.

### Features — `src/features/`

- `map/MapView.tsx` — Leaflet base + SVG overlay for zones, flood, fleet, and labels. Screen-space clustering, hover tooltips, toggleable layers (`PRIMARY_LAYERS` / `EXTRA_LAYERS`).
- `ops/OpsColumn.tsx` — agent feed, commander brief, mission control (SOS / resources / hospitals / shelters).
- `chrono/` — mission clock, phase control, pause/reset, speed, and the forecast timeline scrubber.
- `analytics/` & `sitrep/` — charts and an executive situation report with PDF export.

### Data — `src/data/`

`city.ts` (geometry, zones, road graph), `resources.ts` (hospitals, shelters, stations, fleet), `corpus.ts` (localized reports). All synthetic.

---

## Deployment

- **Live**: https://disastermind-ai.vercel.app (Vite build, `dist/`, auto-deployed via `vercel --prod`).
- **CI**: a GitHub Actions workflow runs `lint`, `test`, and `build` on every push.

---

Made with ❤️‍🩹 by [vardhan](https://github.com/vardhan23v)