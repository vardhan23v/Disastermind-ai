// Supercell / Tornado Agent — track projection, shelter-in-place prompts.

import type { AgentResult } from '@/agents/contract';
import type { Factor } from '@/types';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

const factor = (note: string, weight: number): Factor[] => [{ agent: 'tornado', note, weight }];

export function runTornado(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  if (world.hazard !== 'tornado') return out;

  if (tick === 1) {
    out.messages.push({
      to: 'decision-support',
      kind: { kind: 'weather', headline: 'Supercell rotation tightening — EF3-capable wedge', zone: 'D' },
      confidence: 88,
      why: 'Vortex signature 60k ft since lead-in couplet.',
    });
  }
  if (tick === 4) {
    out.recommendations.push({
      id: `rec-${tick}-sip`,
      title: 'Shelter-in-place for industrial belt',
      band: 'high',
      confidence: 86,
      reasons: ['EF3 wedge on the ground approaching Zone D', 'Debris bowl forecast 40 min ahead of track'],
      factors: factor('Supercell-track consensus 3/3 models through D', 0.55),
      actions: [
        { kind: 'alert', target: 'red', detail: 'Flying-debris risk across Zone D band' },
        { kind: 'deploy', target: 'D', detail: 'Staging at Storm-safe hub', deploy: { vehicleKind: 'ambulance', count: 4 } },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
  }
  if (tick === 16) {
    out.messages.push({
      to: 'call-priority',
      kind: { kind: 'sos-alert', sosId: 'tor-16', sosKind: 'trapped', zone: 'C', peopleCount: 9, urgency: 10 },
      confidence: 80,
      why: 'Cellular SOS gap cluster aligns with debris bowl footprint.',
    });
  }
  if (tick === 31) {
    out.messages.push({
      to: 'report',
      kind: { kind: 'sitrep', headline: 'All clear — storm surveys begin' },
      confidence: 90,
      why: 'Rotation metrics dropped below vortex threshold.',
    });
  }

  return out;
}