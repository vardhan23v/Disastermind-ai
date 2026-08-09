// Marine Safety Agent — tsunami propagation, coastal readiness, port ops.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factor = (note: string, weight: number): Factor[] => [{ agent: 'marine', note, weight }];

export function runMarine(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const m = world.hazardMetrics;

  if (world.hazard !== 'tsunami') return out;

  if (tick === 2) {
    out.recommendations.push({
      id: `rec-${tick}-evac-coast`,
      title: 'Evacuate Zone A coast & port to high ground',
      band: 'high',
      confidence: 92,
      reasons: [
        `Forecast wave ${m.waveHeightM?.toFixed(1) ?? 4.8} m, ETA ${m.etaMin ?? 22} min`,
        'Harbour complete sensors show water receding first',
      ],
      factors: factor('Model calibrated on M7.9 2018 dataset (MAPE 6%)', 0.45),
      actions: [
        { kind: 'evacuate', target: 'A', detail: 'Coastal blocks to elevated shelters' },
        { kind: 'open-shelter', target: 'Hillside Shelter', detail: 'High ground staging' },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
  }
  if (tick === 6) {
    out.messages.push({
      to: 'weather',
      kind: { kind: 'flood', zone: 'A', depthM: m.waveHeightM ?? 4.8, horizonMin: 12, roads: ['Harbour Front', 'Quay Road'] },
      confidence: 90,
      why: 'Deep-water gauge pair crossed 1.5 m trigger on the wave train.',
    });
  }
  if (tick === 9) {
    out.messages.push({
      to: 'evacuation',
      kind: { kind: 'capacity', facility: 'Hillside Shelter', pct: m.evacProgressPct ?? 68, near: ['A'] },
      confidence: 85,
      why: 'Progress pipeline 68% with 11 min runway.',
    });
  }
  if (tick === 20) {
    out.messages.push({
      to: 'report',
      kind: { kind: 'sitrep', headline: 'Waves receding — harbour assessment teams re-entering' },
      confidence: 88,
      why: 'Gauges returned below action level across array.',
    });
  }

  return out;
}