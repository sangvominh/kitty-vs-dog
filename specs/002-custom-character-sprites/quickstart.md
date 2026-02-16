# Quickstart: Custom Character & Monster Sprite System

**Feature**: 002-custom-character-sprites  
**Date**: 2026-02-15  
**Audience**: Developer implementing this feature

---

## Prerequisites

- Node.js 18+ and npm installed
- Existing codebase on branch `002-custom-character-sprites`
- Feature 001-gameplay-core merged (core game loop working)

## Setup

```bash
# Switch to feature branch
git checkout 002-custom-character-sprites

# Install new dependency
npm install idb-keyval

# Verify build still passes
npm run build
```

## New Dependency

| Package      | Version       | Purpose                                                      |
| ------------ | ------------- | ------------------------------------------------------------ |
| `idb-keyval` | latest (^6.x) | Tiny IndexedDB key-value wrapper for persisting sprite blobs |

## Architecture at a Glance

```
React UI (CustomizeOverlay)
    │
    ▼
Zustand spriteStore ◄──── IndexedDB (idb-keyval)
    │                          │
    ▼                          ▼
Phaser BootScene ──── loadBlobAsTexture() ──── Phaser TextureManager
    │
    ▼
SpriteProgressionSystem ──── sprite.setTexture() on level-up/wave
LevelUpVFXSystem ──────────── postFX.addGlow() + particles.explode()
```

## Implementation Order

### Step 1: Storage Layer (`src/lib/`)

1. Create `src/lib/imageValidator.ts` — file type/size validation
2. Create `src/lib/spriteStorage.ts` — IndexedDB CRUD via `idb-keyval`
3. These have zero game dependencies — can be tested in isolation

### Step 2: Zustand Store (`src/game/state/spriteStore.ts`)

1. Define `SpriteConfig`, `SpriteSlot`, `CustomImage` types
2. Create Zustand store with `loadConfig`, `addImage`, `removeImage`, `reorderImages` actions
3. Wire up persistence to spriteStorage functions

### Step 3: Texture Loading (Modify `BootScene.ts`)

1. Add `loadBlobAsTexture()` utility function
2. In `BootScene.create()`: call `spriteStore.loadConfig()` then `restoreAllCustomTextures()`
3. Add `particle-white` texture generation for VFX
4. Only after all textures loaded → transition to GameScene

### Step 4: React Customization UI

1. Create `src/ui/CustomizeOverlay.tsx` — full-screen overlay with entity slot tabs
2. Create `src/ui/SpriteSlotPanel.tsx` — file upload + drag-and-drop list per slot
3. Create `src/ui/SpriteListItem.tsx` — individual draggable thumbnail
4. Add `showCustomize` state to gameStore
5. Modify `App.tsx` to route between customize screen and game

### Step 5: Sprite Progression System

1. Create `src/game/systems/SpriteProgressionSystem.ts`
2. Wire into `LevelUpSystem.applyUpgrade()` — call `onLevelUp()` after upgrade
3. Wire into `SpawnSystem` — call `updateEnemyTexture()` on enemy activation
4. Handle custom display sizes (48×48 for characters, proportional for enemies)

### Step 6: Level-Up VFX System

1. Create `src/game/systems/LevelUpVFXSystem.ts`
2. Implement `playLevelUpEffect()` — burst particles + sparkles + fire (high tiers)
3. Implement persistent glow via `sprite.postFX.addGlow()` with tier-colored pulsing tween
4. Wire into `LevelUpSystem` — call after sprite progression

### Step 7: Integration & Polish

1. End-to-end test: upload → save → restart → textures restored → play → level-up → sprite swap + VFX
2. Error handling: missing blobs, corrupted images, IndexedDB eviction
3. Edge cases: no custom images (default fallback), more levels than images (clamp)

## Key Files Quick Reference

| File                                          | Role                                   |
| --------------------------------------------- | -------------------------------------- |
| `src/lib/imageValidator.ts`                   | Validate file type, size, decodability |
| `src/lib/spriteStorage.ts`                    | IndexedDB CRUD for config + blobs      |
| `src/game/state/spriteStore.ts`               | Zustand store bridging React ↔ Phaser  |
| `src/game/scenes/BootScene.ts`                | Load custom textures on startup        |
| `src/game/systems/SpriteProgressionSystem.ts` | Swap sprites on level-up/wave          |
| `src/game/systems/LevelUpVFXSystem.ts`        | Burst particles + tier glow effects    |
| `src/ui/CustomizeOverlay.tsx`                 | Main customization screen              |
| `src/ui/SpriteSlotPanel.tsx`                  | Per-entity upload/reorder panel        |
| `src/ui/SpriteListItem.tsx`                   | Draggable thumbnail in list            |

## Validation Commands

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build

# Dev server (manual playtest)
npm run dev
```

## Gotchas to Watch For

1. **BootScene must `await` IndexedDB** — texture loading is async. Don't transition to GameScene until all custom textures are loaded.
2. **`sprite.setTexture()` doesn't resize physics body** — only visual changes. This is intentional (consistent hitboxes).
3. **`postFX.addGlow()` is WebGL-only** — check `sprite.postFX` existence before calling. Falls back to Graphics overlay on Canvas renderer.
4. **`URL.revokeObjectURL()` after texture upload** — memory leak if forgotten. Revoke inside `img.onload` callback.
5. **Particle cleanup** — always `destroy()` one-shot emitters via `scene.time.delayedCall()`. They persist invisibly otherwise.
6. **IndexedDB is async everywhere** — no synchronous access. Use `async/await` in `BootScene.create()`, not `preload()`.
