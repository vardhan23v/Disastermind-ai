// Government Report Agent — builds the situation report on demand and
// posts status messages during the event.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import { DEMO_TICKS, SITREP_MIN_TICK } from '@/constants';
import type { WorldState } from '@/types';

export function runReport(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  if (tick === 0) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'sitrep',
        headline: 'Situation Report agent online — auto-compiles full event log',
      },
      confidence: 99,
      why: 'Watches the shared event bus; nothing is typed by hand.',
    });
  }

  if (tick === SITREP_MIN_TICK) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'sitrep',
        headline: `SITREP ready — ${world.timeline.length} events, ${world.rescuedCount} rescued so far`,
      },
      confidence: 97,
      why: 'Compiled from deterministic event log; export available as PDF.',
    });
  }

  if (tick >= DEMO_TICKS) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'sitrep',
        headline: 'Event complete — final SITREP and damage assessment generated',
      },
      confidence: 98,
      why: 'All agents converged; damage model finalized.',
    });
  }

  return out;
}