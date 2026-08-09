// Deterministic mock data — extreme heat wave.

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'IMD', text: 'Heat-wave warning — IMD, 8-day duration forecast', severity: 'warning' },
  { atTick: 4, tag: 'HEAT', text: 'District max 46.2 °C — heat index 51 °C', severity: 'critical' },
  { atTick: 10, tag: 'SOCIAL', text: 'Social media reports of power dips across core', severity: 'warning' },
  { atTick: 16, tag: 'HOSPITAL', text: 'Heat-related ER visits up 38%', severity: 'critical' },
  { atTick: 24, tag: 'WATER', text: 'Water stations serving 90k daily', severity: 'info' },
  { atTick: 30, tag: 'PEAK', text: 'Peak demand 4.8 GW — grid at 103%', severity: 'critical' },
  { atTick: 36, tag: 'RELIEF', text: 'Sea breeze lowers index — advisory extended 72 h', severity: 'info' },
];

export const ZONE_PROFILES = { A: { share: 0.35, name: 'Coastal Core' }, C: { share: 0.4, name: 'Urban Core' }, D: { share: 0.25, name: 'Industrial West' } } as const;