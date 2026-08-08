import { describe, expect, it } from 'vitest';
import { groupConsecutive } from '@/utils/feedGrouping';
import type { AgentMessage, AgentId, AgentMessageKind } from '@/types';

function msg(from: AgentId, to: AgentId, category: AgentMessageKind['kind'], seq: string): AgentMessage {
  return {
    id: seq,
    from,
    to,
    kind: (() => {
      switch (category) {
        case 'sos':
          return { kind: 'sos', sosId: seq, zone: 'A', urgency: 7 } as const;
        case 'weather':
          return { kind: 'weather', headline: seq, zone: 'A' } as const;
        default:
          return { kind: 'rec', recId: seq } as const;
      }
    })(),
    confidence: 80,
    why: '',
    tick: 0,
  };
}

describe('groupConsecutive', () => {
  it('collapses runs sharing from/to/category into batches', () => {
    const m = [
      msg('weather', 'flood', 'weather', 'w1'),
      msg('weather', 'flood', 'weather', 'w2'),
      msg('weather', 'flood', 'weather', 'w3'),
    ];
    expect(groupConsecutive(m)).toHaveLength(1);
    expect(groupConsecutive(m)[0]).toHaveLength(3);
  });

  it('breaks groups when sender, recipient or category changes', () => {
    const m = [
      msg('weather', 'flood', 'weather', 'w1'),
      msg('weather', 'flood', 'weather', 'w2'),
      msg('flood', 'resource', 'weather', 'f1'),
      msg('weather', 'flood', 'sos', 's1'),
      msg('weather', 'flood', 'weather', 'w3'),
    ];
    const g = groupConsecutive(m);
    expect(g.map((x) => x.length)).toEqual([2, 1, 1, 1]);
  });

  it('returns an empty list for no messages', () => {
    expect(groupConsecutive([])).toEqual([]);
  });
});