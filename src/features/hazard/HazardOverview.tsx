// Hazard Overview — the active scenario's playbook card: threat profile,
// affected zones, live metrics and required resource posture.

import { hazardDefOf } from '@/hazards/definitions';
import { useSimulation } from '@/store/simulationStore';

export function HazardOverview() {
  const world = useSimulation((s) => s.world);
  const def = hazardDefOf(world.hazard);
  const metrics = world.hazardMetrics;

  return (
    <div className="hazard-overview" style={{ borderColor: def.accent }}>
      <div className="hazard-ov-head">
        <span className="hazard-ov-icon">{def.icon}</span>
        <div>
          <div className="hazard-ov-name">{def.name}</div>
          <div className="hazard-ov-meta">
            <span style={{ color: def.accent }}>{def.severity}</span> · {def.timeScale} · {def.areaLabel}
          </div>
        </div>
      </div>

      <div className="hazard-ov-desc">{def.synopsis}</div>

      <div className="hazard-ov-row">
        <span className="hazard-ov-label">Affected zones</span>
        <div className="hazard-ov-zones">
          {def.affectedZones.map((z) => (
            <span key={z} className="hazard-zone-chip" style={{ borderColor: def.accent, color: def.accent }}>
              {z}
            </span>
          ))}
        </div>
      </div>

      <div className="hazard-ov-row">
        <span className="hazard-ov-label">Live metrics</span>
        <div className="hazard-ov-metrics">
          {def.metrics.slice(0, 5).map((m) => {
            const v = metrics[m.key] ?? 0;
            const n = m.decimals ? v.toFixed(m.decimals) : Math.round(v).toLocaleString('en-IN');
            return (
              <div key={m.key} className="hazard-metric">
                <div className="hazard-metric-value">{m.unit ? `${n} ${m.unit}` : n}</div>
                <div className="hazard-metric-label">{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hazard-ov-row">
        <span className="hazard-ov-label">Resource posture</span>
        <div className="hazard-ov-res">
          {def.preferredResources.map((r) => (
            <span key={r} className="hazard-res-chip">
              {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
