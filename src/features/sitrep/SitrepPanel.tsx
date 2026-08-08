// Situation Report — generate, preview, download as PDF.

import { useSimulation } from '@/store/simulationStore';
import { downloadSitrepPdf } from '@/features/sitrep/pdf';
import { SITREP_MIN_TICK, TICK_MINUTES } from '@/constants';
import { formatClock, fmtInr } from '@/utils/geo';

export function SitrepPanel() {
  const world = useSimulation((s) => s.world);
  const sitrep = useSimulation((s) => s.ui.sitrep);
  const generateSitrep = useSimulation((s) => s.generateSitrep);
  const ready = world.tick >= SITREP_MIN_TICK;

  if (!sitrep) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="empty-state">
          The Government Report Agent compiles the full event log into an official PDF-ready SITREP.
          <br />
          <br />
          {ready ? (
            <button className="btn primary" onClick={generateSitrep}>
              ⚙ Generate SITREP
            </button>
          ) : (
            <span>available after tick {SITREP_MIN_TICK} (water receding)</span>
          )}
        </div>
      </div>
    );
  }

  const d = sitrep;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="panel">
        <h3>Generated at {formatClock(d.generatedAtTick * TICK_MINUTES)} · tick {d.generatedAtTick}</h3>
        <div className="damage-grid">
          <div className="damage-cell">
            <div className="v">{d.rescued}</div>
            <div className="l">People rescued</div>
          </div>
          <div className="damage-cell">
            <div className="v">{d.sosHandled}</div>
            <div className="l">SOS handled</div>
          </div>
          <div className="damage-cell">
            <div className="v">{d.casualtiesPrevented}</div>
            <div className="l">Casualties prevented (est.)</div>
          </div>
          <div className="damage-cell">
            <div className="v">{d.alertPeak.toUpperCase()}</div>
            <div className="l">Peak alert level</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Damage assessment</h3>
        <div className="damage-grid">
          <div className="damage-cell">
            <div className="v">{d.damage.buildingsDamaged}</div>
            <div className="l">Buildings damaged</div>
          </div>
          <div className="damage-cell">
            <div className="v">{d.damage.roadsDestroyedKm} km</div>
            <div className="l">Roads destroyed</div>
          </div>
          <div className="damage-cell">
            <div className="v">{d.damage.powerLossPct}%</div>
            <div className="l">Power loss</div>
          </div>
          <div className="damage-cell">
            <div className="v">{d.damage.affectedPopulation.toLocaleString('en-IN')}</div>
            <div className="l">Affected population</div>
          </div>
          <div className="damage-cell" style={{ gridColumn: '1 / -1' }}>
            <div className="v">{fmtInr(d.damage.economicLossInr)}</div>
            <div className="l">Estimated economic loss</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Resources deployed</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {d.resourcesDeployed.map((r) => (
            <div key={r} style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              ▸ {r}
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Event timeline</h3>
        <table className="sitrep-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Tag</th>
              <th>Event</th>
            </tr>
          </thead>
          <tbody>
            {d.timeline.map((e, i) => (
              <tr key={i}>
                <td>{formatClock(e.tick * TICK_MINUTES)}</td>
                <td className={`sev-${e.severity}`}>{e.tag}</td>
                <td>{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn primary" onClick={() => void downloadSitrepPdf(d)}>
        ⬇ Download SITREP PDF
      </button>
    </div>
  );
}