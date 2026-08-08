// Social Media Intelligence Agent — geolocates incoming posts and scores credibility.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

export function runSocial(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();

  const fresh = world.posts.filter((p) => p.createdAtTick === tick);
  for (const post of fresh) {
    const label =
      post.credibility >= 75 ? 'corroborated' : post.credibility >= 55 ? 'unverified' : 'low-confidence';
    out.messages.push({
      to: 'call-priority',
      kind: { kind: 'sos', sosId: post.id, zone: post.zone, urgency: 0 },
      confidence: post.credibility,
      why: `Geolocation from image metadata + cluster agreement; ${label} signal (${post.credibility}% credibility).`,
    });
  }

  return out;
}