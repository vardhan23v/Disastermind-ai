// Agent Collaboration Feed — the visible multi-agent message stream.
// Consecutive messages from the same agent pair + category collapse into
// expandable groups (+N more). Grouping stays pure in utils/feedGrouping.

import { useMemo, useState } from 'react';
import { AGENT_META } from '@/constants';
import type { AgentId, AgentMessage, SosKind } from '@/types';
import { useSimulation } from '@/store/simulationStore';
import { formatClock } from '@/utils/geo';
import { TICK_MINUTES } from '@/constants';
import { groupConsecutive } from '@/utils/feedGrouping';

const SOS_KIND_LABEL: Record<SosKind, string> = {
  trapped: 'trapped on rooftops',
  medical: 'need medical care',
  fire: 'fire reported',
  food: 'need food support',
  infrastructure: 'report infrastructure damage',
};

export function AgentFeed({ compact }: { compact?: boolean }) {
  const messages = useSimulation((s) => s.world.messages);
  const [filter, setFilter] = useState<AgentId | 'all'>('all');

  const groups = useMemo(() => {
    const list = filter === 'all' ? messages : messages.filter((m) => m.from === filter);
    return groupConsecutive([...list].reverse());
  }, [messages, filter]);

  return (
    <div className={`feed ${compact ? 'compact' : ''}`}>
      <div className="feed-filter">
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          all
        </button>
        {Object.entries(AGENT_META).map(([id, meta]) => (
          <button
            key={id}
            className={`chip ${filter === id ? 'active' : ''}`}
            style={filter === id ? { borderColor: meta.color, color: meta.color } : undefined}
            onClick={() => setFilter(id as AgentId)}
          >
            {meta.short}
          </button>
        ))}
      </div>

      {groups.length === 0 && <div className="empty-state">Agent bus silent. Simulate a cyclone to see agents collaborate.</div>}

      {groups.slice(0, compact ? 40 : 60).map((g) => (
        <GroupCard key={g[0].id} group={g} />
      ))}
    </div>
  );
}

const FALLBACK_META = { label: 'Specialist', color: '#94a3b8', short: 'SP' };

function GroupCard({ group }: { group: ReturnType<typeof groupConsecutive>[number] }) {
  const [open, setOpen] = useState(false);
  const first = group[0];
  const more = group.length - 1;
  const from = AGENT_META[first.from] ?? FALLBACK_META;
  const to = AGENT_META[first.to] ?? FALLBACK_META;

  return (
    <div className="msg" style={{ borderLeftColor: from.color }}>
      <div className="flow">
        <span className="agent-tag" style={{ background: from.color }}>
          {from.short}
        </span>
        <span>→</span>
        <span className="agent-tag" style={{ background: to.color }}>
          {to.short}
        </span>
        <span style={{ marginLeft: 'auto' }}>{formatClock(first.tick * TICK_MINUTES)}</span>
      </div>
      <div className="headline">{headlineOf(first)}</div>
      <div className="meta">
        <span className={`conf ${first.confidence >= 80 ? 'high' : first.confidence >= 60 ? 'mid' : 'low'}`}>
          {first.confidence}%
        </span>
        {more > 0 && (
          <button className="grp-more" onClick={() => setOpen((o) => !o)}>
            {open ? 'collapse' : `+${more} more`}
          </button>
        )}
      </div>
      {open && (
        <div className="group-body">
          {group.slice(1).map((m) => (
            <div className="group-sub" key={m.id}>
              <span>{headlineOf(m)}</span>
              <span className="whys">{formatClock(m.tick * TICK_MINUTES)}</span>
            </div>
          ))}
          <div className="why">{first.why}</div>
        </div>
      )}
    </div>
  );
}

function headlineOf(m: AgentMessage): string {
  switch (m.kind.kind) {
    case 'weather':
      return m.kind.headline;
    case 'flood':
      return `Zone ${m.kind.zone} — ${m.kind.depthM.toFixed(1)} m depth expected in ~${m.kind.horizonMin} min${m.kind.roads.length ? ` · ${m.kind.roads.join(', ')} at risk` : ''}`;
    case 'route':
      return `Route updated (${m.kind.plan.kind}): ${m.kind.causedBy}`;
    case 'capacity':
      return `${m.kind.facility} — ${m.kind.pct}% full · near: ${m.kind.near.join(', ')}`;
    case 'sos':
      return `Signal geolocated to Zone ${m.kind.zone}`;
    case 'sos-alert': {
      const label = SOS_KIND_LABEL[m.kind.sosKind];
      return `${m.kind.peopleCount} ${label} in Zone ${m.kind.zone} — urgency ${m.kind.urgency}/10`;
    }
    case 'shelter-fit':
      return `Shelter fit — ${m.kind.shelterId} at ${m.kind.fill}%`;
    case 'hazard':
      return m.kind.label;
    case 'rec':
      return 'New recommendation issued to the commander';
    case 'sitrep':
      return m.kind.headline;
  }
}