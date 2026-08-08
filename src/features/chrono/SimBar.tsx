// Top mission-control bar: alert level, clock, simulate/reset, speed.

import { ALERT_META, DEMO_TICKS, SPEEDS } from '@/constants';
import { formatClock } from '@/utils/geo';
import { useSimulation } from '@/store/simulationStore';

export function SimBar() {
  const world = useSimulation((s) => s.world);
  const speed = useSimulation((s) => s.speed);
  const setSpeed = useSimulation((s) => s.setSpeed);
  const start = useSimulation((s) => s.start);
  const pause = useSimulation((s) => s.pause);
  const reset = useSimulation((s) => s.reset);

  const alert = ALERT_META[world.alert];
  const done = world.tick >= DEMO_TICKS;

  return (
    <header className="sim-bar">
      <div className="brand">
        <div className="logo">◈</div>
        <div>
          <div>
            Disaster<span style={{ color: 'var(--cyan)' }}>Mind</span> AI
          </div>
          <div className="sub">Multi-Agent Emergency Response</div>
        </div>
      </div>

      <div
        className="alert-chip"
        style={{
          color: alert.color,
          borderColor: alert.color,
          boxShadow: `0 0 16px ${alert.glow}`,
        }}
      >
        <span className="dot" style={{ background: alert.color, ['--pulse-color' as string]: alert.glow }} />
        {alert.label}
      </div>

      <div className="clock">
        {formatClock(world.clockMin)}
        <span className="ticks">T{world.tick}</span>
      </div>

      <div className="phase-tag" style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        {world.phase.split('-').join(' ')}
      </div>

      <div className="spacer" />

      {world.running ? (
        <button className="btn" onClick={pause}>
          ⏸ Pause
        </button>
      ) : (
        <button className="btn primary" onClick={start} disabled={done}>
          ▶ Simulate Cyclone
        </button>
      )}

      <div className="speed-group">
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={speed === s ? 'active' : ''}
            onClick={() => setSpeed(s)}
            title={`${s}× speed`}
          >
            {s}×
          </button>
        ))}
      </div>

      <button className="btn" onClick={reset} title="Restore pre-disaster state">
        ↺ Reset
      </button>
    </header>
  );
}