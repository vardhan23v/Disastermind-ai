// Unit dispatch + recommendation execution — shared mutation logic used by the
// store (commander clicks) and the engine (deterministic auto-execute fallback).

import { TICK_MINUTES } from '@/constants';
import type { CityPoint, Recommendation, SosIncident, Vehicle, VehicleKind, WorldState } from '@/types';
import { dist, pointOnPath, lenPoly } from '@/utils/geo';
import { buildRoadGraph, computeRoute } from '@/simulation/roadGraph';

export function moveVehicles(world: WorldState): void {
  for (const v of world.vehicles) {
    if (v.path.length === 0 || v.pathProgress >= 1) continue;
    const speedKmPerTick = (v.speedKmh * TICK_MINUTES) / 60;
    const pathKm = lenPoly(v.path) / 1000;
    // mission pacing: each leg takes 3-10 ticks so unit movement stays visible
    const distTicks = pathKm > 0 ? Math.ceil(pathKm / speedKmPerTick) : 1;
    const advance = 1 / Math.max(3, Math.min(10, distTicks));
    v.pathProgress = Math.min(1, v.pathProgress + advance);
    v.pos = pointOnPath(v.path, v.pathProgress);
    v.etaMin = pathKm > 0 ? ((1 - v.pathProgress) * pathKm) / (v.speedKmh / 60) : 0;

    if (v.pathProgress >= 1) {
      const sos = world.sos.find((s) => s.id === v.assignedSosId);
      if (sos) {
        sos.status = 'resolved';
        world.rescuedCount += sos.peopleCount;
      }
      if (v.assignedSosId || v.status === 'enroute') {
        v.status = 'returning';
        v.path = [v.pos, v.home];
        v.pathProgress = 0;
      } else {
        v.status = 'idle';
        v.path = [];
        v.pathProgress = 0;
      }
      v.assignedSosId = undefined;
    }
  }

  // returning units that reached home go idle
  for (const v of world.vehicles) {
    if (v.status === 'returning' && v.pathProgress >= 1) {
      v.status = 'idle';
      v.pos = { ...v.home };
      v.path = [];
      v.pathProgress = 0;
    }
  }
}

export interface DispatchResult {
  vehicleId: string;
  sosId?: string;
  etaMin: number;
}

export function dispatchNearestToSos(world: WorldState, sosId: string): DispatchResult | null {
  const sos = world.sos.find((s) => s.id === sosId);
  if (!sos || (sos.status !== 'pending' && sos.status !== 'dispatched')) return null;

  const depth = world.flood.find((f) => f.zone === sos.zone)?.depthM ?? 0;
  const preferBoat = depth >= 0.9;
  const kinds: VehicleKind[] = preferBoat ? ['boat', 'ambulance'] : ['ambulance', 'boat'];

  const unit = nearestIdle(world, sos.pos, kinds);
  if (!unit) return null;

  const result = assignRoute(world, unit, sos.pos, 'ambulance');
  unit.assignedSosId = sos.id;
  sos.status = 'dispatched';
  sos.vehicleId = unit.id;
  return { vehicleId: unit.id, sosId: sos.id, etaMin: result };
}

export function dispatchVehicles(
  world: WorldState,
  count: number,
  kind: VehicleKind,
  target: CityPoint
): DispatchResult[] {
  const results: DispatchResult[] = [];
  const units = world.vehicles
    .filter((v) => v.kind === kind && v.status === 'idle')
    .sort((a, b) => dist(target, a.pos) - dist(target, b.pos))
    .slice(0, count);

  for (const unit of units) {
    const sos = nearestPendingSos(world, unit.pos, kind === 'boat');
    const dest = sos ? sos.pos : target;
    const eta = assignRoute(world, unit, dest, kind === 'boat' ? 'ambulance' : 'ambulance');
    unit.assignedSosId = sos?.id;
    if (sos) {
      sos.status = 'dispatched';
      sos.vehicleId = unit.id;
    }
    results.push({ vehicleId: unit.id, sosId: sos?.id, etaMin: eta });
  }
  return results;
}

