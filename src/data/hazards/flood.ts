// Deterministic mock data — standalone flood (catchment flash flood).

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'IMD', text: 'Flash-flood watch for Ootha catchment — 340 mm in 24 h', severity: 'warning' },
  { atTick: 5, tag: 'RIVER', text: 'Ootha river at 62% — embankment under strain', severity: 'warning' },
  { atTick: 10, tag: 'FLOOD', text: 'Zone A & B low blocks submerged 1.1 m', severity: 'critical' },
  { atTick: 15, tag: 'ROADS', text: 'Ring Road and Delta approach flooded', severity: 'critical' },
  { atTick: 20, tag: 'SHELTER', text: 'Four schools converted to shelters', severity: 'warning' },
  { atTick: 26, tag: 'PEAK', text: 'River peaks at 96% capacity', severity: 'critical' },
  { atTick: 32, tag: 'RECOVERY', text: 'Receding — boats shift to primary rescues', severity: 'info' },
  { atTick: 38, tag: 'CHIEF', text: 'Chief AI: decontamination + re-entry perimeters', severity: 'info' },
];

export const ZONE_PROFILES = { A: { share: 0.45, name: 'River Delta' }, B: { share: 0.35, name: 'Lowlands' }, C: { share: 0.2, name: 'Core Buffer' } } as const;