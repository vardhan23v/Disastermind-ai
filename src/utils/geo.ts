// Pure geometry + formatting helpers for the city grid (metres).

import type { CityPoint, CityPolygon } from '@/types';

export function dist(a: CityPoint, b: CityPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lenPoly(points: CityPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

export function pointOnPath(points: CityPoint[], fraction: number): CityPoint {
  const clamped = Math.max(0, Math.min(1, fraction));
  const total = lenPoly(points);
  if (total <= 0) return points[0] ?? { x: 0, y: 0 };
  let target = clamped * total;
  const out: CityPoint = { ...(points[0] ?? { x: 0, y: 0 }) };
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (target <= seg) {
      const t = seg > 0 ? target / seg : 0;
      out.x = points[i - 1].x + (points[i].x - points[i - 1].x) * t;
      out.y = points[i - 1].y + (points[i].y - points[i - 1].y) * t;
      return out;
    }
    target -= seg;
  }
  return points[points.length - 1] ?? out;
}

export function pathEtaMin(points: CityPoint[], speedKmh: number): number {
  if (speedKmh <= 0) return 0;
  return (lenPoly(points) / 1000 / speedKmh) * 60;
}

export function pointInPolygon(p: CityPoint, poly: CityPolygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (
      pi.y > p.y !== pj.y > p.y &&
      p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonBounds(poly: CityPolygon): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

export function ringWall(poly: CityPolygon, inset: number): CityPolygon {
  // crude inward offset used for visual lane width on zone edges
  return poly.map((p) => shrinkOf(poly, p, inset));
}

export function shrinkOf(poly: CityPolygon, p: CityPoint, d: number): CityPoint {
  let cx = 0;
  let cy = 0;
  for (const q of poly) {
    cx += q.x;
    cy += q.y;
  }
  cx /= poly.length;
  cy /= poly.length;
  const len = dist(p, { x: cx, y: cy });
  if (len <= 0) return { ...p };
  const k = (len - d) / len;
  return { x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k };
}

export function formatClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

export function fmtInr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function fmtCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function fmtKm(n: number): string {
  return `${n.toFixed(1)} km`;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(t01: number): number {
  const t = clamp(t01, 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1) - 1;
  return c * c * c + 1;
}

export function easeInOut(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function labelConfidence(n: number): 'high' | 'medium' | 'low' {
  if (n >= 80) return 'high';
  if (n >= 60) return 'medium';
  return 'low';
}