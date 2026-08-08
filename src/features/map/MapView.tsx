// Real basemap (Carto Voyager tiles via Leaflet) + sim overlay SVG of the city.
// The fictional city is geo-anchored to the Odisha coast (Puri district) — the
// SVG sea maps onto the real Bay of Bengal. Every marker is driven by world
// state: hospitals show capacity, shelters show occupancy, units move per tick.

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CITY, EXTRA_LAYERS, PRIMARY_LAYERS, STORM_PATH, ZONE_META, ZONE_IDS } from '@/constants';
import type {
  CityPoint,
  Hospital,
  LayerKey,
  RoadKind,
  Shelter,
  SosIncident,
  UnitStation,
  Vehicle,
  WorldState,
  ZoneId,
} from '@/types';
import { useSimulation } from '@/store/simulationStore';
import { worldRng, SEED } from '@/utils/seededRandom';
import { floodDepthAt } from '@/simulation/forecast';
import { buildRoads, buildZones, RIVER_PATH } from '@/data/city';
import { pointInPolygon, pointOnPath } from '@/utils/geo';

const W = CITY.widthM;
const H = CITY.heightM;

// Sim city geo anchoring — Odisha coast (Puri), Bay of Bengal to the south.
const GEO = {
  north: 20.45,
  south: 19.55,
  west: 85.35,
  east: 86.35,
};

const CITY_BOUNDS = L.latLngBounds([GEO.south, GEO.west], [GEO.north, GEO.east]);

const cityLat = (y: number): number => GEO.north - (y / H) * (GEO.north - GEO.south);
const cityLng = (x: number): number => GEO.west + (x / W) * (GEO.east - GEO.west);

interface RainLine {
  x: number;
  y: number;
  len: number;
  delay: number;
}

const RAIN_LINES: RainLine[] = (() => {
  const rng = worldRng(7);
  return Array.from({ length: 46 }, () => ({
    x: rng.nextFloat(0, W),
    y: rng.nextFloat(0, H),
    len: rng.nextFloat(26, 90),
    delay: rng.nextFloat(0, 1.1),
  }));
})();

interface AreaStats {
  z: number;
  spanKm: number;
  hospitals: number;
  criticalHospitals: number;
  openShelters: number;
  shelterPeople: number;
  units: number;
  vehicles: number;
  moving: number;
  sos: number;
  floodedZones: number;
  maxDepth: number;
}

