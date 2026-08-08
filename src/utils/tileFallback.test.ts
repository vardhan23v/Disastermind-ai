import { describe, expect, it } from 'vitest';
import { applyTileError, TILE_ERROR_THRESHOLD } from '@/utils/tileFallback';

describe('tile fallback state', () => {
  it('stays inactive below the error threshold', () => {
    let s = applyTileError(0);
    expect(s.active).toBe(false);
    s = applyTileError(s.failures);
    expect(s.active).toBe(false);
    expect(s.failures).toBeLessThan(TILE_ERROR_THRESHOLD);
  });

  it('activates exactly at the threshold and stays active', () => {
    let s = { failures: 0, active: false };
    for (let i = 0; i < TILE_ERROR_THRESHOLD; i++) s = applyTileError(s.failures);
    expect(s.active).toBe(true);
    const after = applyTileError(s.failures);
    expect(after.active).toBe(true);
    expect(after.failures).toBe(s.failures + 1);
  });

  it('honours a custom threshold', () => {
    expect(applyTileError(0, 1).active).toBe(true);
    expect(applyTileError(0, 5).active).toBe(false);
  });
});