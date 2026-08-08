// Emergency Call Prioritization Agent — triages every SOS to an urgency 1–10
// with a plain-language reason.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import { floodDepthAt } from '@/simulation/forecast';
import type { SosIncident, WorldState } from '@/types';

export function runCallPriority(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  for (const sos of world.sos) {
    if (sos.status !== 'pending') continue;
    const scored = scoreSos(sos, tick);
    if (scored.urgency !== sos.urgency || scored.reason !== sos.reason) {
      // engine writes score back; here we only emit notable messages
    }
    if (scored.urgency >= 9 && (sos.urgency < 9 || sos.createdAtTick === tick)) {
      out.messages.push({
        to: 'call-priority',
        kind: { kind: 'sos', sosId: sos.id, zone: sos.zone, urgency: scored.urgency },
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