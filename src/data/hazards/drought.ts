// Deterministic mock data — drought (weeks-long water crisis).

export const EVENTS: { atTick: number; tag: string; text: string; severity: 'info' | 'warning' | 'critical' }[] = [
  { atTick: 1, tag: 'IMD', text: 'Monsoon deficit 42% — district enters lean window', severity: 'warning' },
  { atTick: 6, tag: 'WATER', text: 'Ootha dam drawdown begins — rationing review', severity: 'warning' },
  { atTick: 12, tag: 'RATIONS', text: 'Weekday rationing enacted for Zone A & B', severity: 'critical' },
  { atTick: 18, tag: 'AGRI', text: 'Kharif sown area 60% down — agri stress 40%', severity: 'warning' },
  { atTick: 24, tag: 'GROUNDWATER', text: 'Bore yields falling — tanker pipeline scaled', severity: 'critical' },
  { atTick: 30, tag: 'RELIEF', text: 'State relief: 40 tankers + desalination pilot', severity: 'info' },
  { atTick: 36, tag: 'RAIN', text: 'Weak rain spells begin — shortfall narrows', severity: 'info' },
];