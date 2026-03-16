# Contracts: Custom Character & Monster Sprite System

**Feature**: 002-custom-character-sprites
**Date**: 2026-02-15
**Source**: [data-model.md](../data-model.md) entities + [research.md](../research.md) API decisions

---

## 1. Sprite Storage API (IndexedDB Persistence Layer)

Module: `src/lib/spriteStorage.ts`

These functions wrap `idb-keyval` and provide the persistence interface for sprite configurations and image blobs.

### `saveConfig(config: SpriteConfig): Promise<void>`

Persist the full sprite configuration (metadata only, no blobs) to IndexedDB.

- **Key**: `'sprite-config'`
- **Value**: JSON-serializable `SpriteConfig` object
- **Side effects**: Updates `config.lastModified` to `Date.now()`

### `loadConfig(): Promise<SpriteConfig | null>`

Load the saved sprite configuration from IndexedDB.

- **Returns**: `SpriteConfig` if previously saved, `null` if no config exists
- **Error handling**: Returns `null` on deserialization errors (corrupted data)

### `saveImageBlob(imageId: string, blob: Blob): Promise<void>`

Store an image blob in IndexedDB.

- **Key**: `'blob:{imageId}'`
- **Value**: Raw `Blob` object
- **Precondition**: `blob.size <= 5_242_880` (5MB)

### `loadImageBlob(imageId: string): Promise<Blob | null>`

Retrieve an image blob from IndexedDB.

- **Returns**: `Blob` if exists, `null` if missing (deleted externally or evicted)

### `deleteImageBlob(imageId: string): Promise<void>`

Remove an image blob from IndexedDB.

- **Idempotent**: No error if key doesn't exist

### `clearAllSprites(): Promise<void>`

Remove all sprite-related data from IndexedDB (config + all blobs).

- **Warning**: Destructive operation. Used for "reset all customizations."

---

## 2. Image Validation API

Module: `src/lib/imageValidator.ts`

### `validateImageFile(file: File): ValidationResult`

