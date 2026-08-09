// Disaster timeline slider — scrub recorded history (−24h) and AI forecasts (+24h).
// Hazard-aware: day/week-scale scenarios label the scrubber by that scale.

import { TICK_MINUTES } from '@/constants';
import { useSimulation } from '@/store/simulationStore';
import { formatClock } from '@/utils/geo';
import { hazardDefOf } from '@/hazards/definitions';
import { clockSince } from '@/hazards/common';

const MIN_OFFSET = -288; // −24 h
const MAX_OFFSET = 288; // +24 h

const MARKERS: Record<string, { label: string; offset: number }[]> = {
  minutes: [
    { label: '−24h', offset: MIN_OFFSET },
    { label: '−6h', offset: -72 },
    { label: 'Now', offset: 0 },
    { label: '+6h', offset: 72 },
    { label: '+12h', offset: 144 },
    { label: '+24h', offset: MAX_OFFSET },
  ],
  days: [
    { label: '−7d', offset: -7 },
    { label: '−1d', offset: -1 },
    { label: 'Now', offset: 0 },
    { label: '+1d', offset: 1 },
    { label: '+3d', offset: 3 },
    { label: '+7d', offset: 7 },
  ],
  weeks: [
    { label: '−4w', offset: -4 },
    { label: '−1w', offset: -1 },
    { label: 'Now', offset: 0 },
    { label: '+1w', offset: 1 },
    { label: '+2w', offset: 2 },
    { label: '+4w', offset: 4 },
  ],
};

export function TimelineZone() {
  const world = useSimulation((s) => s.world);
  const offset = useSimulation((s) => s.ui.timelineOffsetTick);
  const setOffset = useSimulation((s) => s.setTimelineOffset);
  const def = hazardDefOf(world.hazard);
  const perTickMin = def.timeScale === 'weeks' ? 7 * 24 * 60 : def.timeScale === 'days' ? 24 * 60 : TICK_MINUTES;

  const shownTick = world.tick + offset;
  const shownMin = Math.max(0, shownTick) * perTickMin;
  const isFuture = offset > 0;
  const isPast = offset < 0;
  const label = `T${shownTick} · ${def.timeScale === 'minutes' ? formatClock(shownMin) : clockSince(360, shownTick, perTickMin)} ${isFuture ? '· AI forecast' : isPast ? '· recorded' : '· live'}`;

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
        {MARKERS[def.timeScale].map((m) => (
          <span key={m.label} style={{ cursor: 'pointer' }} onClick={() => setOffset(m.offset)}>
            {m.label}
          </span>
        ))}
      </div>

    </div>
  );
}