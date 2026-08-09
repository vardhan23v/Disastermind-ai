// Hazard scenario picker — switch between the nine disaster scenarios.
// Rendered through a portal onto document.body so the modal escapes any
// ancestor stacking context (map panes, overflow, transforms) and always
// paints above the Leaflet map.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { GEO_CATEGORIES, HAZARD_DEFS, hazardDefOf } from '@/hazards/definitions';
import { useSimulation } from '@/store/simulationStore';

export function HazardPicker() {
  const world = useSimulation((s) => s.world);
  const setHazard = useSimulation((s) => s.setHazard);
  const [open, setOpen] = useState(false);
  const active = hazardDefOf(world.hazard);

  const modal = (
    <div className="hazard-modal-backdrop" onClick={() => setOpen(false)}>
      <div className="hazard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hazard-modal-head">
          <div className="brand">
            <div className="logo">◈</div>
            <div>
              <div>Scenario Library</div>
              <div className="sub">9 hazards · deterministic twin · compound-ready</div>
            </div>
          </div>
          <button className="btn hazard-modal-close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        {GEO_CATEGORIES.map((cat) => (
          <div key={cat.id} className="hazard-group">
            <div className="hazard-group-label">
              {cat.icon} {cat.label}
            </div>
            <div className="hazard-grid">
              {HAZARD_DEFS.filter((d) => d.category === cat.id).map((d) => {
                const selected = d.id === active.id;
                return (
                  <button
                    key={d.id}
                    className={`hazard-card ${selected ? 'selected' : ''}`}
                    style={{ borderColor: d.accent }}
                    onClick={() => {
                      setHazard(d.id);
                      setOpen(false);
                    }}
                  >
                    <div className="hazard-card-icon">{d.icon}</div>
                    <div className="hazard-card-name">{d.name}</div>
                    <div className="hazard-card-meta">
                      <span style={{ color: d.accent }}>{d.severity}</span>
                      <span>· {d.timeScale}</span>
                    </div>
                    <div className="hazard-card-desc">{d.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button className="btn" onClick={() => setOpen(true)} title="Choose a disaster scenario">
        {active.icon} {active.name}
      </button>
      {open && createPortal(modal, document.body)}
    </>
  );
}
