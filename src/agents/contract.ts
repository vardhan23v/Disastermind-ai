// Agent contract: every agent is a pure function of (world, tick).
// It returns messages and recommendations; the engine stamps ids.

import type { AgentMessage, AgentMessageKind, Recommendation, RoutePlan, WorldState } from '@/types';

export interface AgentDraft {
  to?: AgentMessage['to'];
  kind: AgentMessageKind;
  confidence: number;
  why: string;
}

export interface AgentResult {
  messages: AgentDraft[];
  recommendations: Recommendation[];
  routes?: RoutePlan[];
}

export type Agent = (world: WorldState, tick: number) => AgentResult;

export const emptyResult = (): AgentResult => ({ messages: [], recommendations: [] });