export function MapView() {
  const world = useSimulation((s) => s.world);
  const layers = useSimulation((s) => s.ui.layers);
  const offsetTick = useSimulation((s) => s.ui.timelineOffsetTick);
  const dismissToast = useSimulation((s) => s.dismissToast);
  const toasts = useSimulation((s) => s.ui.toasts);

  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [viewScale, setViewScale] = useState(1);
  const [tip, setTip] = useState<{ x: number; y: number; content: string } | null>(null);
  const [pinned, setPinned] = useState(false);
  const lastScaleRef = useRef(0);

  useEffect(() => {
    const root = mapRootRef.current;
    if (!root || !svgRef.current) return;
    const map = L.map(root, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 7,
      maxZoom: 16,
    });
    mapRef.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    L.svgOverlay(svgRef.current, CITY_BOUNDS).addTo(map);
    map.fitBounds(CITY_BOUNDS, { padding: [18, 18] });

    const syncScale = () => {
      const el = svgRef.current;
      if (!el || el.clientWidth < 2) return;
      const s = W / el.clientWidth;
      if (Math.abs(s - lastScaleRef.current) / Math.max(0.001, lastScaleRef.current) > 0.02) {
        lastScaleRef.current = s;
        setViewScale(s);
      }
    };
    map.on('move zoom resize viewreset zoomend', syncScale);
    syncScale();
    const ro = new ResizeObserver(syncScale);
    if (root) ro.observe(root);
    return () => {
      map.remove();
      mapRef.current = null;
      ro.disconnect();
    };
  }, []);

  const fitCity = () => mapRef.current?.fitBounds(CITY_BOUNDS, { padding: [18, 18] });

  const shownTick = world.tick + offsetTick;
  const isForecast = offsetTick > 0;
  const inv = viewScale;

  const [area, setArea] = useState<AreaStats | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;
  const shownTickRef = useRef(shownTick);
  shownTickRef.current = shownTick;
  const areaUpdaterRef = useRef<() => void>(() => {});
  areaUpdaterRef.current = () => setArea(computeArea());
  function computeArea(): AreaStats | null {
    const map = mapRef.current;
    if (!map) return null;
    const b = map.getBounds();
    const inView = (x: number, y: number): boolean => b.contains([cityLat(y), cityLng(x)]);
    const w = worldRef.current;
    const t = shownTickRef.current;
    const hospitals = w.hospitals.filter((h) => inView(h.pos.x, h.pos.y));
    const shelters = w.shelters.filter((s) => s.openedAtTick > 0 && inView(s.pos.x, s.pos.y));
    const units = w.units.filter((u) => inView(u.pos.x, u.pos.y));
    const vehicles = w.vehicles.filter((v) => inView(v.pos.x, v.pos.y));
    const sos = w.sos.filter(
      (s) => (s.status === 'pending' || s.status === 'dispatched') && inView(s.pos.x, s.pos.y)
    );
    const floodedZones = w.zones.filter(
      (z) =>
        floodDepthAt(z.id, t) > 0 &&
        z.polygon.some((p) => inView(p.x, p.y))
    );
    const maxDepth = floodedZones.reduce((m, z) => Math.max(m, floodDepthAt(z.id, t)), 0);
    const midLat = (b.getNorth() + b.getSouth()) / 2;
    const spanKm = (b.getEast() - b.getWest()) * 111.32 * Math.cos((midLat * Math.PI) / 180);
    return {
      z: map.getZoom(),
      spanKm,
      hospitals: hospitals.length,
      criticalHospitals: hospitals.filter((h) => h.capacityPct >= 90).length,
      openShelters: shelters.length,
      shelterPeople: shelters.reduce((a, s) => a + s.occupancy, 0),
      units: units.length,
      vehicles: vehicles.length,
      moving: vehicles.filter((v) => v.status !== 'idle').length,
      sos: sos.length,
      floodedZones: floodedZones.length,
      maxDepth,
    };
  }
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => areaUpdaterRef.current();
    map.on('move zoom viewreset', update);
    update();
    return () => {
      map.off('move zoom viewreset', update);
    };
  }, []);
  useEffect(() => {
    areaUpdaterRef.current();
  }, [world, shownTick]);

  const flood = useMemo(
    () =>
      ZONE_IDS.map((z) => {
        const depth = Math.max(0, floodDepthAt(z, shownTick));
        return { zone: z, depth, level: depth > 0 ? 1 : 0 };
      }),
    [shownTick]
  );

  const openTip = (x: number, y: number, content: string) => {
    const map = mapRef.current;
    if (!map) return;
    const p = map.latLngToContainerPoint(L.latLng(cityLat(y), cityLng(x)));
    setTip({ x: p.x, y: p.y, content });
  };
  const closeTip = () => {
    if (!pinned) setTip(null);
  };
  const togglePin = () => {
    setPinned((p) => !p);
  };
  const expandCluster = (x: number, y: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo(L.latLng(cityLat(y), cityLng(x)), Math.min(map.getZoom() + 2, 15), { duration: 0.7 });
  };

  return (
    <div className="map-stack">
      <div className="map-wrap">
        <div className="map-leaf" ref={mapRootRef} />
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sim-overlay">
        <BaseLayers world={world} layers={layers} inv={inv} />
        {layers.flood && <FloodLayer world={world} layers={layers} flood={flood} forecast={isForecast} />}
        {(layers.roads || layers.blockedRoads) && <RoadsLayer world={world} onlyBad={!layers.roads} />}
        {layers.blockedRoads && <RoadStatusLabels world={world} inv={inv} />}
        {layers.routes && <RoutesLayer world={world} />}
        {(layers.fireStations || layers.policeStations) && (
          <UnitsLayer
            units={world.units.filter(
              (u) => (u.kind === 'fire' && layers.fireStations) || (u.kind === 'police' && layers.policeStations)
            )}
            inv={inv}
            onHover={openTip}
            onLeave={closeTip}
            onClusterClick={expandCluster}
          />
        )}
        {layers.hospitals && <HospitalsLayer world={world} inv={inv} onHover={openTip} onLeave={closeTip} onClusterClick={expandCluster} />}
        {layers.shelters && <SheltersLayer world={world} inv={inv} onHover={openTip} onLeave={closeTip} onClusterClick={expandCluster} />}
        {layers.sos && <SosLayer world={world} inv={inv} onHover={openTip} onLeave={closeTip} onClusterClick={expandCluster} />}
        {layers.social && <PostsLayer world={world} />}
        {layers.satellite && <HitsLayer world={world} />}
        {layers.weather && <WeatherLayer world={world} shownTick={shownTick} inv={inv} />}
        {(layers.ambulances || layers.boats || layers.drones || layers.relief) && (
          <VehiclesLayer
            vehicles={world.vehicles.filter(
              (v) =>
                (v.kind === 'ambulance' && layers.ambulances) ||
                (v.kind === 'boat' && layers.boats) ||
                (v.kind === 'drone' && layers.drones) ||
                (v.kind === 'relief' && layers.relief)
            )}
            inv={inv}
            onHover={openTip}
            onLeave={closeTip}
            onClusterClick={expandCluster}
          />
        )}
      </svg>

      <div className="watermark">SIMULATION / DEMO — CONCEPT CITY ADJACENT TO PURI, ODISHA</div>

      {tip && (
        <div
          className="map-tooltip"
          style={{ left: tip.x, top: tip.y }}
          onClick={togglePin}
          dangerouslySetInnerHTML={{ __html: tip.content }}
        />
      )}

      <div className="map-tools">
        <button title="Fit city" onClick={fitCity}>
          ⌖
        </button>
        <button title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          +
        </button>
        <button title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          −
        </button>
      </div>

      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.kind}`}>
              <span>{(t.kind === 'critical' ? '🔴' : t.kind === 'success' ? '🟢' : '🟠')}</span>
              <span>{t.text}</span>
              <button className="t-close" onClick={() => dismissToast(t.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      </div>

      <div className="map-deck">
        <div className="deck-card">
          <div className="deck-title">MAP LAYERS</div>
          <LayerToggles />
        </div>
        <div className="deck-card">
          <div className="deck-title">MAP LEGEND</div>
          <MapLegend />
        </div>
        <div className="deck-card">
          <div className="deck-title">
            IN VIEW {area && <span>Z{area.z} · ~{(area.spanKm / 1.6).toFixed(1)} mi</span>}
          </div>
          {area ? (
            <div className="view-grid">
              <div className="area-row" title="Hospitals in view">
                <span className="ado ad-red" />HOSPS
                <b>{area.hospitals}</b>
                {area.criticalHospitals > 0 && <i>{area.criticalHospitals} crit</i>}
              </div>
              <div className="area-row" title="Open shelters in view + occupants">
                <span className="ado ad-cyan" />SHELTERS
                <b>{area.openShelters}</b>
                {area.shelterPeople > 0 && <i>{area.shelterPeople} ppl</i>}
              </div>
              <div className="area-row" title="Fire / police stations in view">
                <span className="ado ad-amber" />STATIONS
                <b>{area.units}</b>
              </div>
              <div className="area-row" title="Vehicles in view / moving right now">
                <span className="ado ad-green" />FLEET
                <b>{area.vehicles}</b>
                {area.moving > 0 && <i>{area.moving} moving</i>}
              </div>
              <div className="area-row" title="Open SOS incidents in view">
                <span className="ado ad-orange" />SOS
                <b>{area.sos}</b>
              </div>
              <div className="area-row" title="Flooded zones in view + max depth">
                <span className="ado ad-blue" />FLOOD
                <b>{area.floodedZones}</b>
                {area.maxDepth > 0 && <i>{area.maxDepth.toFixed(1)}m</i>}
              </div>
            </div>
          ) : (
            <div className="deck-empty">zoom / pan the map to populate</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- base layers ----------------

function BaseLayers(props: { world: WorldState; layers: Record<LayerKey, boolean>; inv: number }) {
  const { world, layers, inv } = props;
  return (
    <>
      <Landscape />
      <RiverAndCoast />
      {layers.zones && <ZoneLabels world={world} inv={inv} />}
    </>
  );
}

// ---------------- smart overflow clustering ----------------

interface ClusterGroup<T> {
  pos: CityPoint;
  items: T[];
}

function clusterByScreen<T extends { id: string; pos: CityPoint }>(
  items: T[],
  screenPx: number,
  inv: number
): ClusterGroup<T>[] {
  const r = Math.max(1, screenPx * inv);
  const out: ClusterGroup<T>[] = [];
  for (const it of items) {
    let placed = false;
    for (const c of out) {
      if (distPoint(c.pos, it.pos) <= r) {
        const n = c.items.length;
        c.pos = {
          x: (c.pos.x * n + it.pos.x) / (n + 1),
          y: (c.pos.y * n + it.pos.y) / (n + 1),
        };
        c.items.push(it);
        placed = true;
        break;
      }
    }
    if (!placed) out.push({ pos: it.pos, items: [it] });
  }
  return out;
}

function ClusterBadge({
  x,
  y,
  count,
  color,
  inv,
  pulse,
  tip,
  onHover,
  onLeave,
  onClusterClick,
}: {
  x: number;
  y: number;
  count: number;
  color: string;
  inv: number;
  pulse?: boolean;
  tip: string;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
  onClusterClick: (x: number, y: number) => void;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${inv})`}
      className="poi clu"
      onPointerEnter={() => onHover(x, y, tip)}
      onPointerLeave={onLeave}
      onClick={() => onClusterClick(x, y)}
    >
      {pulse && <circle r={15} fill="none" stroke={color} strokeWidth={2.5} className="clu-ring" />}
      <circle r={15} fill="#0b1220" stroke={color} strokeWidth={2.5} />
      <circle r={11} fill={color} opacity={0.18} />
      <text y={4.5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#f8fafc" fontFamily="JetBrains Mono, monospace">
        {count}
      </text>
    </g>
  );
}

