# Data Model: Custom Character & Monster Sprite System

**Feature**: 002-custom-character-sprites
**Date**: 2026-02-15
**Source**: [spec.md](spec.md) entities + [research.md](research.md) storage decisions

---

## Entity Overview

```
SpriteConfig (root)
├── SpriteSlot (per entity: kitty, doggo, enemy-bill, enemy-deadline, enemy-ex-lover)
│   ├── CustomImage[] (ordered list)
│   └── ProgressionRule (level-based or wave-based)
└── LevelTier[] (visual effect brackets)
```

---

## Entities

### 1. SpriteConfig

The root configuration object persisted in IndexedDB. Represents the complete set of custom sprite assignments across all entity slots.

| Field          | Type                           | Description                                | Constraints                    |
| -------------- | ------------------------------ | ------------------------------------------ | ------------------------------ |
| `version`      | `number`                       | Schema version for migration support       | Always `1` for initial release |
| `slots`        | `Record<EntityId, SpriteSlot>` | Map of entity ID to its sprite slot config | 5 fixed keys (see EntityId)    |
| `lastModified` | `number`                       | Unix timestamp of last config change       | Auto-updated on any mutation   |

**EntityId** (union type): `'kitty' | 'doggo' | 'enemy-bill' | 'enemy-deadline' | 'enemy-ex-lover'`

---

### 2. SpriteSlot

Represents the custom sprite configuration for a single character or enemy type.

| Field             | Type                | Description                            | Constraints                                      |
| ----------------- | ------------------- | -------------------------------------- | ------------------------------------------------ |
| `entityId`        | `EntityId`          | Which character/enemy this slot is for | One of the 5 valid IDs                           |
| `images`          | `CustomImage[]`     | Ordered list of custom images          | Max ~10 images; empty = use default              |
| `progressionType` | `'level' \| 'wave'` | How this slot advances through images  | `'level'` for characters, `'wave'` for enemies   |
| `displayWidth`    | `number`            | Render width in pixels                 | Default: 48 (characters), proportional (enemies) |
| `displayHeight`   | `number`            | Render height in pixels                | Default: 48 (characters), proportional (enemies) |

**Default display sizes** (from spec):

| Entity         | Default Size | Custom Size |
| -------------- | ------------ | ----------- |
| kitty          | 32×32        | 48×48       |
| doggo          | 32×32        | 48×48       |
| enemy-bill     | 28×28        | 40×40       |
| enemy-deadline | 24×24        | 36×36       |
| enemy-ex-lover | 48×48        | 64×64       |

**Derived field** (computed, not stored):

- `currentImageIndex`: Determined at runtime from game level (characters) or wave number (enemies). Clamped to `images.length - 1`.

---

### 3. CustomImage

An individual uploaded image reference. The actual image blob is stored separately in IndexedDB; this record holds metadata.

| Field        | Type     | Description                            | Constraints                                                  |
| ------------ | -------- | -------------------------------------- | ------------------------------------------------------------ |
| `id`         | `string` | Unique identifier for this image       | Format: `{entityId}-{uuidv4-short}`                          |
| `fileName`   | `string` | Original upload filename for display   | Informational only                                           |
| `mimeType`   | `string` | Image MIME type                        | One of: `image/png`, `image/jpeg`, `image/webp`, `image/gif` |
| `fileSize`   | `number` | File size in bytes                     | Max 5,242,880 (5MB)                                          |
| `width`      | `number` | Original image width in pixels         | Read from decoded image                                      |
| `height`     | `number` | Original image height in pixels        | Read from decoded image                                      |
| `blobKey`    | `string` | IndexedDB key where the blob is stored | Format: `blob:{id}`                                          |
| `textureKey` | `string` | Phaser texture key for this image      | Format: `{entityId}-custom-{index}`                          |
| `order`      | `number` | Position in the ordered list (0-based) | Mutable via drag-and-drop reorder                            |
| `createdAt`  | `number` | Unix timestamp of upload               | Immutable                                                    |

**Validation rules**:

- `mimeType` MUST be in `['image/png', 'image/jpeg', 'image/webp', 'image/gif']`
- `fileSize` MUST be ≤ 5,242,880 bytes
- `width` and `height` MUST be > 0 (non-zero-dimension image)
- Image MUST successfully decode as an `HTMLImageElement` (corrupted files rejected)

---

### 4. LevelTier

Defines visual effect brackets for level-up VFX. Static configuration (not persisted — defined in code).

