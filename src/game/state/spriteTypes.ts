/**
 * Type definitions for the action-based custom sprite system.
 * Entities: kitty, doggo (players), boss (multiple levels).
 * Each level has 6 action states: idle, run, jump, attack, hurt, death.
 */

// ── Action States ──

export const ACTION_STATES = ['idle', 'run', 'jump', 'attack', 'hurt', 'death'] as const;
export type ActionState = (typeof ACTION_STATES)[number];

export const ACTION_LABELS: Record<ActionState, string> = {
  idle: 'Đứng yên',
  run: 'Chạy',
  jump: 'Nhảy',
  attack: 'Tấn công',
  hurt: 'Chịu đòn',
  death: 'Chết',
};

export const ACTION_ICONS: Record<ActionState, string> = {
  idle: 'accessibility_new',
  run: 'directions_run',
  jump: 'swap_vert',
  attack: 'flash_on',
  hurt: 'heart_broken',
  death: 'dangerous',
};

// ── Entity IDs (customizable entities only) ──

export type EntityId = 'kitty' | 'doggo' | 'boss';

export const ENTITY_IDS: EntityId[] = ['kitty', 'doggo', 'boss'];

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
  boss: { defaultWidth: 48, defaultHeight: 48, customWidth: 64, customHeight: 64 },
};

// ── Action Image (one image per action slot) ──

export interface ActionImage {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  blobKey: string;
  textureKey: string;
  createdAt: number;
}

// ── Sprite Level (6 action slots) ──

export interface SpriteLevel {
  actions: Partial<Record<ActionState, ActionImage>>;
}

// ── Sprite Slot (per entity) ──

export interface SpriteSlot {
  entityId: EntityId;
  levels: SpriteLevel[];
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

// ── Factories ──

export function createEmptyLevel(): SpriteLevel {
  return { actions: {} };
}

function createEmptySlot(entityId: EntityId): SpriteSlot {
  const sizes = DEFAULT_DISPLAY_SIZES[entityId];
  return {
    entityId,
    levels: [createEmptyLevel()],
    displayWidth: sizes.customWidth,
    displayHeight: sizes.customHeight,
  };
}

export function createEmptySpriteConfig(): SpriteConfig {
  return {
    version: 2,
    slots: {
      kitty: createEmptySlot('kitty'),
      doggo: createEmptySlot('doggo'),
      boss: createEmptySlot('boss'),
    },
    lastModified: Date.now(),
  };
}

/** Build texture key for a specific entity/level/action combination */
export function textureKeyFor(entityId: EntityId, levelIndex: number, action: ActionState): string {
  return `${entityId}-L${levelIndex}-${action}`;
}

// ── Data Source ──

export type DataSource = 'cache' | 'local';

// ── Local Manifest ──

export interface LocalManifest {
  version: number;
  entities: Partial<Record<EntityId, { levels: Partial<Record<ActionState, string>>[] }>>;
}
