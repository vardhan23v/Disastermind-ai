// Government Report Agent — builds the situation report from the event log.

import type { AlertLevel, SitrepData, WorldState } from '@/types';
import { hazardDefOf } from '@/hazards/definitions';

export function buildSitrep(world: WorldState): SitrepData {
  const def = hazardDefOf(world.hazard);
  const openShelters = world.shelters.filter((s) => s.openedAtTick > 0);
  const activeAmbulances = world.vehicles.filter((v) => v.kind === 'ambulance' && v.status !== 'idle').length;
  const activeBoats = world.vehicles.filter((v) => v.kind === 'boat' && v.status !== 'idle').length;
  const resolvedSos = world.sos.filter((s) => s.status === 'resolved');
  const closedRoads = world.roads.filter((r) => r.closed || r.damaged);

  const resourcesDeployed: string[] = [];
  if (activeAmbulances > 0) resourcesDeployed.push(`Ambulances deployed: ${activeAmbulances}`);
  if (activeBoats > 0) resourcesDeployed.push(`Rescue boats deployed: ${activeBoats}`);
  for (const s of openShelters) {
    resourcesDeployed.push(`${s.name}: ${s.occupancy}/${s.capacity} occupied (Zone ${s.zone})`);
  }
  for (const r of closedRoads) {
    resourcesDeployed.push(`${r.name} ${r.damaged ? 'damaged' : 'closed to civilian traffic'}`);
  }

  return {
    generatedAtTick: world.tick,
    hazard: { id: def.id, name: def.name, icon: def.icon, category: def.category },
    timeline: world.timeline.map((e) => ({ ...e })),
    resourcesDeployed,
    sosHandled: resolvedSos.length,
    casualtiesPrevented: Math.round(world.rescuedCount * 2.4 + world.evacuatedCount * 0.9),
    damage: world.damage ?? {
      buildingsDamaged: 0,
      roadsDestroyedKm: 0,
      powerLossPct: 0,
      affectedPopulation: 0,
      economicLossInr: 0,
    },
    rescued: world.rescuedCount,
    pendingSos: world.analytics.pendingSos,
    alertPeak: alertPeakOf(world),
  };
}

function alertPeakOf(world: WorldState): AlertLevel {
  const order: AlertLevel[] = ['green', 'yellow', 'orange', 'red', 'purple'];
  let peak: AlertLevel = 'green';
  for (const h of world.history) {
    const rank = order.indexOf(h.alert);
    if (rank > order.indexOf(peak)) peak = h.alert;
  }
  if (order.indexOf(world.alert) > order.indexOf(peak)) peak = world.alert;
  return peak;
}

export function sitrepClock(tick: number): string {
  return tick.toString();
}