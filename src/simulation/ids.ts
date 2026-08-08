// Deterministic id generation — ids are pure functions of tick, no counters.

import type { AgentId } from '@/types';

export function nextRouteId(tick: number): string {
  return `route-${tick}`;
}

export function nextMessageId(tick: number, from: AgentId, seq: number): string {
  return `msg-${tick}-${from}-${seq}`;
}

export function nextRecommendationId(tick: number, seq: number): string {
  return `rec-${tick}-${seq}`;
}