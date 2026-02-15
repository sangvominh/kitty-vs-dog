/**
 * Asset manifest maps entity keys to primitive renderer configurations.
 * Phase 1: Geometric primitives (circles, squares, triangles).
 * Phase 2: Swap to sprite PNGs in public/assets/ with zero gameplay code changes.
 */

export interface AssetEntry {
  key: string;
  type: 'circle' | 'rectangle' | 'triangle' | 'line';
  color: number;
  width: number;
  height: number;
}

export const AssetManifest: Record<string, AssetEntry> = {
  kitty: {
    key: 'kitty',
    type: 'circle',
    color: 0xff69b4, // Pink
    width: 32,
    height: 32,
  },
  doggo: {
    key: 'doggo',
    type: 'rectangle',
    color: 0x8b4513, // Brown
    width: 32,
    height: 32,
  },
  'enemy-bill': {
    key: 'enemy-bill',
    type: 'triangle',
    color: 0xff4444, // Red
    width: 28,
    height: 28,
  },
  'enemy-deadline': {
    key: 'enemy-deadline',
    type: 'triangle',
    color: 0xff8c00, // Orange
    width: 24,
    height: 24,
  },
  'enemy-ex-lover': {
    key: 'enemy-ex-lover',
    type: 'rectangle',
    color: 0x9932cc, // Purple
    width: 48,
    height: 48,
  },
  coin: {
    key: 'coin',
    type: 'circle',
    color: 0xffd700, // Yellow/Gold
    width: 16,
    height: 16,
  },
  'projectile-ranged': {
    key: 'projectile-ranged',
    type: 'circle',
    color: 0x00ffff, // Cyan
    width: 8,
    height: 8,
  },
  'projectile-baggage': {
    key: 'projectile-baggage',
    type: 'rectangle',
    color: 0x8b008b, // Dark magenta
    width: 12,
    height: 12,
  },
  'particle-heart': {
    key: 'particle-heart',
    type: 'circle',
    color: 0xff69b4, // Pink
    width: 8,
    height: 8,
  },
};
