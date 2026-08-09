// Structural Assessment Agent — reads damage metrics and recommends the
// engineering / closure posture for shake and wind scenarios.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factor = (note: string, weight: number): Factor[] => [{ agent: 'structural', note, weight }];

export function runStructural(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const m = world.hazardMetrics;

  if (world.hazard === 'earthquake') {
    if (tick === 9) {
      out.messages.push({
        to: 'call-priority',
        kind: { kind: 'capacity', facility: 'Zone C towers', pct: m.buildingsDamaged ?? 0, near: ['C', 'D'] },
        confidence: 82,
        why: 'Pilot inspection + drone ortho pairs quantify damage share.',
      });
      out.recommendations.push({
        id: `rec-${tick}-closure`,
        title: 'Close 3 at-risk arteries around Zone C',
        band: 'high',
        confidence: 76,
        reasons: ['Girder displacement seen on 2 of 3 entries into core', 'Reduce debris fall-through onto responders'],
        factors: factor('Masonry damage share 40% in grid row C4', 0.35),
        actions: [
          { kind: 'close-road', target: 'Ring Road West', detail: 'Temporary closure until inspection' },
          { kind: 'close-road', target: 'Delta Approach', detail: 'Temporary closure until inspection' },
        ],
        status: 'pending',
        createdAtTick: tick,
        approvedAtTick: -1,
      });
    }
    if (tick === 18) {
      out.messages.push({
        to: 'call-priority',
        kind: { kind: 'sos-alert', sosId: 'struct-18', sosKind: 'trapped', zone: 'D', peopleCount: 6, urgency: 9 },
        confidence: 72,
        why: 'Micro-seismic pings correlate with an uncleared floor in Block D-4.',
      });
    }
  }

  if (world.hazard === 'tornado') {
    if (tick === 10) {
      out.messages.push({
        to: 'evacuation',
        kind: { kind: 'hazard', hitId: 'tor-10', label: 'Warehouse roof failure — flying debris risk' },
        confidence: 78,
        why: 'Wind load exceeded design envelope on low-rise shells.',
      });
    }
  }

  return out;
}