function clusterTip(items: string[], kindLabel: string): string {
  const list = items
    .slice(0, 5)
    .map((n) => `<div class="tt-row">${n}</div>`)
    .join('');
  const more = items.length > 5 ? `<div class="tt-row dim">+ ${items.length - 5} more…</div>` : '';
  return `<div class="tt-title">${kindLabel} · ${items.length} here</div>${list}${more}<div class="tt-foot">hover: preview · click: zoom in</div>`;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

const BLOCKS: Block[] = (() => {
  const rng = worldRng(SEED + 101);
  const zones = buildZones(worldRng(SEED));
  const plan: { zone: ZoneId; count: number; wMin: number; wMax: number; fill: string }[] = [
    { zone: 'C', count: 150, wMin: 55, wMax: 135, fill: '#ddd8cb' },
    { zone: 'D', count: 46, wMin: 140, wMax: 280, fill: '#d4cfc0' },
    { zone: 'E', count: 34, wMin: 60, wMax: 140, fill: '#e2ded2' },
    { zone: 'A', count: 26, wMin: 55, wMax: 120, fill: '#ded9cd' },
    { zone: 'B', count: 22, wMin: 60, wMax: 150, fill: '#ddd9cd' },
    { zone: 'F', count: 18, wMin: 90, wMax: 210, fill: '#d4d0c3' },
  ];
  const out: Block[] = [];
  for (const p of plan) {
    const z = zones.find((z) => z.id === p.zone);
    if (!z) continue;
    for (let i = 0; i < p.count; i++) {
      const w = rng.nextFloat(p.wMin, p.wMax);
      const h = rng.nextFloat(p.wMin, p.wMax);
      const x = rng.nextFloat(z.polygon[0].x, z.polygon[2].x) - w / 2;
      const y = rng.nextFloat(z.polygon[0].y, z.polygon[2].y) - h / 2;
      if (pointInPolygon({ x: x + w / 2, y: y + h / 2 }, z.polygon)) {
        out.push({ x, y, w, h, fill: p.fill });
      }
    }
  }
  return out;
})();

function Landscape() {
  return (
    <g>
      {BLOCKS.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={b.fill} opacity={0.55} />
      ))}
      <g fill="#a7d79d" stroke="#93c98a" strokeWidth={1.5} opacity={0.7}>
        <rect x={9100} y={4150} width={760} height={560} rx={40} />
        <rect x={11400} y={2600} width={380} height={560} rx={40} />
        <rect x={4000} y={9800} width={520} height={420} rx={40} />
      </g>
      <g fill="#8ec9e8" opacity={0.75}>
        <rect x={2850} y={7050} width={430} height={320} rx={60} />
        <rect x={5450} y={8450} width={360} height={240} rx={60} />
        <rect x={1900} y={3600} width={300} height={420} rx={60} />
      </g>
    </g>
  );
}

