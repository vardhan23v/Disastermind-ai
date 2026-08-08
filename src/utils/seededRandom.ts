// Deterministic seeded random — identical demo every run.

export const SEED = 42;

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: T[]): T {
    return items[this.nextInt(0, items.length - 1)];
  }

  shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }
}

/** Per-tick RNG: identical sequence for the same (seed, tick) across runs. */
export function rngFor(seed: number, tick: number): SeededRandom {
  const mix = (seed * 1000003 + tick * 524287) >>> 0;
  return new SeededRandom(mix ^ 0x9e3779b9);
}

/** Static RNG for world generation (independent of tick). */
export function worldRng(seed = 42): SeededRandom {
  return new SeededRandom(seed ^ 0x5bd1e995);
}

let messageCounter = 0;
let incidentCounter = 0;
let vehicleCounter = 0;
let recCounter = 0;

export function nextId(prefix: string): string {
  messageCounter = (messageCounter + 1) % 46656;
  return `${prefix}-${messageCounter.toString(36).padStart(3, '0')}`;
}

export function resetCounters(): void {
  messageCounter = 0;
  incidentCounter = 0;
  vehicleCounter = 0;
  recCounter = 0;
}

export function generateIds(
  kind: 'msg' | 'inc' | 'veh' | 'rec'
): string {
  const counter = {
    msg: messageCounter,
    inc: incidentCounter,
    veh: vehicleCounter,
    rec: recCounter,
  };
  return `${kind}-${counter[kind].toString(36).padStart(3, '0')}`;
}

export function bumpCounter(kind: 'msg' | 'inc' | 'veh' | 'rec'): void {
  if (kind === 'msg') messageCounter += 1;
  if (kind === 'inc') incidentCounter += 1;
  if (kind === 'veh') vehicleCounter += 1;
  if (kind === 'rec') recCounter += 1;
}