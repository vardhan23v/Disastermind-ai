// Drought Warden Agent — reservoir states, rationing, tanker logistics.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factor = (note: string, weight: number): Factor[] => [{ agent: 'drought', note, weight }];

export function runDrought(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const m = world.hazardMetrics;

  if (world.hazard !== 'drought') return out;

  if (tick === 5) {
    out.recommendations.push({
      id: `rec-${tick}-ration`,
      title: 'Enact weekday water rationing for Zone A & B',
      band: 'critical',
      confidence: 82,
      reasons: ['Reservoir drawdown crossing 40%', 'Demand outpacing re-supply'],
      factors: factor('Ootha dam inflow collapse vs climatology', 0.5),
      actions: [{ kind: 'alert', target: 'orange', detail: 'Reservoir < 40%' }],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
  }
  if (tick === 12) {
    out.messages.push({
      to: 'resource',
      kind: { kind: 'capacity', facility: 'Ootha dam', pct: m.reservoirLevel ?? 34, near: ['A', 'B'] },
      confidence: 79,
      why: 'Refill projection 18% by wet season; rationing needed.',
    });
  }
  if (tick === 20) {
    out.messages.push({
      to: 'call-priority',
      kind: { kind: 'sos', sosId: 'drought-20', zone: 'B', urgency: 5 },
      confidence: 68,
      why: 'Roof-tank draw inbox + clinic pickup requests spike.',
    });
  }
  if (tick === 30) {
    out.messages.push({
      to: 'report',
      kind: { kind: 'sitrep', headline: 'Tankers at 4·xO from standpipe grid sectors' },
      confidence: 75,
      why: '211 deliveries completed; queue tail ~90 min.',
    });
  }

  return out;
}