function RoadsLayer({ world, onlyBad }: { world: WorldState; onlyBad?: boolean }) {
  const roads = onlyBad ? world.roads.filter((r) => r.flooded || r.closed || r.damaged) : world.roads;
  return (
    <g>
      {roads.map((r) => {
        const overall = r.damaged || r.closed;
        const filled = overall || r.flooded;
        const casing = r.damaged ? '#d33d3d' : r.flooded || r.closed ? '#3b6fd4' : roadCasing(r.kind);
        const stroke = r.damaged ? '#e84a4a' : r.flooded || r.closed ? '#5b8ee8' : roadFill(r.kind);
        const width = r.kind === 'highway' ? 3.6 : r.kind === 'arterial' ? 2.6 : r.kind === 'bridge' ? 3 : 1.8;
        const dash = filled ? '6 4' : undefined;
        return (
          <g key={r.id}>
            <line
              x1={r.from.x}
              y1={r.from.y}
              x2={r.to.x}
              y2={r.to.y}
              stroke={casing}
              strokeWidth={width + 2.5}
              strokeLinecap="round"
              strokeDasharray={dash}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={r.from.x}
              y1={r.from.y}
              x2={r.to.x}
              y2={r.to.y}
              stroke={stroke}
              strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={dash}
              opacity={overall ? 0.95 : 1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </g>
  );
}

function RoadStatusLabels({ world, inv }: { world: WorldState; inv: number }) {
  const bad = world.roads.filter((r) => r.flooded || r.closed || r.damaged);
  return (
    <g>
      {bad.map((r) => {
        const mx = (r.from.x + r.to.x) / 2;
        const my = (r.from.y + r.to.y) / 2;
        const label = r.damaged ? 'DAMAGED' : r.closed ? 'BLOCKED' : 'FLOODED';
        return (
          <g key={`${r.id}-lbl`} transform={`translate(${mx} ${my}) scale(${inv})`}>
            <text
              y={0}
              textAnchor="middle"
              fontSize={8}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={700}
              fill={r.damaged ? '#ef4444' : r.closed ? '#ef4444' : '#2563eb'}
              stroke="#ffffff"
              strokeWidth={2.5}
              paintOrder="stroke"
              opacity={0.85}
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function roadFill(kind: RoadKind): string {
  switch (kind) {
    case 'highway':
      return '#f9e9c4';
    case 'bridge':
      return '#e6e8ea';
    default:
      return '#ffffff';
  }
}

function roadCasing(kind: RoadKind): string {
  switch (kind) {
    case 'highway':
      return '#cbaa5e';
    case 'bridge':
      return '#9aa1a8';
    default:
      return '#c9cfd4';
  }
}

function RiverAndCoast() {
  const riverD = pathD(RIVER_PATH);
  return (
    <g>
      <path d={riverD} fill="none" stroke="#6fb2dd" strokeWidth={11} strokeLinecap="round" opacity={0.95} vectorEffect="non-scaling-stroke" />
      <path d={riverD} fill="none" stroke="#a8d4ec" strokeWidth={5} strokeLinecap="round" opacity={0.95} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function pathD(points: CityPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

function ZoneLabels({ world, inv }: { world: WorldState; inv: number }) {
  return (
    <g>
      {world.zones.map((z) => (
        <g key={z.id}>
          <polygon
            points={polyPoints(z.polygon)}
            fill="none"
            stroke="#a8b4c6"
            strokeWidth={1.2}
            strokeDasharray="10 8"
            opacity={0.55}
            vectorEffect="non-scaling-stroke"
          />
          <g transform={`translate(${z.center.x} ${z.center.y + 90}) scale(${inv})`}>
            <text
              y={-8}
              textAnchor="middle"
              fill="rgba(51, 65, 85, 0.62)"
              stroke="#ffffff"
              strokeWidth={3}
              paintOrder="stroke"
              fontSize={10}
              letterSpacing={2}
            >
              ZONE {z.id}
            </text>
            <text
              y={8}
              textAnchor="middle"
              fill="rgba(71, 85, 105, 0.6)"
              stroke="#ffffff"
              strokeWidth={2.5}
              paintOrder="stroke"
              fontSize={8.5}
            >
              {z.name} · {ZONE_META[z.id].elevationM}m
            </text>
            {z.evacDone && (
              <text y={30} textAnchor="middle" fontSize={12} fontWeight={700} fill="#059669" stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontFamily="JetBrains Mono, monospace">
                ✓ CLEARED
              </text>
            )}
            {z.evacuating && !z.evacDone && (
              <text y={30} textAnchor="middle" fontSize={12} fontWeight={700} fill="#d97706" stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontFamily="JetBrains Mono, monospace" className="pulse">
                ▸ EVACUATING
              </text>
            )}
          </g>
        </g>
      ))}
    </g>
  );
}

function polyPoints(poly: CityPoint[]): string {
  return poly.map((p) => `${p.x},${p.y}`).join(' ');
}

// ---------------- flood: irregular pockets along roads & water ----------------

interface FloodPocket {
  cx: number;
  cy: number;
  pts: CityPoint[];
  order: number;
}

const FLOOD_POCKETS: Record<ZoneId, FloodPocket[]> = (() => {
  const rng = worldRng(SEED + 99);
  const zones = buildZones(worldRng(SEED));
  const roads = buildRoads(zones, worldRng(SEED + 7));
  const out = {} as Record<ZoneId, FloodPocket[]>;
  for (const z of zones) {
    const anchors: CityPoint[] = [];
    for (const r of roads) {
      if (r.zone === z.id || distPoint(r.from, z.center) < 1800) {
        anchors.push({ x: (r.from.x + r.to.x) / 2, y: (r.from.y + r.to.y) / 2 });
      }
    }
    for (let i = 0; i < RIVER_PATH.length - 1; i += 1) {
      const a = RIVER_PATH[i];
      if (distPoint(a, z.center) < 2200) anchors.push({ x: (a.x + RIVER_PATH[i + 1].x) / 2, y: (a.y + RIVER_PATH[i + 1].y) / 2 });
    }
    anchors.push({ x: z.center.x, y: z.center.y });
    const n = Math.min(anchors.length, 10);
    const pockets: FloodPocket[] = [];
    for (let i = 0; i < n; i++) {
      const a = anchors[i];
      const rBase = rng.nextFloat(620, 1250);
      const count = rng.nextInt(8, 13);
      const pts: CityPoint[] = [];
      for (let k = 0; k < count; k++) {
        const ang = (k / count) * Math.PI * 2;
        const rr = rBase * rng.nextFloat(0.55, 1.15);
        pts.push({ x: a.x + Math.cos(ang) * rr, y: a.y + Math.sin(ang) * rr });
      }
      pockets.push({ cx: a.x, cy: a.y, pts, order: rng.nextFloat(0, 1) });
    }
    pockets.sort((a, b) => a.order - b.order);
    out[z.id] = pockets;
  }
  return out;
})();

function distPoint(a: CityPoint, b: CityPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function FloodLayer(props: {
  world: WorldState;
  layers: Record<LayerKey, boolean>;
  flood: { zone: ZoneId; depth: number; level: number }[];
  forecast: boolean;
}) {
  const { world, layers, flood, forecast } = props;
  if (!layers.flood) return null;
  return (
    <g>
      {world.zones.map((z) => {
        const f = flood.find((ff) => ff.zone === z.id);
        const depth = f?.depth ?? 0;
        if (depth <= 0.01) return null;
        const pockets = FLOOD_POCKETS[z.id] ?? [];
        const expansion = Math.min(1, depth / 1.6);
        const shown = Math.max(1, Math.round(pockets.length * expansion));
        const scale = 0.45 + 0.55 * expansion;
        const opacity = 0.16 + 0.22 * expansion;
        return (
          <g key={z.id}>
            {pockets.slice(0, shown).map((p, i) => {
              const pts = p.pts.map((pt) => ({ x: p.cx + (pt.x - p.cx) * scale, y: p.cy + (pt.y - p.cy) * scale }));
              return (
                <g key={i} style={{ transition: 'all 1.4s ease' }}>
                  <polygon
                    points={polyPoints(pts)}
                    fill={forecast ? 'rgba(139, 92, 246, 0.28)' : 'rgba(37, 99, 235, 0.34)'}
                    stroke={forecast ? '#8b5cf6' : '#3b82f6'}
                    strokeWidth={1.4}
                    strokeDasharray="14 10"
                    className="flood-wave"
                    opacity={opacity}
                    style={{ transition: 'opacity 1.4s ease' }}
                  />
                </g>
              );
            })}
            <g transform={`translate(${z.center.x} ${z.center.y + 130})`}>
              <text
                textAnchor="middle"
                fill="#ffffff"
                stroke="#1e4f9e"
                strokeWidth={2.5}
                paintOrder="stroke"
                fontSize={12}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
                opacity={0.9}
              >
                {depth.toFixed(1)}m
              </text>
            </g>
          </g>
        );
      })}
      {forecast && (
        <text x={W / 2} y={60} textAnchor="middle" fill="#c4b5fd" fontSize={20} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
          ⧗ AI FORECAST — FUTURE FLOOD EXTENT ⧗
        </text>
      )}
    </g>
  );
}

// ---------------- weather / cyclone ----------------

function WeatherLayer({ world, shownTick, inv }: { world: WorldState; shownTick: number; inv: number }) {
  const rain = world.rainfallMmHr;
  const visible = shownTick >= 0 && shownTick <= 46;
  const landfall = STORM_PATH[STORM_PATH.length - 1];
  return (
    <g>
      {visible && rain > 4 && (
        <g>
          {RAIN_LINES.map((l, i) => (
            <line
              key={i}
              x1={l.x}
              y1={l.y}
              x2={l.x + 4}
              y2={l.y + l.len}
              stroke="rgba(147, 197, 253, 0.55)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className="rain-line"
              style={{ animationDelay: `${l.delay}s` }}
            />
          ))}
        </g>
      )}
      {world.stormOnscreen && shownTick <= 34 && (
        <g>
          {/* wind radii */}
          <circle cx={world.storm.x} cy={world.storm.y} r={1500} fill="rgba(34, 211, 238, 0.06)" stroke="rgba(34, 211, 238, 0.35)" strokeWidth={1.5} strokeDasharray="6 8" />
          <circle cx={world.storm.x} cy={world.storm.y} r={900} fill="rgba(34, 211, 238, 0.08)" stroke="rgba(34, 211, 238, 0.5)" strokeWidth={1.5} />

          {/* predicted track + cone of uncertainty */}
          <polygon
            points={[
              world.storm.x, world.storm.y - 260,
              landfall.x - 1750, landfall.y - 300,
              landfall.x + 1750, landfall.y + 300,
              world.storm.x, world.storm.y + 260,
            ].join(' ')}
            fill="rgba(34, 211, 238, 0.07)"
            stroke="none"
          />
          <path d={pathD(STORM_PATH)} fill="none" stroke="rgba(250, 255, 255, 0.85)" strokeWidth={2.5} strokeDasharray="3 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={pathD(STORM_PATH)} fill="none" stroke="rgba(34, 211, 238, 0.85)" strokeWidth={1.5} strokeDasharray="3 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <g transform={`translate(${landfall.x} ${landfall.y}) scale(${inv})`}>
            <text y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill="#0e7490" stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontFamily="JetBrains Mono, monospace">
              LAND FALL (PROJECTED)
            </text>
          </g>

          {/* cyclone core */}
          <circle cx={world.storm.x} cy={world.storm.y} r={460} fill="rgba(34, 211, 238, 0.1)" />
          <g transform={`translate(${world.storm.x} ${world.storm.y}) scale(${inv})`}>
            {[0, 1, 2, 3].map((i) => (
              <circle key={i} r={70 + i * 30} fill="none" stroke="rgba(34, 211, 238, 0.9)" strokeWidth={2}>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`${i * 90} 0 0`}
                  to={`${i * 90 + 360} 0 0`}
                  dur={`${5 + i}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
            <circle r={26} fill="#fbbf24">
              <animate attributeName="r" values="22;30;22" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <text y={-105} textAnchor="middle" fill="#0e7490" stroke="#ffffff" strokeWidth={4} paintOrder="stroke" fontSize={17} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
              🌀 CYCLONE VARUN — SEVERE CYCLONIC STORM
            </text>
            <text y={-82} textAnchor="middle" fill="#0e7490" stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontSize={12} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
              WIND {Math.round(world.windKmh)} km/h · RAIN {rain.toFixed(0)} mm/h · MOVING NW
            </text>
            <text y={-60} textAnchor="middle" fill="#0e7490" stroke="#ffffff" strokeWidth={2.5} paintOrder="stroke" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
              SEVERE CYCLONIC STORM · 970 hPa · NW 12 km/h
            </text>
          </g>
        </g>
      )}
      {shownTick > 34 && shownTick <= 46 && (
        <g transform={`translate(${world.storm.x} ${world.storm.y}) scale(${inv})`}>
          <text y={-40} textAnchor="middle" fill="#fb923c" fontSize={16} fontFamily="JetBrains Mono, monospace">
            landfall · dissipating
          </text>
        </g>
      )}
    </g>
  );
}

// ---------------- emergency unit stations ----------------

function UnitsLayer({
  units,
  inv,
  onHover,
  onLeave,
  onClusterClick,
}: {
  units: UnitStation[];
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
  onClusterClick: (x: number, y: number) => void;
}) {
  const clusters = clusterByScreen(units, 20, inv);
  return (
    <g>
      {clusters.map((c, ci) =>
        c.items.length > 1 ? (
          <ClusterBadge
            key={`clu-${ci}`}
            x={c.pos.x}
            y={c.pos.y}
            count={c.items.length}
            color="#94a3b8"
            inv={inv}
            tip={clusterTip(c.items.map((u) => u.name), 'STATIONS')}
            onHover={onHover}
            onLeave={onLeave}
            onClusterClick={onClusterClick}
          />
        ) : (
          <UnitMarker key={c.items[0].id} u={c.items[0]} inv={inv} onHover={onHover} onLeave={onLeave} />
        )
      )}
    </g>
  );
}

function UnitMarker({
  u,
  inv,
  onHover,
  onLeave,
}: {
  u: UnitStation;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
}) {
  return (
    <g
      key={u.id}
      transform={`translate(${u.pos.x} ${u.pos.y}) scale(${inv})`}
      className="poi"
      onPointerEnter={() => onHover(u.pos.x, u.pos.y, unitTip(u))}
      onPointerLeave={onLeave}
    >
      {u.kind === 'fire' ? <FireIcon /> : <PoliceIcon />}
    </g>
  );
}

function FireIcon() {
  return (
    <g>
      <circle r={14} fill="#7f1d1d" stroke="#ef4444" strokeWidth={2} />
      <path
        d="M0 -8 C -4.5 -4, -4.5 1, -1.5 3 C -3 5, -2 8, 1.5 8 C 5 8, 5.5 3.5, 3.5 1.5 C 3 2, 2.5 2.2, 2 2 C 2.5 0, 2 -5, 0 -8 Z"
        fill="#fca5a5"
      />
      <path d="M0 -8 C -2.5 -5, -3 -1, -1.5 1.5 C -2.5 3, -1.5 5.5, 0 5.5 C 1.5 5.5, 2 3, 1 1.5 C 1.5 1, 1.8 0.5, 1.5 0 C 1.8 -3, 1 -7, 0 -8 Z" fill="#ef4444" />
    </g>
  );
}

function PoliceIcon() {
  return (
    <g>
      <circle r={14} fill="#1e3a8a" stroke="#60a5fa" strokeWidth={2} />
      <path
        d="M0 -8 L1.8 -4.2 L5.9 -3.9 L3.2 -1 L3.9 2.9 L0 1.1 L-3.9 2.9 L-3.2 -1 L-5.9 -3.9 L-1.8 -4.2 Z"
        fill="#ffffff"
        stroke="#93c5fd"
        strokeWidth={0.6}
      />
    </g>
  );
}

// ---------------- hospitals ----------------

function HospitalsLayer({
  world,
  inv,
  onHover,
  onLeave,
  onClusterClick,
}: {
  world: WorldState;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
  onClusterClick: (x: number, y: number) => void;
}) {
  const clusters = clusterByScreen(world.hospitals, 27, inv);
  return (
    <g>
      {clusters.map((c, ci) =>
        c.items.length > 1 ? (
          <ClusterBadge
            key={`clu-${ci}`}
            x={c.pos.x}
            y={c.pos.y}
            count={c.items.length}
            color="#22c55e"
            inv={inv}
            tip={clusterTip(c.items.map((h) => h.name), 'HOSPITALS')}
            onHover={onHover}
            onLeave={onLeave}
            onClusterClick={onClusterClick}
          />
        ) : (
          <HospitalMarker key={c.items[0].id} h={c.items[0]} world={world} inv={inv} onHover={onHover} onLeave={onLeave} />
        )
      )}
    </g>
  );
}

function HospitalMarker({
  h,
  world,
  inv,
  onHover,
  onLeave,
}: {
  h: Hospital;
  world: WorldState;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
}) {
  const color = h.capacityPct >= 90 ? '#ef4444' : h.capacityPct >= 75 ? '#f97316' : h.capacityPct >= 60 ? '#facc15' : '#22c55e';
  return (
    <g
      transform={`translate(${h.pos.x} ${h.pos.y}) scale(${inv})`}
      className="poi"
      onPointerEnter={() => onHover(h.pos.x, h.pos.y, hospitalTip(h, world))}
      onPointerLeave={onLeave}
    >
      <circle r={16} fill="rgba(2, 6, 23, 0.88)" stroke={color} strokeWidth={2.5} />
      <line x1={-6.6} y1={0} x2={6.6} y2={0} stroke="#ffffff" strokeWidth={3.2} />
      <line x1={0} y1={-6.6} x2={0} y2={6.6} stroke="#ffffff" strokeWidth={3.2} />
      {h.capacityPct >= 95 && <circle r={19.5} fill="none" stroke="#ef4444" strokeWidth={1.5} className="sos-marker" />}
    </g>
  );
}

// ---------------- shelters ----------------

function SheltersLayer({
  world,
  inv,
  onHover,
  onLeave,
  onClusterClick,
}: {
  world: WorldState;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
  onClusterClick: (x: number, y: number) => void;
}) {
  const clusters = clusterByScreen(world.shelters, 22, inv);
  return (
    <g>
      {clusters.map((c, ci) =>
        c.items.length > 1 ? (
          <ClusterBadge
            key={`clu-${ci}`}
            x={c.pos.x}
            y={c.pos.y}
            count={c.items.length}
            color="#fbbf24"
            inv={inv}
            tip={clusterTip(c.items.map((s) => s.name), 'SHELTERS')}
            onHover={onHover}
            onLeave={onLeave}
            onClusterClick={onClusterClick}
          />
        ) : (
          <ShelterMarker key={c.items[0].id} s={c.items[0]} inv={inv} onHover={onHover} onLeave={onLeave} />
        )
      )}
    </g>
  );
}

function ShelterMarker({
  s,
  inv,
  onHover,
  onLeave,
}: {
  s: Shelter;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
}) {
  const open = s.openedAtTick > 0;
  const fill = Math.round((s.occupancy / s.capacity) * 100);
  const arc = Math.round((fill / 100) * 2 * Math.PI * 15);
  const color = fill >= 85 ? '#ef4444' : fill >= 65 ? '#f97316' : '#facc15';
  return (
    <g
      transform={`translate(${s.pos.x} ${s.pos.y}) scale(${inv})`}
      className="poi"
      onPointerEnter={() => onHover(s.pos.x, s.pos.y, shelterTip(s, open))}
      onPointerLeave={onLeave}
    >
      {open && (
        <circle
          r={15}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={`${arc} ${2 * Math.PI * 15 - arc}`}
          transform="rotate(-90)"
        />
      )}
      <g transform="translate(0 -3)">
        <path d="M-7 2.5 L0 -6 L7 2.5 Z" fill={open ? '#78350f' : '#334155'} stroke={open ? '#fbbf24' : '#94a3b8'} strokeWidth={1.4} strokeLinejoin="round" />
        <rect x={-4.8} y={2.5} width={9.6} height={6.5} rx={0.8} fill={open ? '#fbbf24' : '#64748b'} />
      </g>
    </g>
  );
}

// ---------------- vehicles ----------------

function vehicleHeading(v: Vehicle): number {
  if (v.path.length < 2 || v.pathProgress >= 1) return 0;
  const a = pointOnPath(v.path, Math.min(1, v.pathProgress + 0.01));
  return (Math.atan2(a.y - v.pos.y, a.x - v.pos.x) * 180) / Math.PI;
}

function VehiclesLayer({
  vehicles,
  inv,
  onHover,
  onLeave,
  onClusterClick,
}: {
  vehicles: Vehicle[];
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
  onClusterClick: (x: number, y: number) => void;
}) {
  const clusters = clusterByScreen(vehicles, 17, inv);
  return (
    <g>
      {clusters.map((c, ci) =>
        c.items.length > 1 ? (
          <ClusterBadge
            key={`clu-${ci}`}
            x={c.pos.x}
            y={c.pos.y}
            count={c.items.length}
            color={vehicleColor(c.items[0].kind)}
            inv={inv}
            tip={clusterTip(c.items.map((v) => v.name), 'FLEET')}
            onHover={onHover}
            onLeave={onLeave}
            onClusterClick={onClusterClick}
          />
        ) : (
          <VehicleMarker key={c.items[0].id} v={c.items[0]} inv={inv} onHover={onHover} onLeave={onLeave} />
        )
      )}
    </g>
  );
}

function VehicleMarker({
  v,
  inv,
  onHover,
  onLeave,
}: {
  v: Vehicle;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
}) {
  const active = v.status !== 'idle';
  const heading = vehicleHeading(v);
  const scaleOf = v.kind === 'ambulance' ? 0.75 : v.kind === 'boat' ? 0.8 : v.kind === 'drone' ? 0.85 : 0.8;
  return (
    <g
      className={`veh-move ${active ? 'veh-active' : ''}`}
      style={{ transform: `translate(${v.pos.x}px, ${v.pos.y}px) scale(${inv * scaleOf}) rotate(${heading}deg)` }}
      onPointerEnter={() => onHover(v.pos.x, v.pos.y, vehicleTip(v))}
      onPointerLeave={onLeave}
    >
      {active && <circle r={13} fill="none" stroke={vehicleColor(v.kind)} strokeWidth={1.5} opacity={0.5} />}
      {v.kind === 'ambulance' && <AmbulanceIcon active={active} />}
      {v.kind === 'boat' && <BoatIcon active={active} />}
      {v.kind === 'drone' && <DroneIcon active={active} />}
      {v.kind === 'relief' && <ReliefIcon active={active} />}
    </g>
  );
}

function vehicleColor(kind: Vehicle['kind']): string {
  switch (kind) {
    case 'ambulance':
      return '#f87171';
    case 'boat':
      return '#22d3ee';
    case 'drone':
      return '#a78bfa';
    default:
      return '#fb923c';
  }
}

function AmbulanceIcon({ active }: { active: boolean }) {
  return (
    <g>
      <rect x={-11} y={-6.5} width={17} height={12} rx={2.5} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.2} />
      <path d="M6 -6.5 L10 -6.5 Q13 -6.5 13 -3.5 L13 2.5 Q13 5.5 10 5.5 L6 5.5 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth={1.2} />
      <rect x={-4} y={-8.5} width={9} height={3.2} rx={1.2} fill={active ? '#fbbf24' : '#94a3b8'} />
      <line x1={-6} y1={-3} x2={-6} y2={3} stroke="#ef4444" strokeWidth={3.4} />
      <line x1={-9} y1={0} x2={-3} y2={0} stroke="#ef4444" strokeWidth={3.4} />
    </g>
  );
}

function BoatIcon({ active }: { active: boolean }) {
  return (
    <g>
      <path d="M-11 -2 L-9 -7 L7 -7 L11 -2 Z" fill="#ecfeff" stroke="#155e75" strokeWidth={1.2} />
      <path d="M-12 0 L12 0 L9 6 L-9 6 Z" fill="#22d3ee" stroke="#155e75" strokeWidth={1.2} />
      <line x1={-6} y1={-7} x2={-6} y2={0} stroke="#155e75" strokeWidth={1.6} />
      {active && <line x1={-6} y1={-7} x2={6} y2={0} stroke="#155e75" strokeWidth={1} opacity={0.6} />}
    </g>
  );
}

function DroneIcon({ active }: { active: boolean }) {
  return (
    <g>
      <line x1={-7} y1={-7} x2={7} y2={7} stroke="#6d28d9" strokeWidth={1.6} />
      <line x1={7} y1={-7} x2={-7} y2={7} stroke="#6d28d9" strokeWidth={1.6} />
      <circle cx={-7} cy={-7} r={2.2} fill="#a78bfa" />
      <circle cx={7} cy={-7} r={2.2} fill="#a78bfa" />
      <circle cx={-7} cy={7} r={2.2} fill="#a78bfa" />
      <circle cx={7} cy={7} r={2.2} fill="#a78bfa" />
      <circle r={4} fill={active ? '#a78bfa' : '#7c3aed'} stroke="#f5f3ff" strokeWidth={1} />
    </g>
  );
}

function ReliefIcon({ active }: { active: boolean }) {
  return (
    <g>
      <rect x={-10} y={-6} width={12} height={12} rx={2} fill={active ? '#fb923c' : '#c2410c'} stroke="#431407" strokeWidth={1.2} />
      <path d="M2 -6 L6 -6 Q9 -6 9 -3 L9 3 Q9 6 6 6 L2 6 Z" fill="#ffedd5" stroke="#431407" strokeWidth={1.2} />
      <circle cx={-4} cy={6} r={2} fill="#0f172a" />
      <circle cx={6} cy={6} r={2} fill="#0f172a" />
    </g>
  );
}

// ---------------- SOS ----------------

function sosColor(u: number): string {
  if (u >= 10) return '#dc2626';
  if (u >= 7) return '#ea580c';
  if (u >= 4) return '#d97706';
  return '#64748b';
}

function SosLayer({
  world,
  inv,
  onHover,
  onLeave,
  onClusterClick,
}: {
  world: WorldState;
  inv: number;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
  onClusterClick: (x: number, y: number) => void;
}) {
  const pending = world.sos.filter((s) => s.status === 'pending' || s.status === 'dispatched');
  const clusters = clusterByScreen(pending, 32, inv);
  return (
    <g>
      {clusters.map((c, ci) =>
        c.items.length > 1 ? (
          <ClusterBadge
            key={`clu-${ci}`}
            x={c.pos.x}
            y={c.pos.y}
            count={c.items.length}
            color={sosColor(Math.max(...c.items.map((s) => s.urgency)))}
            inv={inv}
            pulse
            tip={clusterTip(
              c.items.map((s) => `🆘 SOS #${s.id.replace(/\D/g, '')} · P${s.urgency}`),
              'INCIDENTS'
            )}
            onHover={onHover}
            onLeave={onLeave}
            onClusterClick={onClusterClick}
          />
        ) : (
          <SosMarker key={c.items[0].id} s={c.items[0]} inv={inv} world={world} onHover={onHover} onLeave={onLeave} />
        )
      )}
    </g>
  );
}

function SosMarker({
  s,
  inv,
  world,
  onHover,
  onLeave,
}: {
  s: SosIncident;
  inv: number;
  world: WorldState;
  onHover: (x: number, y: number, content: string) => void;
  onLeave: () => void;
}) {
  const color = sosColor(s.urgency);
  const crit = s.urgency >= 10;
  return (
    <g
      transform={`translate(${s.pos.x} ${s.pos.y}) scale(${inv})`}
      className="poi"
      onPointerEnter={() => onHover(s.pos.x, s.pos.y, sosTip(s, world))}
      onPointerLeave={onLeave}
    >
      {crit && <circle r={20} fill="none" stroke="#dc2626" strokeWidth={3} className="sos-crit" />}
      <circle r={13} fill="none" stroke={color} strokeWidth={2.5} className="sos-marker" />
      <circle r={8} fill={color} stroke="#7f1d1d" strokeWidth={1} />
      <text y={3.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#ffffff" fontFamily="JetBrains Mono, monospace">
        SOS
      </text>
    </g>
  );
}

// ---------------- social & satellite ----------------

function PostsLayer({ world }: { world: WorldState }) {
  return (
    <g>
      {world.posts.map((p) => (
        <circle key={p.id} cx={p.pos.x} cy={p.pos.y} r={5} fill={p.credibility >= 75 ? '#f472b6' : p.credibility >= 55 ? '#c084fc' : '#64748b'} opacity={0.85}>
          <title>{`${p.author}: ${p.content}`}</title>
        </circle>
      ))}
    </g>
  );
}

function HitsLayer({ world }: { world: WorldState }) {
  return (
    <g>
      {world.hits.map((h) => (
        <g key={h.id}>
          <polygon
            points={polyPoints(h.bbox)}
            fill="none"
            stroke="#f87171"
            strokeWidth={2}
            strokeDasharray="8 5"
            className="route-dash"
            vectorEffect="non-scaling-stroke"
          />
          <text x={h.pos.x} y={h.pos.y - 10} textAnchor="middle" fill="#ef4444" stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontSize={13} fontFamily="JetBrains Mono, monospace" fontWeight={700}>
            {h.kind.toUpperCase()}
          </text>
        </g>
      ))}
    </g>
  );
}

// ---------------- routes ----------------

function RoutesLayer({ world }: { world: WorldState }) {
  return (
    <g>
      {world.routes.map((r) => {
        const colorOf =
          r.kind === 'civilian' ? '#22d3ee' : r.kind === 'ambulance' ? '#f87171' : '#fb923c';
        const width = r.kind === 'ambulance' ? 4.5 : 3;
        return (
          <g key={r.id}>
            <path
              d={pathD(r.waypoints)}
              fill="none"
              stroke="#0f172a"
              strokeWidth={width + 3}
              strokeLinecap="round"
              opacity={0.5}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathD(r.waypoints)}
              fill="none"
              stroke={colorOf}
              strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={r.kind === 'civilian' ? '14 8' : r.kind === 'ambulance' ? '2 4' : '10 6'}
              className="route-dash"
              opacity={0.95}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${r.reason} — ${(r.lengthM / 1000).toFixed(1)} km · ${Math.round(r.minutes)} min`}</title>
            </path>
          </g>
        );
      })}
    </g>
  );
}

// ---------------- tooltips ----------------

function hospitalTip(h: Hospital, world: WorldState): string {
  const color = h.capacityPct >= 90 ? '#ef4444' : h.capacityPct >= 75 ? '#f97316' : h.capacityPct >= 60 ? '#facc15' : '#22c55e';
  const near = world.vehicles.filter(
    (v) => v.kind === 'ambulance' && v.status !== 'idle' && distPoint(v.pos, h.pos) < 450
  ).length;
  return `<div class="tt-title">🏥 ${h.name}</div>
<div class="tt-row"><span>Beds</span><b>${h.occupiedBeds} / ${h.totalBeds}</b></div>
<div class="tt-row"><span>ICU</span><b>${Math.max(0, h.icuTotal - h.icuOccupied)} available</b></div>
<div class="tt-row"><span>Oxygen</span><b class="tt-${h.oxygen}">${h.oxygen.toUpperCase()}</b></div>
<div class="tt-row"><span>Emergency load</span><b style="color:${color}">${h.capacityPct}%</b></div>
<div class="tt-bar"><i style="width:${Math.min(100, h.capacityPct)}%;background:${color}"></i></div>
<div class="tt-row"><span>Ambulances nearby</span><b>${near}</b></div>
<div class="tt-foot">hover: preview · click: pin</div>`;
}

function shelterTip(s: Shelter, open: boolean): string {
  const fill = Math.round((s.occupancy / s.capacity) * 100);
  const color = fill >= 85 ? '#ef4444' : fill >= 65 ? '#f97316' : '#facc15';
  return `<div class="tt-title">🏠 ${s.name}</div>
<div class="tt-row"><span>Occupancy</span><b>${s.occupancy} / ${s.capacity} (${fill}%)</b></div>
<div class="tt-bar"><i style="width:${fill}%;background:${open ? color : '#64748b'}"></i></div>
<div class="tt-row"><span>Food</span><b class="${s.hasFood ? 'tt-ok' : 'tt-bad'}">${s.hasFood ? 'OK' : 'LOW'}</b></div>
<div class="tt-row"><span>Water</span><b class="${s.hasWater ? 'tt-ok' : 'tt-bad'}">${s.hasWater ? 'OK' : 'LOW'}</b></div>
<div class="tt-row"><span>Medical</span><b class="${s.hasMedicalStaff ? 'tt-ok' : 'tt-bad'}">${s.hasMedicalStaff ? 'Available' : 'Unavailable'}</b></div>
<div class="tt-row"><span>Women safe</span><b>${s.womenSafe ? 'Yes' : 'No'}</b></div>
<div class="tt-row"><span>Pet friendly</span><b>${s.petFriendly ? 'Yes' : 'No'}</b></div>
<div class="tt-row"><span>Status</span><b>${open ? 'OPEN' : 'STANDBY'}</b></div>`;
}

function sosTip(s: SosIncident, world: WorldState): string {
  const vehicle = s.vehicleId ? world.vehicles.find((v) => v.id === s.vehicleId) : undefined;
  return `<div class="tt-title">🆘 SOS #${s.id.replace(/\D/g, '')}</div>
<div class="tt-row">${s.description}</div>
<div class="tt-row"><span>Priority</span><b style="color:${sosColor(s.urgency)}">P${s.urgency} · ${s.urgency >= 10 ? 'CRITICAL' : s.urgency >= 7 ? 'HIGH' : s.urgency >= 4 ? 'MEDIUM' : 'LOW'}</b></div>
<div class="tt-row"><span>People</span><b>${s.peopleCount}</b></div>
<div class="tt-row"><span>Response</span><b>${vehicle ? vehicle.name : s.status === 'pending' ? 'assigning…' : '—'}</b></div>
<div class="tt-row"><span>Status</span><b>${s.status.toUpperCase()}</b></div>`;
}

function vehicleTip(v: Vehicle): string {
  const icon = v.kind === 'ambulance' ? '🚑' : v.kind === 'boat' ? '🚤' : v.kind === 'drone' ? '🚁' : '🚚';
  const dest = v.assignedSosId ? `SOS #${v.assignedSosId.replace(/\D/g, '')}` : 'Base / station';
  return `<div class="tt-title">${icon} ${v.name}</div>
<div class="tt-row"><span>Status</span><b>${v.status.toUpperCase()}</b></div>
<div class="tt-row"><span>Destination</span><b>${dest}</b></div>
<div class="tt-row"><span>ETA</span><b>${v.etaMin > 0 ? `${v.etaMin} min` : '—'}</b></div>
<div class="tt-row"><span>Speed</span><b>${v.speedKmh} km/h</b></div>`;
}

function unitTip(u: UnitStation): string {
  return `<div class="tt-title">${u.kind === 'fire' ? '🚒' : '👮'} ${u.name}</div>
<div class="tt-row"><span>Zone</span><b>${u.zone}</b></div>
<div class="tt-row"><span>Staff</span><b>${u.staffOnDuty} on duty</b></div>
<div class="tt-row"><span>Status</span><b>${u.status === 'ready' ? 'READY' : 'DEPLOYED'}</b></div>`;
}

// ---------------- HUD ----------------

function LayerToggles() {
  const layers = useSimulation((s) => s.ui.layers);
  const toggleLayer = useSimulation((s) => s.toggleLayer);
  return (
    <div className="layer-list hud-card">
      <div className="hud-heading">EOC LAYERS</div>
      <div className="layer-grid">
        {PRIMARY_LAYERS.map((m) => (
          <div key={m.key} className={`layer-row ${layers[m.key] ? 'on' : 'off'}`} onClick={() => toggleLayer(m.key)}>
            <span className="swatch" />
            {m.icon} {m.label}
          </div>
        ))}
      </div>
      <div className="hud-heading sub">DATA OVERLAYS</div>
      <div className="layer-grid">
        {EXTRA_LAYERS.map((m) => (
          <div key={m.key} className={`layer-row ${layers[m.key] ? 'on' : 'off'}`} onClick={() => toggleLayer(m.key)}>
            <span className="swatch" />
            {m.icon} {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="map-legend">
      <div className="hud-heading">MAP LEGEND</div>
      <div className="legend-grid">
        <LegendRow color="#22c55e" shape="cross" label="Hospital · ring = load" />
        <LegendRow color="#dc2626" shape="sos" label="SOS · pulsing = critical" />
        <LegendRow color="#f87171" shape="ambulance" label="Ambulance" />
        <LegendRow color="#fbbf24" shape="house" label="Shelter · open = amber" />
        <LegendRow color="#22d3ee" shape="boat" label="Rescue Boat" />
        <LegendRow color="#a78bfa" shape="drone" label="Drone" />
        <LegendRow color="#fb923c" shape="relief" label="Relief Truck" />
        <LegendRow color="#b91c1c" shape="fire" label="Fire Station" />
        <LegendRow color="#1e3a8a" shape="police" label="Police Station" />
        <LegendRow color="#22d3ee" shape="dash" label="Emergency Route" />
        <LegendRow color="#ef4444" shape="dashred" label="Blocked / Damaged" />
        <LegendRow color="#3b82f6" shape="flood" label="Flood Extent" />
        <LegendRow color="#0e7490" shape="cyclone" label="Cyclone Track" />
        <LegendRow color="#94a3b8" shape="cluster" label="Cluster · click to zoom" />
      </div>
    </div>
  );
}

function LegendRow({ color, shape, label }: { color: string; shape: string; label: string }) {
  const icon =
    shape === 'cross' ? (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <circle r="4.6" fill="#0b1220" stroke={color} strokeWidth="1.2" />
        <line x1="-2.4" y1="0" x2="2.4" y2="0" stroke="#fff" strokeWidth="1.4" />
        <line x1="0" y1="-2.4" x2="0" y2="2.4" stroke="#fff" strokeWidth="1.4" />
      </svg>
    ) : shape === 'house' ? (
      <svg width="11" height="11" viewBox="0 0 11 11">
        <path d="M1.5 5 L5.5 1 L9.5 5 L9.5 10 L1.5 10 Z" fill={color} stroke="#0b1220" strokeWidth="0.8" />
      </svg>
    ) : shape === 'ambulance' ? (
      <svg width="12" height="10" viewBox="-6 -5 12 10">
        <rect x="-5" y="-3.4" width="7" height="6.8" rx="1" fill="#f8fafc" stroke={color} strokeWidth="1" />
        <line x1="-3.6" y1="-1" x2="-3.6" y2="1" stroke={color} strokeWidth="1.4" />
        <line x1="-4.6" y1="0" x2="-2.6" y2="0" stroke={color} strokeWidth="1.4" />
      </svg>
    ) : shape === 'boat' ? (
      <svg width="12" height="9" viewBox="-6 -4 12 9">
        <path d="M-5.5 1 L-4 -3 L4 -3 L5.5 1 L5 4 L-5 4 Z" fill={color} />
      </svg>
    ) : shape === 'drone' ? (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <line x1="-3.4" y1="-3.4" x2="3.4" y2="3.4" stroke={color} strokeWidth="1" />
        <line x1="3.4" y1="-3.4" x2="-3.4" y2="3.4" stroke={color} strokeWidth="1" />
        <circle r="1.6" fill={color} />
      </svg>
    ) : shape === 'sos' ? (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <circle r="4.6" fill="none" stroke={color} strokeWidth="1.4" />
        <circle r="2.4" fill={color} />
      </svg>
    ) : shape === 'fire' ? (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <circle r="4.6" fill="#7f1d1d" stroke={color} strokeWidth="1.2" />
        <path d="M0 -2.6 C-1.8 -1 -1.8 0.4 -0.6 1.2 C-1.1 2 -0.6 3 0 3 C0.8 3 1 1.8 0.5 1 C1 0.4 1.1 -1 0 -2.6 Z" fill="#fca5a5" />
      </svg>
    ) : shape === 'police' ? (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <circle r="4.6" fill="#1e3a8a" stroke={color} strokeWidth="1.2" />
        <path d="M0 -2.8 L1 0.6 L-1.8 -1.2 L1.8 -1.2 L-1 0.6 Z" fill="#fff" />
      </svg>
    ) : shape === 'dash' ? (
      <svg width="12" height="5" viewBox="0 0 12 5">
        <line x1="0" y1="2.5" x2="12" y2="2.5" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
      </svg>
    ) : shape === 'dashred' ? (
      <svg width="12" height="5" viewBox="0 0 12 5">
        <line x1="0" y1="2.5" x2="12" y2="2.5" stroke={color} strokeWidth="2.2" strokeDasharray="2 2" />
      </svg>
    ) : shape === 'relief' ? (
      <svg width="11" height="9" viewBox="-5 -4 10 9">
        <rect x="-4.4" y="-2.6" width="5" height="5" rx="1" fill={color} stroke="#431407" strokeWidth="0.8" />
        <path d="M0.6 -2.6 L2.6 -2.6 Q4.4 -2.6 4.4 -0.8 L4.4 0.8 Q4.4 2.4 2.6 2.4 L0.6 2.4 Z" fill="#ffedd5" stroke="#431407" strokeWidth="0.8" />
      </svg>
    ) : shape === 'cluster' ? (
      <svg width="12" height="12" viewBox="-6 -6 12 12">
        <circle r="5.2" fill="#0b1220" stroke={color} strokeWidth="1.3" />
        <text x="0" y="2" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#f8fafc" fontFamily="monospace">
          n
        </text>
      </svg>
    ) : shape === 'flood' ? (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <path d="M-4 2 C-3 1 -2 3 -1 1.5 C0 0.5 1 2.5 2 1 C3 0 4 1.5 4 1 L4 4 L-4 4 Z" fill="rgba(59,130,246,0.7)" stroke={color} strokeWidth="1" />
      </svg>
    ) : (
      <svg width="11" height="11" viewBox="-5 -5 10 10">
        <circle r="2.2" fill={color} />
        <circle r="4.4" fill="none" stroke={color} strokeWidth="0.9" />
      </svg>
    );
  return (
    <div className="legend-row">
      <span className="legend-ic">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
