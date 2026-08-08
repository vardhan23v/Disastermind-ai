// Offline tile fallback — pure decision state for the map's onload failure path.

export interface TileFallbackState {
  failures: number;
  active: boolean;
}

export const TILE_ERROR_THRESHOLD = 3;

export function applyTileError(prevFailures: number, threshold: number = TILE_ERROR_THRESHOLD): TileFallbackState {
  const failures = prevFailures + 1;
  return { failures, active: failures >= threshold };
}