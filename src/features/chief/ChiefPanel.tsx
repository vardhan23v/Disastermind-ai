// Chief AI — ranked, explainable recommendation cards with Approve/Reject.

import { AGENT_META } from '@/constants';
import type { Recommendation } from '@/types';
import { useSimulation } from '@/store/simulationStore';
import { ConfidenceGauge } from '@/components/ui';
import { formatClock } from '@/utils/geo';
import { TICK_MINUTES } from '@/constants';

export function ChiefPanel({ compact }: { compact?: boolean }) {
  const recommendations = useSimulation((s) => s.world.recommendations);
  const approveRecommendation = useSimulation((s) => s.approveRecommendation);
  const tick = useSimulation((s) => s.world.tick);

  if (recommendations.length === 0) {
    return (
      <div className="empty-state">
        No recommendations yet. The Chief AI evaluates all agent signals and issues ranked actions here.
      </div>
    );
  }

  const recs = compact ? [...recommendations].reverse().slice(0, 2) : [...recommendations].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {recs.map((r) => (
        <RecommendationCard key={r.id} rec={r} tick={tick} onApprove={approveRecommendation} />
      ))}
    </div>
  );
}

function RecommendationCard({
  rec,
  tick,
  onApprove,
}: {
  rec: Recommendation;
  tick: number;
  onApprove: (id: string) => void;
}) {
  const pending = rec.status === 'pending';
  return (
    <div className={`rec ${rec.band} ${rec.status}`}>
      <span className="band-tag">{rec.band}</span>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="title">{rec.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
            {formatClock(rec.createdAtTick * TICK_MINUTES)} · tick {rec.createdAtTick}
          </div>
        </div>
        <ConfidenceGauge value={rec.confidence} />
      </div>

      <ul className="reasons">
        {rec.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <div className="factors">
        {rec.factors.map((f) => (
          <span key={`${f.agent}-${f.note}`} className="factor">
            {AGENT_META[f.agent].short}: {f.note}
          </span>
        ))}
      </div>

      <div className="actions">
        {rec.actions.map((a) => (
          <span key={a.target} className="action">
            ▸ [{a.kind.replace('-', ' ')}] {a.target}
          </span>
        ))}
      </div>

      {pending ? (
        <div className="buttons">
          <button className="btn primary small" onClick={() => onApprove(rec.id)}>
            ✓ Approve
          </button>
          <button className="btn small" disabled>
            ✗ Reject
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: rec.status === 'approved' ? 'var(--green)' : 'var(--text-faint)' }}>
          {rec.status === 'approved' ? `Approved · executed at tick ${rec.approvedAtTick >= 0 ? rec.approvedAtTick : tick}` : 'Rejected'}
        </div>
      )}
    </div>
  );
}

// tick constant kept stable for the header clock
void 0;