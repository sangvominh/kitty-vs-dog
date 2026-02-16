/**
 * Shared type definitions for the custom sprite system.
 * Defines entities, configuration interfaces, and constants.
 */

// ── Entity IDs ──

export type EntityId = 'kitty' | 'doggo' | 'enemy-bill' | 'enemy-deadline' | 'enemy-ex-lover';

export const ENTITY_IDS: EntityId[] = [
  'kitty',
  'doggo',
  'enemy-bill',
  'enemy-deadline',
  'enemy-ex-lover',
];

// ── Display Size Configuration ──

export interface DisplaySizeConfig {
  defaultWidth: number;
  defaultHeight: number;
  customWidth: number;
  customHeight: number;
}

export const DEFAULT_DISPLAY_SIZES: Record<EntityId, DisplaySizeConfig> = {
  kitty: { defaultWidth: 32, defaultHeight: 32, customWidth: 48, customHeight: 48 },
  doggo: { defaultWidth: 32, defaultHeight: 32, customWidth: 48, customHeight: 48 },
  'enemy-bill': { defaultWidth: 28, defaultHeight: 28, customWidth: 40, customHeight: 40 },
  'enemy-deadline': { defaultWidth: 24, defaultHeight: 24, customWidth: 36, customHeight: 36 },
  'enemy-ex-lover': { defaultWidth: 48, defaultHeight: 48, customWidth: 64, customHeight: 64 },
};

// ── Custom Image ──

export interface CustomImage {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  blobKey: string;
  textureKey: string;
  order: number;
  createdAt: number;
}

// ── Sprite Slot ──

export interface SpriteSlot {
  entityId: EntityId;
  images: CustomImage[];
  progressionType: 'level' | 'wave';
  displayWidth: number;
  displayHeight: number;
}

// ── Sprite Config (root persisted object) ──

export interface SpriteConfig {
  version: number;
  slots: Record<EntityId, SpriteSlot>;
  lastModified: number;
}

// ── Level Tier (VFX configuration) ──

export interface LevelTier {
  minLevel: number;
  color: number;
  name: string;
  glowStrength: number;
  burstCount: number;
  hasFireTrail: boolean;
}

export const TIER_CONFIG: LevelTier[] = [
  {
    minLevel: 1,
    color: 0x88ccff,
    name: 'blue',
    glowStrength: 3,
    burstCount: 16,
    hasFireTrail: false,
  },
  {
    minLevel: 3,
    color: 0xaa66ff,
    name: 'purple',
    glowStrength: 5,
    burstCount: 20,
    hasFireTrail: false,
  },
  {
    minLevel: 5,
    color: 0xffaa00,
    name: 'gold',
    glowStrength: 7,
    burstCount: 24,
    hasFireTrail: false,
  },
  {
    minLevel: 8,
    color: 0xff4400,
    name: 'fire',
    glowStrength: 9,
    burstCount: 28,
    hasFireTrail: true,
  },
  {
    minLevel: 12,
    color: 0xff0066,
    name: 'legendary',
    glowStrength: 12,
    burstCount: 32,
    hasFireTrail: true,
  },
];

// ── Factory ──

function createEmptySpriteSlot(entityId: EntityId): SpriteSlot {
  const sizes = DEFAULT_DISPLAY_SIZES[entityId];
  const isCharacter = entityId === 'kitty' || entityId === 'doggo';
  return {
    entityId,
    images: [],
    progressionType: isCharacter ? 'level' : 'wave',
    displayWidth: sizes.customWidth,
    displayHeight: sizes.customHeight,
  };
}

export function createEmptySpriteConfig(): SpriteConfig {
  return {
    version: 1,
    slots: {
      kitty: createEmptySpriteSlot('kitty'),
      doggo: createEmptySpriteSlot('doggo'),
      'enemy-bill': createEmptySpriteSlot('enemy-bill'),
      'enemy-deadline': createEmptySpriteSlot('enemy-deadline'),
      'enemy-ex-lover': createEmptySpriteSlot('enemy-ex-lover'),
    },
    lastModified: Date.now(),
  };
}
