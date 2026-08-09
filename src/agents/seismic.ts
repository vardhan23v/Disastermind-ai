// Seismology & Geodetic Agent — earthquake / volcano scenarios. Purely
// scripted + metric-driven; deterministic.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factors = (note: string, weight: number): Factor[] => [
  { agent: 'seismic', note, weight },
];

export function runSeismic(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const m = world.hazardMetrics;

  if (world.hazard === 'earthquake') {
    if (tick === 1) {
      out.messages.push({
        to: 'decision-support',
        kind: { kind: 'weather', headline: `M${m.magnitude?.toFixed(1) ?? 6.8} event — location ${m.depthKm ?? 12} km depth`, zone: 'C' },
        confidence: 96,
        why: 'P-wave first-motion location converged; depth from depth-phase pair.',
      });
    }
    if (tick === 6) {
      out.recommendations.push({
        id: `rec-${tick}-collapse`,
        title: 'Activate Search & Rescue in Zone C & D',
        band: 'critical',
        confidence: 89,
        reasons: [
          `${m.buildingsDamaged ?? 0} buildings damaged in shake footprint`,
          'Reports of entrapment inside Zone C towers',
        ],
        factors: factors('Intensity rings MMI VI+ overlap 62% of Zone C', 0.4),
        actions: [
          { kind: 'deploy', target: 'zones', detail: 'SAR teams to Zone C & D quadrant', deploy: { vehicleKind: 'ambulance', count: 6 } },
          { kind: 'alert', target: 'orange', detail: 'Structural collapse risk elevated' },
        ],
        status: 'pending',
        createdAtTick: tick,
        approvedAtTick: -1,
      });
    }
    if (tick === 12) {
      out.messages.push({
        to: 'evacuation',
        kind: { kind: 'sos-alert', sosId: 'eq-12', sosKind: 'trapped', zone: 'C', peopleCount: 14, urgency: 10 },
        confidence: 84,
        why: 'Acoustic + thermal signature consistent with trapped survivors under debris.',
      });
    }
    if (tick === 20) {
      out.messages.push({
        to: 'call-priority',
        kind: { kind: 'capacity', facility: 'blocked-roads', pct: 100, near: ['C', 'D'] },
        confidence: 81,
        why: 'Road graph now disconnected at 3 nodes; detour graph ready.',
      });
    }
    if (tick === 28) {
      out.messages.push({
        to: 'report',
        kind: { kind: 'sitrep', headline: `Recovery: damage assessment ${m.buildingsDamaged ?? 0} structures` },
        confidence: 74,
        why: 'Overpass and aerial imagery triage stable since T+20.',
      });
    }
  }

  if (world.hazard === 'volcano') {
    if (tick === 3) {
out.messages.push({
        to: 'decision-support',
        kind: { kind: 'weather', headline: `VEI ${m.vei ?? 3} explosive column ${m.ashColumnKm ?? 3.1} km`, zone: 'E' },
        confidence: 95,
        why: 'Colour-controlled ash dispersion model run at 4 km/h storm drift.',
      });
      out.recommendations.push({
        id: `rec-${tick}-vent`,
        title: 'Mandatory evacuation of Zone E foothills',
        band: 'critical',
        confidence: 90,
        reasons: [
          'Exclusion zone extends 2.1 km from vent',
          'Ash column headed into Zone E residential band',
        ],
        factors: factors('Vent now 4.9 km from Zone E centre at bearing 230°', 0.5),
        actions: [
          { kind: 'evacuate', target: 'E', detail: 'Bahri hills to port-side shelters' },
          { kind: 'open-shelter', target: 'Harbour Point Shelter', detail: 'Open additional 600-bay wing' },
          { kind: 'deploy', target: 'E', detail: 'Shuttle convoys along cleared ridge road', deploy: { vehicleKind: 'relief', count: 8 } },
        ],
        status: 'pending',
        createdAtTick: 0,
        approvedAtTick: -1,
      });
    }
    if (tick === 22) {
      out.messages.push({
        to: 'shelter',
        kind: { kind: 'capacity', facility: 'Airport apron', pct: m.ashDensity ?? 2, near: ['E'] },
        confidence: 78,
        why: 'ADSB density + ashfall gauge 2 cm and clogging runways.',
      });
    }
  }

  return out;
}