// Disaster timeline slider — scrub recorded history (−24h) and AI forecasts (+24h).

import { TICK_MINUTES } from '@/constants';
import { useSimulation } from '@/store/simulationStore';
import { formatClock } from '@/utils/geo';

const MIN_OFFSET = -288; // −24 h
const MAX_OFFSET = 288; // +24 h

const MARKERS = [
  { label: '−24h', offset: MIN_OFFSET },
  { label: '−6h', offset: -72 },
  { label: 'Now', offset: 0 },
  { label: '+1h', offset: 12 },
  { label: '+3h', offset: 36 },
  { label: '+6h', offset: 72 },
  { label: '+24h', offset: MAX_OFFSET },
];

export function TimelineZone() {
  const world = useSimulation((s) => s.world);
  const offset = useSimulation((s) => s.ui.timelineOffsetTick);
  const setOffset = useSimulation((s) => s.setTimelineOffset);

  const shownTick = world.tick + offset;
  const shownMin = Math.max(0, shownTick) * TICK_MINUTES;
  const isFuture = offset > 0;
  const isPast = offset < 0;
  const label = `T${shownTick} · ${formatClock(shownMin)} ${isFuture ? '· AI forecast' : isPast ? '· recorded' : '· live'}`;

  return (
    <div className="timeline-zone">
      <div className="row">
        <span className="tag past">HISTORY</span>
        <input
          type="range"
          min={MIN_OFFSET}
          max={MAX_OFFSET}
          value={offset}
          step={1}
          onChange={(e) => setOffset(Number(e.target.value))}
          aria-label="disaster timeline scrubber"
        />
        <span className="tag future">FORECAST</span>
        <span className="tag" style={{ color: isFuture ? 'var(--purple)' : isPast ? 'var(--text-faint)' : 'var(--text)' }}>
          {label}
        </span>
      </div>
      <div className="markers">
        {MARKERS.map((m) => (
          <span key={m.label} style={{ cursor: 'pointer' }} onClick={() => setOffset(m.offset)}>
            {m.label}
          </span>
        ))}
      </div>

    </div>
  );
}