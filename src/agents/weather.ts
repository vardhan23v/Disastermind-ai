// Weather Intelligence Agent — tracks the cyclone, rainfall, wind, river.

import { alertAt, rainfallAt, riverAt, stormAt, windAt } from '@/simulation/forecast';
import type { AgentResult } from '@/agents/contract';
import { emptyResult } from '@/agents/contract';
import type { WorldState } from '@/types';

export function runWeather(world: WorldState, tick: number): AgentResult {
  const out = emptyResult();
  const rain = rainfallAt(tick);
  const wind = windAt(tick);
  const river = riverAt(tick);
  const alert = alertAt(tick);
  const prevAlert = alertAt(tick - 1);

  if (tick === 0) {
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'weather',
        headline: 'Cyclone C-07 tracking NNE · landfall near Zone A in ~6 h',
        zone: 'A',
      },
      confidence: 82,
      why: 'Model consensus on ECMWF/IMD tracks; 200 km offshore, drift 12 km/h.',
    });
  }

  if (tick === 1) {
    out.messages.push({
      to: 'flood',
      kind: {
        kind: 'weather',
        headline: 'Expected rainfall 100–120 mm/hr during peak · river confluence at risk',
        zone: 'B',
      },
      confidence: 76,
      why: 'Ensemble spread ±15 mm/hr; Ootha catchment already saturated.',
    });
  }

  if (prevAlert !== alert && alert !== 'green') {
    const label = alert.toUpperCase();
    out.messages.push({
      to: 'decision-support',
      kind: {
        kind: 'weather',
        headline: `ALERT LEVEL ${label} — rainfall ${Math.round(rain)} mm/hr, gusts ${Math.round(wind)} km/h`,
        zone: 'A',
      },
      confidence: 88,
      why: 'Crossed severity thresholds for wind, rain and river stage.',
    });
  }

  if (tick > 6 && river >= 100 && riverAt(tick - 1) < 100) {
    out.messages.push({
      to: 'flood',
      kind: {
        kind: 'weather',
        headline: `River Ootha at ${Math.round(river)}% capacity — overflow imminent in Zone B`,
        zone: 'B',
      },
      confidence: 91,
      why: 'Upstream gauge telemetry + rainfall-runoff model convergence.',
    });
  }

  if (wind >= 80 && windAt(tick - 1) < 80) {
    out.messages.push({
      to: 'satellite',
      kind: {
        kind: 'weather',
        headline: `Sustained winds ${Math.round(wind)} km/h — expect loose debris and structural stress`,
        zone: 'C',
      },
      confidence: 84,
      why: 'Wind speed exceeds urban debris threshold; coastal exposure worst.',
    });
  }

  void world;
  return out;
}

export function cyclonePositions(tick: number): { now: { x: number; y: number }; track: { x: number; y: number }[] } {
  const now = stormAt(tick);
  const track = [0, 1, 2, 3, 4, 5, 6].map((i) => stormAt(tick - 1 + i * 2));
  return { now, track };
}