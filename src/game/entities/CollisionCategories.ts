/**
 * Collision category bitmask constants for Matter.js collision filtering.
 * Each category is a power of 2 to allow bitwise OR combinations.
 */
export const CATEGORY = {
  PLAYER: 0x0001,
  ENEMY: 0x0002,
  PROJECTILE: 0x0004,
  COIN: 0x0008,
  BOUNDARY: 0x0010,
} as const;

/**
 * Collision masks define what each category collides WITH.
 */
export const MASK = {
  PLAYER:
    CATEGORY.PLAYER | CATEGORY.ENEMY | CATEGORY.COIN | CATEGORY.PROJECTILE | CATEGORY.BOUNDARY,
  ENEMY: CATEGORY.PLAYER | CATEGORY.PROJECTILE,
  PROJECTILE: CATEGORY.ENEMY | CATEGORY.PLAYER,
  COIN: CATEGORY.PLAYER,
  BOUNDARY: CATEGORY.PLAYER,
} as const;
