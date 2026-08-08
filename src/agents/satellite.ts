// Satellite Vision Agent — converts scripted hazard events into geolocated
// change-detection hits with bounding boxes and confidence.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

export function runSatellite(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  const fresh = world.hits.filter((h) => h.createdAtTick === tick);
  for (const hit of fresh) {
    out.messages.push({
      to: 'evacuation',
      kind: { kind: 'hazard', hitId: hit.id, label: hit.label },
      confidence: hit.confidence,
      why: `Pre/post scene diff (SAR + optical) classified as ${hit.kind}; false-positive rate < 4%.`,
    });
  }

  if (tick === 36) {
    const bridge = world.roads.find((r) => r.name === 'Delta Bridge');
    if (bridge) {
      out.messages.push({
        to: 'evacuation',
        kind: {
          kind: 'hazard',
          hitId: 'sat-36',
          label: 'Delta Bridge collapse detected — span shifted 14 m',
        },
        confidence: 91,
        why: 'Structural displacement exceeded 3 m threshold on optical strip pair.',
      });
    }
  }

  if (tick === 31) {
    out.messages.push({
      to: 'call-priority',
      kind: { kind: 'hazard', hitId: 'sat-31', label: 'Thermal anomaly at Airport Spur transformer yard' },
      confidence: 67,
      why: 'Thermal band hot spot; cloud cover limited optical confirmation.',
    });
  }

  return out;
}