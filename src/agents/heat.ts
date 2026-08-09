// Heat Resilience Agent — heat index, cooling centers, grid + water stress.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factor = (note: string, weight: number): Factor[] => [{ agent: 'heat', note, weight }];

export function runHeat(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const m = world.hazardMetrics;

  if (world.hazard !== 'heatwave') return out;

  if (tick === 4) {
    out.recommendations.push({
      id: `rec-${tick}-cooling`,
      title: 'Open all-city cooling centers + water stations',
      band: 'high',
      confidence: 86,
      reasons: [
        `Heat index ${m.heatIndex ?? 51} °C damp building thermal load`,
        'Overnight recovery < 24 °C in only 40% of blocks',
      ],
      factors: factor('Index model blends WBGT — exceeds 40 °C stat (≥4 readings)', 0.42),
      actions: [
        { kind: 'open-shelter', target: 'Central Library Hub', detail: 'Cooling center — 1200 bays' },
        { kind: 'deploy', target: 'core', detail: 'Water stations along transit spine', deploy: { vehicleKind: 'relief', count: 4 } },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
  }
  if (tick === 10) {
    out.messages.push({
      to: 'call-priority',
      kind: { kind: 'sos', sosId: 'heat-10', zone: 'A', urgency: 7 },
      confidence: 71,
      why: 'Heat-related SOS recur at the same building clusters 3 days running.',
    });
  }
  if (tick === 24) {
    out.messages.push({
      to: 'resource',
      kind: { kind: 'capacity', facility: 'Water stations', pct: m.waterStations ?? 90, near: ['A', 'C', 'D'] },
      confidence: 83,
      why: 'Daily draw 90k; replenishment aligned with tanker pipeline.',
    });
  }
  if (tick === 30) {
    out.messages.push({
      to: 'report',
      kind: { kind: 'sitrep', headline: 'Grid at 103% — staged load sharing to protect life-support' },
      confidence: 77,
      why: 'SMD forecast verified against telemetry across 11 feeders.',
    });
  }

  return out;
}