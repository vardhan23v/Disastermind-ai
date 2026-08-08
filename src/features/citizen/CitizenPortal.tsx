// Citizen portal — phone-styled SOS, alerts, shelter fit, offline-first.

import { useState } from 'react';
import { ALERT_META } from '@/constants';
import { useSimulation } from '@/store/simulationStore';
import { dist } from '@/utils/geo';

const ME = { x: 4200, y: 8000 };

export function CitizenPortal() {
  const open = useSimulation((s) => s.ui.portalOpen);
  const setPortalOpen = useSimulation((s) => s.setPortalOpen);
  const sendCitizenSos = useSimulation((s) => s.sendCitizenSos);
  const world = useSimulation((s) => s.world);
  const [sent, setSent] = useState(false);

  const bestShelter = world.shelters
    .filter((s) => s.openedAtTick > 0)
    .sort((a, b) => dist(a.pos, ME) - dist(b.pos, ME))[0];
  const alert = ALERT_META[world.alert];

  if (!open) {
    return (
      <button className="btn portal-btn" onClick={() => setPortalOpen(true)}>
        📱 Citizen App
      </button>
    );
  }

  const handleSos = (): void => {
    sendCitizenSos();
    setSent(true);
    window.setTimeout(() => setSent(false), 2400);
  };

  return (
    <div className="portal">
      <div className="screen">
        <div className="status-bar">
          <span>CityAlert · v2.4</span>
          <span>offline-ready</span>
        </div>
        <div className="app-title">
          <span style={{ fontSize: 18 }}>🎒</span> My Safety Kit
        </div>

        <div className="alert-card" style={{ borderColor: alert.color }}>
          <div style={{ fontWeight: 700, color: alert.color, marginBottom: 3 }}>
            {alert.label} · Zone A
          </div>
          <div>
            {world.rainfallMmHr > 30
              ? `Heavy rain ${Math.round(world.rainfallMmHr)} mm/hr · stay indoors${world.riverPct > 100 ? ' · river at overflow' : ''}`
              : 'Conditions calming — continue to follow official guidance.'}
          </div>
        </div>

        {bestShelter && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, fontSize: 12 }}>
            <div style={{ color: 'var(--text-faint)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 3 }}>
              NEAREST OPEN SHELTER
            </div>
            <div style={{ fontWeight: 600 }}>{bestShelter.name}</div>
            <div style={{ color: 'var(--text-dim)' }}>
              {(dist(bestShelter.pos, ME) / 1000).toFixed(1)} km · {bestShelter.occupancy}/{bestShelter.capacity} occupied
            </div>
            {world.routes.length > 0 && (
              <div style={{ color: 'var(--cyan)', fontFamily: 'var(--mono)', fontSize: 11, marginTop: 4 }}>
                🧭 safe route available — offline maps bundled
              </div>
            )}
          </div>
        )}

        <button className={`sos-btn ${sent ? 'pressed' : ''}`} onClick={handleSos}>
          {sent ? '✓ SOS SENT — HELD TO DISPATCH' : 'SOS — I NEED HELP'}
        </button>

        <div className="offline">
          <span>◉</span> offline-first — works without network
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
          alerts since 06:00 · SOS history synced · EOC queued
        </div>
      </div>
      <button
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          fontSize: 14,
        }}
        onClick={() => setPortalOpen(false)}
        aria-label="close portal"
      >
        ✕
      </button>
    </div>
  );
}