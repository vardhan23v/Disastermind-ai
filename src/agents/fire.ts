// Fire Behaviour Agent — wildfire perimeter spread, air ops, containment.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factor = (note: string, weight: number): Factor[] => [{ agent: 'fire', note, weight }];

export function runFire(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const m = world.hazardMetrics;

  if (world.hazard !== 'wildfire') return out;

  if (tick === 4) {
    out.recommendations.push({
      id: `rec-${tick}-fire-line`,
      title: 'Containment line north of Zone E settlements',
      band: 'high',
      confidence: 84,
      reasons: [
        `Perimeter growing ${m.spreadRate?.toFixed(1) ?? 1.8} km²/hr`,
        'Wind forecast hold northeast at 30/km/h until evening',
      ],
      factors: factor('Rothermel rate-of-spread tuned to grassland/scrub fuels', 0.4),
      actions: [
        { kind: 'deploy', target: 'E', detail: 'Combined ground pack on the north flank', deploy: { vehicleKind: 'relief', count: 6 } },
        { kind: 'alert', target: 'orange', detail: 'Wildfire advisory for eastern belt' },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
  }
  if (tick === 10) {
    out.messages.push({
      to: 'evacuation',
      kind: { kind: 'sos-alert', sosId: 'fire-10', sosKind: 'trapped', zone: 'E', peopleCount: 12, urgency: 9 },
      confidence: 77,
      why: 'Smoke-plume heat signature south flank — 2 households cut off.',
    });
  }
  if (tick === 16) {
    out.messages.push({
      to: 'call-priority',
      kind: { kind: 'capacity', facility: 'Evac buses', pct: 100, near: ['E', 'F'] },
      confidence: 74,
      why: 'Transport demand exceeds scheduled fleet at peak window.',
    });
  }
  if (tick === 24) {
    out.messages.push({
      to: 'resource',
      kind: { kind: 'hazard', hitId: 'air-24', label: 'Aerial retardant drop completed on east head' },
      confidence: 70,
      why: 'Drop ~0.8 L/m² on the 2.1 km head; re-pass planned T+30.',
    });
  }

  return out;
}