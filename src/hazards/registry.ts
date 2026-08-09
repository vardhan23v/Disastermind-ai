// Hazard scenario registry — maps a HazardId to its deterministic scenario.

import type { HazardId } from '@/types';
import type { HazardScenario } from '@/hazards/types';
import { droughtScenario } from '@/hazards/drought';
import { earthquakeScenario } from '@/hazards/earthquake';
import { floodScenario } from '@/hazards/flood';
import { heatwaveScenario } from '@/hazards/heatwave';
import { tornadoScenario } from '@/hazards/tornado';
import { tsunamiScenario } from '@/hazards/tsunami';
import { volcanoScenario } from '@/hazards/volcano';
import { wildfireScenario } from '@/hazards/wildfire';

/**
 * The cyclone/flood demo keeps the original engine path (engine.ts) —
 * `scenarioFor` returns null for it so callers can fall back.
 */
export function scenarioFor(hazard: HazardId): HazardScenario | null {
  switch (hazard) {
    case 'earthquake':
      return earthquakeScenario;
    case 'volcano':
      return volcanoScenario;
    case 'tsunami':
      return tsunamiScenario;
    case 'flood':
      return floodScenario;
    case 'drought':
      return droughtScenario;
    case 'tornado':
      return tornadoScenario;
    case 'wildfire':
      return wildfireScenario;
    case 'heatwave':
      return heatwaveScenario;
    case 'cyclone':
    default:
      return null;
  }
}