Synchronous validation of file metadata before upload.

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string; // Human-readable error message
  errorCode?: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE';
}
```

**Rules**:

- `file.type` MUST be in `['image/png', 'image/jpeg', 'image/webp', 'image/gif']`
- `file.size` MUST be > 0
- `file.size` MUST be ≤ 5,242,880 (5MB)

### `decodeImageDimensions(file: File): Promise<ImageDimensions>`

Async validation — actually load the image to verify it's a valid, decodable image.

```typescript
interface ImageDimensions {
  width: number;
  height: number;
}
```

- **Throws**: `Error` if image cannot be decoded (corrupted file)
- **Implementation**: Creates a temporary `HTMLImageElement` from a Blob URL and reads `naturalWidth`/`naturalHeight`

---

## 3. Sprite Store API (Zustand)

Module: `src/game/state/spriteStore.ts`

Zustand store bridging React UI ↔ Phaser game. All state mutations go through this store.

### State Shape

```typescript
interface SpriteStoreState {
  config: SpriteConfig;
  isLoaded: boolean;
  loadingSlot: EntityId | null;
  errorMessage: string | null;
}
```

### Actions

#### `loadConfig(): Promise<void>`

Initialize store from IndexedDB on app startup.

- **Reads**: `spriteStorage.loadConfig()`
- **Sets**: `config` (or default empty config if null), `isLoaded = true`
- **Error**: Sets `errorMessage` with failure details

#### `addImage(entityId: EntityId, file: File): Promise<void>`

Upload a new image to a sprite slot.

- **Validates**: `imageValidator.validateImageFile(file)` + `decodeImageDimensions(file)`
- **Generates**: Unique `imageId` (`{entityId}-{nanoid(8)}`)
- **Stores**: Blob via `spriteStorage.saveImageBlob(imageId, blob)`
- **Updates**: Appends `CustomImage` to `config.slots[entityId].images`
- **Persists**: `spriteStorage.saveConfig(config)`
- **Sets**: `loadingSlot = entityId` during upload, `null` after
- **Error**: Sets `errorMessage` with validation error text

#### `removeImage(entityId: EntityId, imageId: string): Promise<void>`

Remove an image from a sprite slot.

- **Deletes**: Blob via `spriteStorage.deleteImageBlob(imageId)`
- **Updates**: Removes from `config.slots[entityId].images`, recalculates `order` fields
- **Persists**: Updated config

#### `reorderImages(entityId: EntityId, fromIndex: number, toIndex: number): void`

Reorder images within a slot (drag-and-drop).

- **Pure state mutation**: Splice the images array, update `order` fields
- **Persists**: Debounced config save (avoid rapid writes during drag)

#### `clearSlot(entityId: EntityId): Promise<void>`

Remove all images from a slot, returning it to default sprites.

- **Deletes**: All blobs for the slot
- **Updates**: `config.slots[entityId].images = []`
- **Persists**: Updated config

#### `getTextureKeyForLevel(entityId: EntityId, level: number): string | null`

Compute which Phaser texture key to use for a character at a given level.

- **Returns**: `config.slots[entityId].images[Math.min(level - 1, images.length - 1)].textureKey`
- **Returns null**: If no custom images uploaded for this entity

#### `getTextureKeyForWave(entityId: EntityId, wave: number): string | null`

Compute which Phaser texture key to use for an enemy type at a given wave.

- **Returns**: `config.slots[entityId].images[Math.min(Math.floor((wave - 1) / 2), images.length - 1)].textureKey`
- **Returns null**: If no custom images uploaded for this entity

---

## 4. Phaser Texture Loading API

Module: Integrated into `src/game/scenes/BootScene.ts`

### `loadBlobAsTexture(scene: Phaser.Scene, key: string, blob: Blob): Promise<string>`

Load an image blob as a Phaser texture.

- **Input**: Phaser scene reference, unique texture key, image blob
- **Process**: `URL.createObjectURL(blob)` → `HTMLImageElement` → `scene.textures.addImage(key, img)` → `URL.revokeObjectURL(url)`
- **Returns**: The texture key on success
- **Throws**: `Error` if image fails to load
- **Precondition**: Removes existing texture if key already exists (`scene.textures.remove(key)`)

### `restoreAllCustomTextures(scene: Phaser.Scene): Promise<void>`

Called during BootScene.create() to reconstruct all custom textures from IndexedDB.

- **Reads**: All image blobs from IndexedDB via spriteStore config
- **Loads**: Each blob as a Phaser texture via `loadBlobAsTexture()`
- **Parallel**: Uses `Promise.all()` for concurrent loading
- **Error handling**: Skips missing blobs (evicted by browser), logs warning, marks image as unavailable in store

---

## 5. Sprite Progression System

Module: `src/game/systems/SpriteProgressionSystem.ts`

### `constructor(scene, kitty, doggo, spawnSystem)`

Register references to game entities for sprite management.

### `onLevelUp(playerId: PlayerId, newLevel: number): void`

Called by `LevelUpSystem` after an upgrade is applied.

- **Reads**: `spriteStore.getTextureKeyForLevel(playerId, newLevel)`
- **If result is non-null**: `player.sprite.setTexture(textureKey)` + `player.sprite.setDisplaySize(48, 48)`
- **Always**: Trigger VFX via `LevelUpVFXSystem`

### `onWaveAdvance(newWave: number): void`

Called by `WaveSystem` when wave number increases.

- **For each enemy type**: Compute new texture key via `spriteStore.getTextureKeyForWave()`
- **If changed**: Future enemy spawns use the new texture key
- **Already-spawned enemies**: Optionally update (or keep current sprite until respawn)

### `updateEnemyTexture(enemy: Enemy, waveNumber: number): void`

Called when an enemy is activated/spawned to set its current texture.

- **Reads**: `spriteStore.getTextureKeyForWave(enemy.type, waveNumber)`
- **If non-null**: `enemy.sprite.setTexture(textureKey)` + appropriate display size

---

## 6. Level-Up VFX System

Module: `src/game/systems/LevelUpVFXSystem.ts`

### `constructor(scene: Phaser.Scene)`

Initialize VFX system. Generate `particle-white` texture if not exists.

### `playLevelUpEffect(x: number, y: number, level: number, sprite: Phaser.GameObjects.Sprite): void`

Play the full level-up visual effect sequence.

- **Computes**: Tier from level via `getTierForLevel(level)`
- **Burst**: Ring explosion particle emitter (one-shot, `explode(burstCount)`)
- **Sparkles**: Floating upward particles with tier color (one-shot)
- **Fire trail** (high tiers only): Continuous upward fire emitter for 2 seconds
- **Persistent glow**: `sprite.postFX.addGlow(tier.color, tier.glowStrength)` with pulsing tween
- **Cleanup**: All one-shot emitters destroyed via `scene.time.delayedCall()`

### `clearGlow(sprite: Phaser.GameObjects.Sprite): void`

Remove all PostFX effects from a sprite. Called before applying new tier glow.

### `getTierForLevel(level: number): LevelTier`

Pure function returning the tier configuration for a given level.

---

## 7. React Component Contracts

### CustomizeOverlay

`src/ui/CustomizeOverlay.tsx`

| Prop      | Type         | Description                                             |
| --------- | ------------ | ------------------------------------------------------- |
| `onClose` | `() => void` | Callback to dismiss the overlay and return to game/menu |

**Reads from**: `spriteStore` (config, isLoaded, errorMessage)
**Renders**: Tab-based layout with 5 entity slots (2 characters + 3 enemies)

### SpriteSlotPanel

`src/ui/SpriteSlotPanel.tsx`

| Prop       | Type            | Description                                 |
| ---------- | --------------- | ------------------------------------------- |
| `entityId` | `EntityId`      | Which slot this panel manages               |
| `label`    | `string`        | Display name (e.g., "Kitty", "Enemy: Bill") |
| `images`   | `CustomImage[]` | Current ordered images for this slot        |

**Actions via**: `spriteStore.addImage()`, `spriteStore.removeImage()`, `spriteStore.reorderImages()`
**Renders**: File upload button, drag-and-drop image list, clear-all button

### SpriteListItem

`src/ui/SpriteListItem.tsx`

| Prop        | Type                        | Description                         |
| ----------- | --------------------------- | ----------------------------------- |
| `image`     | `CustomImage`               | Image metadata for display          |
| `index`     | `number`                    | Position in list (for "Lv X" label) |
| `onRemove`  | `(imageId: string) => void` | Remove callback                     |
| `draggable` | `boolean`                   | Whether DnD is enabled              |

**Renders**: Thumbnail, level label, filename, remove button

---

## 8. Game State Extensions

### gameStore additions

```typescript
// New fields added to existing GameStore interface:
interface GameStoreExtension {
  // Customization screen state
  showCustomize: boolean;
  setShowCustomize: (show: boolean) => void;
}
```

### App.tsx routing

```
showCustomize === true  → render <CustomizeOverlay />
showCustomize === false → render <PhaserGame /> + <HUD /> + overlays (existing)
```

---

## Event Flow: Level-Up with Sprite Swap

```
1. Player collects coins → store.coins >= store.nextLevelThreshold
2. LevelUpSystem.triggerLevelUp() → gameState = 'level-up'
3. Player selects upgrade → LevelUpSystem.applyUpgrade()
4. LevelUpSystem calls:
   a. SpriteProgressionSystem.onLevelUp(playerId, newLevel)
      → sprite.setTexture(nextCustomTexture)  [if custom sprite exists]
      → sprite.setDisplaySize(48, 48)
   b. LevelUpVFXSystem.playLevelUpEffect(x, y, newLevel, sprite)
      → burst particles
      → tier glow update
5. LevelUpSystem.resumeGame() → gameState = 'playing'
```

## Event Flow: Enemy Spawn with Custom Texture

```
1. WaveSystem advances wave → SpriteProgressionSystem.onWaveAdvance(newWave)
2. SpawnSystem.spawnEnemy() creates Enemy entity
3. During Enemy.activate():
   → SpriteProgressionSystem.updateEnemyTexture(enemy, currentWave)
   → enemy.sprite.setTexture(customKey)  [if custom sprite exists]
   → enemy.sprite.setDisplaySize(scaledWidth, scaledHeight)
```
