// Hazard Overlay — renders the active scenario's deterministic paint set
// (rings, points, polygons, paths, heat) on the digital twin.

import { useMemo } from 'react';
import { scenarioFor } from '@/hazards/registry';
import type { HazardPaint, HazardScenario } from '@/hazards/types';
import type { WorldState } from '@/types';

export function HazardOverlay({ world }: { world: WorldState }) {
  const scenario: HazardScenario | null = useMemo(() => scenarioFor(world.hazard), [world.hazard]);
  const paints: HazardPaint[] = useMemo(
    () => scenario?.paint(world, world.tick, world.hazardMetrics) ?? [],
    // scenario is stable per hazard; recompute when world identity changes
    // (new tick) so paint tracks the simulation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, world]
  );

  if (world.hazard === 'cyclone' || paints.length === 0) return null;

  return (
    <g>
      {paints.map((p, pi) => (
        <g key={pi}>
          {p.rings?.map((r, i) => (
            <circle
              key={i}
              cx={r.cx}
              cy={r.cy}
              r={r.r}
              fill={r.fill ?? 'none'}
              stroke={r.stroke}
              strokeWidth={2}
              strokeDasharray={r.dotted ? '10 8' : undefined}
            />
          ))}
          {p.points?.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={pt.r} fill={pt.color} fillOpacity={0.35} />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={pt.r * 0.45}
                fill={pt.color}
                className={pt.pulse ? 'pulse' : undefined}
              />
            </g>
          ))}
          {p.polygons?.map((poly, i) => (
            <polygon
              key={i}
              points={poly.pts.map((v) => `${v.x},${v.y}`).join(' ')}
              fill={poly.fill}
              stroke={poly.stroke}
              strokeWidth={2}
              strokeDasharray={poly.dash}
              className={poly.pulse ? 'pulse' : undefined}
            />
          ))}
          {p.paths?.map((path, i) => (
            <path
              key={i}
              d={polyline(path.pts)}
              fill="none"
              stroke={path.stroke}
              strokeWidth={path.width ?? 3}
              strokeDasharray={path.dash}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
          {p.heat?.map((h, i) => (
            <circle key={i} cx={h.cx} cy={h.cy} r={h.radius} fill="#fb923c" fillOpacity={h.strength} />
          ))}
          {p.markers?.map((m, i) => (
            <g key={i} transform={`translate(${m.x} ${m.y})`}>
              <circle r={14} fill={m.color} fillOpacity={0.25} />
              <circle r={6} fill={m.color} />
              <text y={-22} textAnchor="middle" fontSize={30} fill={m.color} fontWeight={700}>
                {m.label}
              </text>
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function polyline(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}
