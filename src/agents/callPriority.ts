// Emergency Call Prioritization Agent — triages every SOS to an urgency 1–10
// with a plain-language reason.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import { floodDepthAt } from '@/simulation/forecast';
import type { SosIncident, WorldState } from '@/types';

export function runCallPriority(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  for (const sos of world.sos) {
    if (sos.status === 'resolved') continue;
    if (sos.triageSignalSent) continue;
    const scored = scoreSos(sos, tick);
    if (scored.urgency >= 9) {
      sos.triageSignalSent = true;
      out.messages.push({
        to: 'resource',
        kind: {
          kind: 'sos-alert',
          sosId: sos.id,
          sosKind: sos.kind,
          zone: sos.zone,
          peopleCount: sos.peopleCount,
          urgency: scored.urgency,
        },
        confidence: Math.round(80 + scored.urgency),
        why: scored.reason,
      });
    }
  }

  return out;
}

export function scoreSos(sos: SosIncident, tick: number): { urgency: number; reason: string } {
  const depth = floodDepthAt(sos.zone, tick);
  let score = 1;

  switch (sos.kind) {
    case 'trapped':
      score += 6;
      break;
    case 'medical':
      score += 5;
      break;
    case 'fire':
      score += 5;
      break;
    case 'food':
      score += 3;
      break;
    case 'infrastructure':
      score += 2;
      break;
  }

  if (depth >= 1.2) score += 2;
  else if (depth >= 0.5) score += 1;

  if (sos.peopleCount >= 8) score += 1;
  if (sos.kind === 'trapped' && sos.peopleCount >= 4) score += 1;

  const urgency = Math.max(1, Math.min(10, score));

  const depthNote = depth >= 1.2 ? ', water rising fast' : depth >= 0.5 ? ', water rising' : '';
  const peopleNote = sos.peopleCount >= 8 ? `, ${sos.peopleCount} people` : '';
  return {
    urgency,
    reason: `${sos.description}${peopleNote}${depthNote}`,
  };
}