| Field          | Type      | Description                             | Constraints                  |
| -------------- | --------- | --------------------------------------- | ---------------------------- |
| `minLevel`     | `number`  | Minimum player level to enter this tier | ≥ 1, ascending               |
| `color`        | `number`  | Hex color for glow/particle effects     | Phaser hex format (0xRRGGBB) |
| `name`         | `string`  | Human-readable tier name                | For logging/debug            |
| `glowStrength` | `number`  | PostFX glow outer strength              | 2–12 range                   |
| `burstCount`   | `number`  | Number of particles in burst effect     | 12–32 range                  |
| `hasFireTrail` | `boolean` | Whether to show continuous fire effect  | Only for high tiers          |

**Default tier configuration**:

| Tier | Min Level | Color      | Name      | Glow Strength | Burst Count | Fire |
| ---- | --------- | ---------- | --------- | ------------- | ----------- | ---- |
| 1    | 1         | `0x88ccff` | blue      | 3             | 16          | No   |
| 2    | 3         | `0xaa66ff` | purple    | 5             | 20          | No   |
| 3    | 5         | `0xffaa00` | gold      | 7             | 24          | No   |
| 4    | 8         | `0xff4400` | fire      | 9             | 28          | Yes  |
| 5    | 12        | `0xff0066` | legendary | 12            | 32          | Yes  |

---

## Relationships

```
SpriteConfig 1──* SpriteSlot     (one config has 5 slots)
SpriteSlot   1──* CustomImage    (one slot has 0..N images)
Player       ──> SpriteSlot      (each player owns one character slot)
Enemy        ──> SpriteSlot      (each enemy type references one enemy slot)
LevelTier    ──> Player          (tier is computed from player level at runtime)
```

---

## State Transitions

### SpriteSlot Image List

```
Empty ──[upload image]──> HasImages(1)
HasImages(N) ──[upload image]──> HasImages(N+1)
HasImages(N) ──[remove image]──> HasImages(N-1) | Empty
HasImages(N) ──[reorder]──> HasImages(N)  (same count, different order)
```

### In-Game Sprite Progression (Characters, level-based)

```
Level 1 ──[level-up]──> Level 2 ──[level-up]──> ... ──[level-up]──> Level N
  │                       │                               │
  ▼                       ▼                               ▼
Image[0]              Image[1]                     Image[min(N-1, images.length-1)]
```

Clamping rule: `displayIndex = Math.min(currentLevel - 1, images.length - 1)`

### In-Game Sprite Progression (Enemies, wave-based)

```
Wave 1-2 ──[wave advance]──> Wave 3-4 ──[wave advance]──> Wave 5-6 ──> ...
   │                            │                            │
   ▼                            ▼                            ▼
Image[0]                    Image[1]                    Image[min(waveIndex, images.length-1)]
```

Progression formula: `imageIndex = Math.min(Math.floor((waveNumber - 1) / 2), images.length - 1)`

(Every 2 waves, enemies advance to the next sprite. Configurable.)

---

## IndexedDB Storage Schema

Two types of records in IndexedDB (`idb-keyval` default store):

| Key Pattern      | Value Type                         | Description                        |
| ---------------- | ---------------------------------- | ---------------------------------- |
| `sprite-config`  | `SpriteConfig` (JSON-serializable) | Root config with all slot metadata |
| `blob:{imageId}` | `Blob`                             | Raw image binary data              |

**Example keys**:

```
sprite-config                          → { version: 1, slots: { ... }, lastModified: 1739577600000 }
blob:kitty-a1b2c3                      → Blob (image/png, 245KB)
blob:kitty-d4e5f6                      → Blob (image/jpeg, 180KB)
blob:doggo-g7h8i9                      → Blob (image/webp, 320KB)
blob:enemy-bill-j0k1l2                 → Blob (image/png, 150KB)
```

---

## Zustand Store Shape (spriteStore)

Runtime state bridging React UI ↔ Phaser game:

```typescript
interface SpriteStoreState {
  // Config data (persisted to IndexedDB)
  config: SpriteConfig;

  // Runtime state (not persisted)
  isLoaded: boolean; // True after IndexedDB restore completes
  loadingSlot: EntityId | null; // Which slot is currently uploading
  errorMessage: string | null; // Last validation/upload error

  // Actions
  loadConfig: () => Promise<void>;
  addImage: (entityId: EntityId, file: File) => Promise<void>;
  removeImage: (entityId: EntityId, imageId: string) => Promise<void>;
  reorderImages: (entityId: EntityId, fromIndex: number, toIndex: number) => void;
  clearSlot: (entityId: EntityId) => Promise<void>;
  getTextureKeyForLevel: (entityId: EntityId, level: number) => string | null;
  getTextureKeyForWave: (entityId: EntityId, wave: number) => string | null;
}
```
