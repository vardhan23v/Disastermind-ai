// Consecutive grouping for the agent feed — collapses runs of messages that
// share the same sender, recipient and kind category into expandable batches.

import type { AgentMessage } from '@/types';

export type FeedGroup = AgentMessage[];

export function groupConsecutive(messages: AgentMessage[]): FeedGroup[] {
  const out: FeedGroup[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && sameCategory(last[0], m)) last.push(m);
    else out.push([m]);
  }
  return out;
}

function sameCategory(a: AgentMessage, b: AgentMessage): boolean {
  return a.from === b.from && a.to === b.to && a.kind.kind === b.kind.kind;
}