function assignRoute(world: WorldState, unit: Vehicle, dest: CityPoint, costKind: 'ambulance' | 'relief'): number {
  const graph = buildRoadGraph(world.roads);
  const viaRoad = computeRoute(graph, world.roads, unit.pos, dest, costKind, unit.speedKmh);
  const useWater = unit.kind === 'boat' && !viaRoad;
  const path = useWater ? [unit.pos, dest] : viaRoad ? viaRoad.waypoints : [unit.pos, dest];
  const lengthM = useWater || !viaRoad ? lenPoly(path) : viaRoad.lengthM;
  unit.status = 'enroute';
  unit.path = path;
  unit.pathProgress = 0;
  unit.etaMin = (lengthM / 1000 / unit.speedKmh) * 60;
  return unit.etaMin;
}

export function executeRecommendation(world: WorldState, rec: Recommendation, by: 'commander' | 'auto'): void {
  rec.status = 'approved';
  rec.approvedAtTick = world.tick;

  for (const action of rec.actions) {
    switch (action.kind) {
      case 'deploy': {
        const deploy = action.deploy;
        if (!deploy) break;
        dispatchVehicles(world, deploy.count, deploy.vehicleKind, targetFor(world, 'A'));
        break;
      }
      case 'open-shelter': {
        const shelter = world.shelters.find((s) => s.id === action.target);
        if (shelter) shelter.openedAtTick = world.tick;
        break;
      }
      case 'close-road': {
        if (action.target === 'none') break;
        for (const road of world.roads) {
          if (road.name === action.target) road.closed = true;
        }
        break;
      }
      case 'evacuate': {
        const zones = world.zones.filter((z) => z.id === 'A' || z.id === 'B');
        for (const zone of zones) {
          zone.evacuating = true;
          zone.evacuatedCount = 0;
          zone.evacDone = false;
          const shelters = world.shelters
            .filter((s) => s.openedAtTick > 0)
            .sort((a, b) => dist(a.pos, zone.center) - dist(b.pos, zone.center));
          if (shelters.length === 0) break;
          const target = shelters[0];
          const graph = buildRoadGraph(world.roads);
          const via = computeRoute(graph, world.roads, zone.center, target.pos, 'civilian', 4);
          const path = via ? via.waypoints : [zone.center, target.pos];
          world.routes.push({
            id: `evt-${zone.id}-${world.tick}`,
            kind: 'civilian',
            waypoints: path,
            lengthM: lenPoly(path),
            minutes: Math.max(5, Math.round((lenPoly(path) / 1000 / 4) * 60)),
            reason: `Evacuation: ${zone.name} → ${target.name}`,
            createdAtTick: world.tick,
          });
        }
        break;
      }
      case 'alert':
        break;
    }
  }

  world.timeline.push({
    tick: world.tick,
    tag: by === 'commander' ? 'approval' : 'auto-approval',
    text: `${by === 'commander' ? 'Commander approved' : 'Auto-executed'}: ${rec.title}`,
    severity: 'critical',
  });
}

function targetFor(world: WorldState, zoneId: string): CityPoint {
  const zone = world.zones.find((z) => z.id === zoneId);
  return zone ? zone.center : { x: 6000, y: 6000 };
}

function nearestIdle(world: WorldState, pos: CityPoint, kinds: VehicleKind[]): Vehicle | null {
  const candidates = world.vehicles.filter((v) => v.status === 'idle' && kinds.includes(v.kind));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, v) => (dist(pos, v.pos) < dist(pos, best.pos) ? v : best));
}

function nearestPendingSos(world: WorldState, pos: CityPoint, preferDeep: boolean): SosIncident | null {
  const pending = world.sos.filter((s) => s.status === 'pending');
  if (pending.length === 0) return null;
  const deep = pending.filter((s) => (world.flood.find((f) => f.zone === s.zone)?.depthM ?? 0) >= 0.9);
  const pool = preferDeep ? (deep.length ? deep : pending) : pending;
  return pool.reduce((best, s) => (dist(pos, s.pos) < dist(pos, best.pos) ? s : best));
}