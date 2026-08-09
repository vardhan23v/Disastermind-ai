// Decision Support Agent (Chief AI) — fuses every agent signal into ranked,
// human-approvable recommendations with confidence and explainable factors.

import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import { EVAC_RECOMMEND_TICK } from '@/constants';
import type { WorldState } from '@/types';

export function runDecisionSupport(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  if (world.hazard !== 'cyclone') return out;
  const exists = (title: string): boolean =>
    world.recommendations.some((r) => r.title === title);

  if (tick === EVAC_RECOMMEND_TICK && !exists('Evacuate Zones A & B within 3 hours')) {
    out.recommendations.push({
      id: `rec-${tick}-1`,
      title: 'Evacuate Zones A & B within 3 hours',
      band: 'critical',
      confidence: 94,
      reasons: [
        '110 mm/hr rainfall with 4 more hours of sustained intensity',
        'River Ootha at 108% capacity — overflow forecast',
        'NH-7 floods in ~90 minutes (evacuation corridor at risk)',
        'Central District Hospital at 90% capacity, ICU nearly full',
      ],
      factors: [
        { agent: 'weather', note: 'Rainfall 110 mm/hr · gusts 88 km/h', weight: 0.3 },
        { agent: 'flood', note: 'Zone A 1.4 m · Zone B 0.9 m in 90 min', weight: 0.3 },
        { agent: 'resource', note: 'Central District Hospital 90%', weight: 0.2 },
        { agent: 'evacuation', note: 'Safe corridor open via NH-7 west', weight: 0.2 },
      ],
      actions: [
        {
          kind: 'deploy',
          target: '12 ambulances + 4 boats → Zones A & B',
          detail: 'Dispatch nearest idle units on priority ambulance routes.',
          deploy: { vehicleKind: 'ambulance', count: 12 },
        },
        {
          kind: 'deploy',
          target: '4 boats → river delta',
          detail: 'Boats for deep-water rescues around Zone B.',
          deploy: { vehicleKind: 'boat', count: 4 },
        },
        {
          kind: 'open-shelter',
          target: 'sh4',
          detail: 'Open Ashraya Relief Camp (840 beds).',
        },
        {
          kind: 'open-shelter',
          target: 'sh5',
          detail: 'Open Community Hall A in Zone A.',
        },
        {
          kind: 'open-shelter',
          target: 'sh6',
          detail: 'Open St. Marys School in Zone B.',
        },
        { kind: 'close-road', target: 'NH-7', detail: 'Close NH-7 south segment to civilian traffic.' },
        { kind: 'evacuate', target: 'Zones A & B', detail: 'Move low-lying residents to open shelters.' },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
    out.messages.push({
      to: 'resource',
      kind: { kind: 'rec', recId: `rec-${tick}-1` },
      confidence: 94,
      why: 'Fused 4 agent signals; expected casualties prevented ≈ 120 if executed within 30 min.',
    });
  }

  if (tick === 36 && !exists('Dispatch rescue boats to Delta Bridge area')) {
    out.recommendations.push({
      id: `rec-${tick}-2`,
      title: 'Dispatch rescue boats to Delta Bridge area',
      band: 'high',
      confidence: 88,
      reasons: [
        'Delta Bridge collapse isolates eastern Zone B',
        'Rising water traps residents on rooftops',
        '6 boats available at Port Basin',
      ],
      factors: [
        { agent: 'satellite', note: 'Collapse detected, confidence 91%', weight: 0.4 },
        { agent: 'flood', note: 'Zone B depth 1.2 m and rising', weight: 0.35 },
        { agent: 'resource', note: '6 boats idle', weight: 0.25 },
      ],
      actions: [
        {
          kind: 'deploy',
          target: '4 boats → Delta Bridge area',
          detail: 'Rescue boat formation, rooftop extraction profile.',
          deploy: { vehicleKind: 'boat', count: 4 },
        },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
    out.messages.push({
      to: 'resource',
      kind: { kind: 'rec', recId: `rec-${tick}-2` },
      confidence: 88,
      why: 'Satellite confirmation + flood model + resource availability aligned.',
    });
  }

  if (tick === 42 && !exists('Begin recovery: restore NH-7 and reopen hospitals')) {
    out.recommendations.push({
      id: `rec-${tick}-3`,
      title: 'Begin recovery: restore NH-7 and reopen hospitals',
      band: 'medium',
      confidence: 81,
      reasons: [
        'Rainfall dropping below 40 mm/hr',
        'River level falling from peak',
        'Damage assessment available for repair crews',
      ],
      factors: [
        { agent: 'weather', note: 'Rain easing, wind 48 km/h', weight: 0.35 },
        { agent: 'report', note: 'Damage assessment compiled', weight: 0.35 },
        { agent: 'resource', note: 'Hospital load falling', weight: 0.3 },
      ],
      actions: [
        { kind: 'close-road', target: 'none', detail: 'Plan reopening after water recedes below 0.3 m.' },
      ],
      status: 'pending',
      createdAtTick: tick,
      approvedAtTick: -1,
    });
  }

  return out;
}