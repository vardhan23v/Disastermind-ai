// Mission Control — SOS triage queue, hospital capacity, shelter board.

import { useState } from 'react';
import { SOS_META } from '@/constants';
import type { SosIncident, WorldState } from '@/types';
import { useSimulation } from '@/store/simulationStore';
import { ProgressBar, Tag } from '@/components/ui';
import { formatClock } from '@/utils/geo';
import { TICK_MINUTES } from '@/constants';

export function MissionPanel() {
  const world = useSimulation((s) => s.world);
  const dispatchSos = useSimulation((s) => s.dispatchSos);
  const [view, setView] = useState<'sos' | 'resources' | 'hospitals' | 'shelters'>('sos');

  return (
    <>
      <div className="toolbar">
        {(['sos', 'resources', 'hospitals', 'shelters'] as const).map((v) => (
          <button key={v} className={`chip ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
            {v === 'sos'
              ? `SOS Queue (${world.sos.filter((s) => s.status === 'pending' || s.status === 'dispatched').length})`
              : v === 'resources'
                ? 'Resources'
                : v === 'hospitals'
                  ? 'Hospitals'
                  : 'Shelters'}
          </button>
        ))}
      </div>

      {view === 'sos' && <SosQueue world={world} onDispatch={dispatchSos} />}
      {view === 'resources' && <ResourcesBoard world={world} />}
      {view === 'hospitals' && <HospitalsBoard world={world} />}
      {view === 'shelters' && <SheltersBoard world={world} />}
    </>
  );
}

function ResourcesBoard({ world }: { world: WorldState }) {
  const ambulances = world.vehicles.filter((v) => v.kind === 'ambulance');
  const boats = world.vehicles.filter((v) => v.kind === 'boat');
  const drones = world.vehicles.filter((v) => v.kind === 'drone');
  const relief = world.vehicles.filter((v) => v.kind === 'relief');
  const fire = world.units.filter((u) => u.kind === 'fire');
  const police = world.units.filter((u) => u.kind === 'police');
  const hospLoad = world.hospitals.length
    ? world.hospitals.reduce((a, h) => a + h.capacityPct, 0) / world.hospitals.length
    : 0;
  const shelterCap = world.shelters.reduce((a, s) => a + s.capacity, 0);
  const shelterOcc = world.shelters.reduce((a, s) => a + s.occupancy, 0);
  const active = (vs: typeof ambulances) => vs.filter((v) => v.status !== 'idle').length;
  const deployed = (us: typeof fire) => us.filter((u) => u.status === 'deployed').length;

  const rows = [
    { label: 'Hospitals', total: world.hospitals.length, active: null, pct: hospLoad, text: `${Math.round(hospLoad)}% load`, color: hospLoad >= 90 ? '#f87171' : hospLoad >= 75 ? '#fbbf24' : '#34d399' },
    { label: 'Ambulances', total: ambulances.length, active: active(ambulances), pct: null, text: null, color: '#34d399' },
    { label: 'Fire units', total: fire.length, active: deployed(fire), pct: null, text: null, color: '#f87171' },
    { label: 'Police units', total: police.length, active: deployed(police), pct: null, text: null, color: '#60a5fa' },
    { label: 'Rescue boats', total: boats.length, active: active(boats), pct: null, text: null, color: '#22d3ee' },
    { label: 'Shelters', total: world.shelters.length, active: null, pct: shelterCap ? (shelterOcc / shelterCap) * 100 : 0, text: `${shelterOcc.toLocaleString('en-IN')} / ${shelterCap.toLocaleString('en-IN')}`, color: '#fbbf24' },
    { label: 'Drones', total: drones.length, active: active(drones), pct: null, text: null, color: '#a78bfa' },
    { label: 'Relief trucks', total: relief.length, active: active(relief), pct: null, text: null, color: '#fb923c' },
  ];

  const rain = world.rainfallMmHr;
  const rainLabel = rain >= 100 ? 'EXTREME' : rain >= 50 ? 'HEAVY' : rain >= 25 ? 'MODERATE' : 'LIGHT';
  const mahanadi = world.riverPct;
  const kuakhai = Math.min(100, mahanadi * 0.86 + 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="river-box">
        <div className="res-row">
          <span className="res-label">RIVER LEVELS</span>
          <span className="res-line">
            <span className="rr">Mahanadi</span>
            <ProgressBar pct={mahanadi} color={mahanadi >= 100 ? '#f87171' : mahanadi >= 85 ? '#fbbf24' : '#22d3ee'} />
            <b className="rr-v" style={{ color: mahanadi >= 100 ? '#f87171' : 'var(--text)' }}>{Math.round(mahanadi)}%</b>
          </span>
          <span className="res-line">
            <span className="rr">Kuakhai</span>
            <ProgressBar pct={kuakhai} color={kuakhai >= 100 ? '#f87171' : kuakhai >= 85 ? '#fbbf24' : '#22d3ee'} />
            <b className="res-val" style={{ color: kuakhai >= 100 ? '#f87171' : 'var(--text)' }}>{Math.round(kuakhai)}%</b>
          </span>
        </div>
        <div className="rain-box">
          <span className="res-label">RAIN INTENSITY</span>
          <span className="rain-num">{rain.toFixed(0)} <small>mm/hr</small></span>
          <span className={`rain-tag ${rainLabel.toLowerCase()}`}>{rainLabel}</span>
        </div>
      </div>

      {rows.map((r) => (
        <div key={r.label} className="resource-line">
          <div className="res-row">
            <span className="res-name">{r.label}</span>
            <span className="res-count">
              {r.text ?? <>{r.active} <i>/ {r.total}</i></>}
            </span>
          </div>
          <ProgressBar pct={r.total ? Math.min(100, (r.active ?? 0) + (r.pct ?? 0)) : 0} color={r.color} />
        </div>
      ))}
    </div>
  );
}

function SosQueue({ world, onDispatch }: { world: WorldState; onDispatch: (id: string) => void }) {
  const sorted = [...world.sos].sort((a, b) => b.urgency - a.urgency);
  const active = sorted.filter((s) => s.status === 'pending' || s.status === 'dispatched');
  const resolved = sorted.filter((s) => s.status === 'resolved');
  const queue = [...active, ...resolved];

  if (queue.length === 0) {
    return <div className="empty-state">No SOS yet. Maydays appear as the flood spreads.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {queue.map((s) => (
        <SosRow key={s.id} sos={s} onDispatch={onDispatch} />
      ))}
    </div>
  );
}

function SosRow({ sos, onDispatch }: { sos: SosIncident; onDispatch: (id: string) => void }) {
  const color = SOS_META[sos.kind].color;
  const active = sos.status === 'pending' || sos.status === 'dispatched';
  return (
    <div className="sos-row" style={{ ['--sos-color' as string]: SOS_META[sos.kind].color }}>
      <div className="urgency" style={{ color }}>
        {sos.urgency}
      </div>
      <div className="body">
        <div className="desc">{sos.description}</div>
        <div className="meta">
          Z{sos.zone} · {formatClock(sos.createdAtTick * TICK_MINUTES)} · {sos.source} · {sos.peopleCount} ppl
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className={`status ${sos.status}`}>{sos.status}</span>
        {active && sos.status === 'pending' && (
          <button className="btn small" style={{ borderColor: color, color }} onClick={() => onDispatch(sos.id)}>
            ⚑ Dispatch
          </button>
        )}
      </div>
    </div>
  );
}

function HospitalsBoard({ world }: { world: WorldState }) {
  const sorted = [...world.hospitals].sort((a, b) => b.capacityPct - a.capacityPct);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((h) => {
        const color = h.capacityPct >= 85 ? '#f87171' : h.capacityPct >= 65 ? '#fbbf24' : '#34d399';
        return (
          <div key={h.id} className="hosp-row">
            <div className="top">
              <span className="name">{h.name}</span>
              <span className="pct">{h.capacityPct}%</span>
            </div>
            <ProgressBar pct={h.capacityPct} color={color} />
            <div className="meta">
              <Tag color={color}>ICU {h.icuOccupied}/{h.icuTotal}</Tag>
              <Tag color={h.oxygen === 'ok' ? '#34d399' : '#f87171'}>O₂ {h.oxygen}</Tag>
              <Tag>Z{h.zone}</Tag>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SheltersBoard({ world }: { world: WorldState }) {
  const [womenSafe, setWomenSafe] = useState(false);
  const [petFriendly, setPetFriendly] = useState(false);

  const list = world.shelters.filter(
    (s) => (!womenSafe || s.womenSafe) && (!petFriendly || s.petFriendly)
  );

  return (
    <>
      <div className="toolbar">
        <label style={{ fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
          <input type="checkbox" checked={womenSafe} onChange={(e) => setWomenSafe(e.target.checked)} /> women-safe
        </label>
        <label style={{ fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
          <input type="checkbox" checked={petFriendly} onChange={(e) => setPetFriendly(e.target.checked)} /> pet-friendly
        </label>
      </div>
      {list.map((s) => {
        const open = s.openedAtTick > 0;
        const fill = Math.round((s.occupancy / s.capacity) * 100);
        const color = open ? '#fbbf24' : '#5d6f8c';
        return (
          <div key={s.id} className="shelter-row">
            <div className="top">
              <span className="name">{s.name}</span>
              <span className="pct">{s.occupancy}/{s.capacity}</span>
            </div>
            <ProgressBar pct={fill} color={color} />
            <div className="meta">
              <Tag color={color}>{open ? 'OPEN' : 'standby'}</Tag>
              <Tag>Z{s.zone}</Tag>
              <Tag color={s.hasFood ? '#34d399' : undefined}>food</Tag>
              <Tag color={s.hasWater ? '#34d399' : undefined}>water</Tag>
              <Tag color={s.hasMedicalStaff ? '#34d399' : undefined}>clinic</Tag>
              {s.womenSafe && <Tag color="#a78bfa">women-safe</Tag>}
              {s.petFriendly && <Tag color="#f472b6">pets</Tag>}
            </div>
          </div>
        );
      })}
    </>
  );
}