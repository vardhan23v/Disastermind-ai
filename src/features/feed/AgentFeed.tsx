// Agent Collaboration Feed — the visible multi-agent message stream.

import { useMemo, useState } from 'react';
import { AGENT_META } from '@/constants';
import type { AgentId, AgentMessage } from '@/types';
import { useSimulation } from '@/store/simulationStore';
import { formatClock } from '@/utils/geo';
import { TICK_MINUTES } from '@/constants';

export function AgentFeed({ compact }: { compact?: boolean }) {
  const messages = useSimulation((s) => s.world.messages);
  const [filter, setFilter] = useState<AgentId | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const shown = useMemo(() => {
    const list = filter === 'all' ? messages : messages.filter((m) => m.from === filter);
    return [...list].reverse();
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

      {shown.length === 0 && <div className="empty-state">Agent bus silent. Simulate a cyclone to see agents collaborate.</div>}

      {shown.slice(0, compact ? 40 : 60).map((m) => (
        <MessageRow key={m.id} message={m} expanded={expanded === m.id} onToggle={() => setExpanded(expanded === m.id ? null : m.id)} />
      ))}
    </div>
  );
}

function MessageRow({
  message,
  expanded,
  onToggle,
}: {
  message: AgentMessage;
  expanded: boolean;
  onToggle: () => void;
}) {
  const from = AGENT_META[message.from];
  const to = AGENT_META[message.to];
  const chip = message.confidence >= 80 ? 'high' : message.confidence >= 60 ? 'mid' : 'low';

  return (
    <div className="msg" style={{ borderLeftColor: from.color }} onClick={onToggle}>
      <div className="flow">
        <span className="agent-tag" style={{ background: from.color }}>
          {from.short}
        </span>
        <span>→</span>
        <span className="agent-tag" style={{ background: to.color }}>
          {to.short}
        </span>
        <span style={{ marginLeft: 'auto' }}>{formatClock(message.tick * TICK_MINUTES)}</span>
      </div>
      <div className="headline">{headlineOf(message)}</div>
      <div className="meta">
        <span className={`conf ${chip}`}>{message.confidence}%</span>
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{expanded ? '▲ why' : '▼ why'}</span>
      </div>
      {expanded && <div className="why">{message.why}</div>}
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
      return m.kind.urgency >= 9 ? `NEW priority signal — urgency ${m.kind.urgency}/10` : `Signal geolocated to Zone ${m.kind.zone}`;
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