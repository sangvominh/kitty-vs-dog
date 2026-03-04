# Tasks: Custom Character & Monster Sprite System

**Input**: Design documents from `/specs/002-custom-character-sprites/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sprite-system.md, quickstart.md

**Tests**: Not explicitly requested — no test tasks included.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1–US6) — Setup/Foundational/Polish phases have no story label
- Exact file paths included in every task

## Phase 1: Setup

**Purpose**: Install dependency, create shared type definitions and utility modules with no game logic dependencies

- [x] T001 Install `idb-keyval` dependency via `npm install idb-keyval`
- [x] T002 [P] Create image validation module in `src/lib/imageValidator.ts` — export `validateImageFile(file: File): ValidationResult` (type/size checks: PNG/JPG/JPEG/GIF/WebP, max 5MB, non-empty) and `decodeImageDimensions(file: File): Promise<ImageDimensions>` (Blob URL → HTMLImageElement → naturalWidth/naturalHeight). Define `ValidationResult` and `ImageDimensions` interfaces per contracts/sprite-system.md §2
- [x] T003 [P] Create IndexedDB persistence module in `src/lib/spriteStorage.ts` — export `saveConfig`, `loadConfig`, `saveImageBlob`, `loadImageBlob`, `deleteImageBlob`, `clearAllSprites` functions using `idb-keyval` (get/set/del). Key patterns: `'sprite-config'` for metadata, `'blob:{imageId}'` for image blobs. See contracts/sprite-system.md §1
- [x] T004 [P] Create shared type definitions in `src/game/state/spriteTypes.ts` — export `EntityId` union type, `SpriteConfig`, `SpriteSlot`, `CustomImage`, `LevelTier` interfaces, `ENTITY_IDS` array constant, `DEFAULT_DISPLAY_SIZES` record, and `TIER_CONFIG` array constant as specified in data-model.md. Also export `createEmptySpriteConfig()` factory function

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Zustand sprite store and Phaser texture loading — MUST be complete before any user story work

**⚠️ CRITICAL**: No user story tasks can begin until this phase is complete

- [x] T005 Create Zustand sprite store in `src/game/state/spriteStore.ts` — import types from `spriteTypes.ts`, implement `SpriteStoreState` interface with `config`, `isLoaded`, `loadingSlot`, `errorMessage` state fields and actions: `loadConfig`, `addImage`, `removeImage`, `reorderImages`, `clearSlot`, `getTextureKeyForLevel`, `getTextureKeyForWave`. Wire persistence to `spriteStorage.ts` functions. See contracts/sprite-system.md §3
- [x] T006 Create `loadBlobAsTexture` utility function in `src/game/scenes/BootScene.ts` — accepts `(scene, key, blob)`, creates `URL.createObjectURL(blob)` → `HTMLImageElement` → `scene.textures.addImage(key, img)` → `URL.revokeObjectURL(url)`. Remove existing texture if key exists. Returns `Promise<string>`. See contracts/sprite-system.md §4
- [x] T007 Modify `src/game/scenes/BootScene.ts` `create()` method — after generating primitive textures, generate `particle-white` texture (8×8 white circle), then `await spriteStore.loadConfig()`, then `await restoreAllCustomTextures(scene)` which loads all blobs from IndexedDB as Phaser textures via `loadBlobAsTexture`. Make `create()` async and only call `this.scene.start('GameScene')` after all textures are loaded. Handle missing blobs gracefully (skip + warn)
- [x] T008 Add `showCustomize` boolean and `setShowCustomize` action to `src/game/state/gameStore.ts` — extend the existing `GameStore` interface and `initialState` with `showCustomize: false`

**Checkpoint**: Sprite store functional, textures restored from IndexedDB on boot, gameStore has customize toggle

---

## Phase 3: User Story 1 — Upload Custom Sprites for Characters (Priority: P1) 🎯 MVP

**Goal**: Players can upload ordered image lists for Kitty and Doggo character slots via a customization UI, and the game uses the Level 1 custom sprite when starting

**Independent Test**: Open customization screen → upload 3 images for Kitty, 3 for Doggo → start game → verify both characters display their Level 1 custom sprite instead of default shapes. Upload no images for a slot → verify default geometric shape is used.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `src/ui/SpriteListItem.tsx` — a React component that renders a single sprite thumbnail row: level label (`Lv {index+1}`), thumbnail image (w-10 h-10 object-contain), filename text, and a remove button (X icon). Props: `image: CustomImage`, `index: number`, `onRemove: (imageId: string) => void`. Style with TailwindCSS (border, padding, flex layout). No drag-and-drop yet (US6)
- [x] T010 [P] [US1] Create `src/ui/SpriteSlotPanel.tsx` — a React component for one entity slot: displays slot label (e.g. "Kitty"), a file upload button (`<input type="file" accept="image/*" multiple>`), the ordered list of `SpriteListItem` components, and a "Clear All" button. On file select: call `spriteStore.addImage(entityId, file)` for each file. Show `errorMessage` from store. Display loading state from `loadingSlot`. Props: `entityId: EntityId`, `label: string`
- [x] T011 [US1] Create `src/ui/CustomizeOverlay.tsx` — full-screen React overlay with TailwindCSS styling (dark semi-transparent background, centered card). Renders a tab bar with 5 tabs (Kitty, Doggo, Bill, Deadline, Ex-Lover) — but only wire up Kitty and Doggo tabs for US1 (enemy tabs show "Coming soon" placeholder). Each tab renders a `SpriteSlotPanel`. Include a "Start Game" button that calls `setShowCustomize(false)`. Include a close/back button via `onClose` prop. Reads `spriteStore` for `config`, `isLoaded`, `errorMessage`
- [x] T012 [US1] Modify `src/App.tsx` — import `CustomizeOverlay` and `useGameStore`. When `showCustomize === true`, render `<CustomizeOverlay onClose={() => setShowCustomize(false)} />` instead of the game. Add a "Customize" button visible when game is not running (before PhaserGame mounts or on game-over screen) that sets `showCustomize(true)`
- [x] T013 [US1] Modify `src/game/scenes/BootScene.ts` — in the `restoreAllCustomTextures` flow, for each loaded character texture also set `sprite.setDisplaySize(48, 48)` default size metadata. Ensure Kitty and Doggo character slots' first custom texture key is available so `GameScene` can pick it up on player creation
- [x] T014 [US1] Modify `src/game/scenes/GameScene.ts` `create()` method — after creating `this.kitty` and `this.doggo`, check `spriteStore.getTextureKeyForLevel('kitty', 1)` and `spriteStore.getTextureKeyForLevel('doggo', 1)`. If non-null, call `player.sprite.setTexture(textureKey)` and `player.sprite.setDisplaySize(48, 48)` for the respective player

**Checkpoint**: Players can upload images, see them listed, start game with custom Level 1 sprites. Default fallback works when no images uploaded.

---

## Phase 4: User Story 2 — Level-Based Sprite Progression (Priority: P1)

**Goal**: Characters automatically swap to the next custom sprite in the ordered list each time they level up. If level exceeds image count, last image persists.

**Independent Test**: Upload 3 images for Kitty → start game → collect coins for 3 level-ups → verify sprite changes on each level-up → level up a 4th time → verify 3rd image remains.

### Implementation for User Story 2

- [x] T015 [US2] Create `src/game/systems/SpriteProgressionSystem.ts` — constructor takes `(scene, kitty, doggo, spawnSystem)`. Implement `onLevelUp(playerId: PlayerId, newLevel: number)`: read `spriteStore.getTextureKeyForLevel(playerId, newLevel)`, if non-null call `player.sprite.setTexture(textureKey)` and `player.sprite.setDisplaySize(48, 48)`. Store references to kitty and doggo players. See contracts/sprite-system.md §5
- [x] T016 [US2] Modify `src/game/scenes/GameScene.ts` — instantiate `SpriteProgressionSystem` after creating players and spawnSystem. Store as `this.spriteProgression`. Pass it to `LevelUpSystem` constructor (add parameter)
- [x] T017 [US2] Modify `src/game/systems/LevelUpSystem.ts` `applyUpgrade()` method — after incrementing the level via `store.setLevel(newLevel)`, call `this.spriteProgression.onLevelUp(upgradingPlayer, newLevel)` to trigger the sprite swap. Add `spriteProgression: SpriteProgressionSystem` as a constructor parameter and class field

**Checkpoint**: Character sprites progress through the uploaded image list on each level-up. Clamping works at list end.

---

## Phase 5: User Story 3 — Upload Custom Sprites for Enemies (Priority: P2)

**Goal**: Players can upload custom sprites for each enemy type (Bill, Deadline, Ex-Lover) that advance with wave progression

**Independent Test**: Upload 2 images for "Bill" enemy → start game → verify wave 1–2 enemies use image 1 → wave 3+ enemies use image 2. No upload → defaults used.

### Implementation for User Story 3

- [x] T018 [US3] Modify `src/ui/CustomizeOverlay.tsx` — enable the three enemy type tabs (Bill, Deadline, Ex-Lover) that were placeholder in US1. Wire each tab to its own `SpriteSlotPanel` with the appropriate `entityId` (`'enemy-bill'`, `'enemy-deadline'`, `'enemy-ex-lover'`)
- [x] T019 [US3] Add `onWaveAdvance(newWave: number)` and `updateEnemyTexture(enemy: Enemy, waveNumber: number)` methods to `src/game/systems/SpriteProgressionSystem.ts` — `onWaveAdvance` stores the current wave texture keys per enemy type. `updateEnemyTexture` reads `spriteStore.getTextureKeyForWave(enemyType, waveNumber)`, if non-null sets `enemy.sprite.setTexture(textureKey)` and applies proportional display size (bill: 40×40, deadline: 36×36, ex-lover: 64×64 per data-model.md)
- [x] T020 [US3] Modify `src/game/systems/SpawnSystem.ts` or enemy activation path — after `enemy.activate()`, call `spriteProgression.updateEnemyTexture(enemy, currentWaveNumber)` to apply any custom texture. Requires passing `SpriteProgressionSystem` reference and current wave number
- [x] T021 [US3] Modify `src/game/systems/WaveSystem.ts` — when wave number increments, call `spriteProgression.onWaveAdvance(newWave)` to update the cached enemy texture keys for future spawns

**Checkpoint**: All 5 entity types (2 characters + 3 enemies) support independent custom sprite lists with default fallback.

---

## Phase 6: User Story 4 — Level-Up Visual Effects (Priority: P2)

**Goal**: Eye-catching burst VFX (sparkles, fire ring) play on level-up, plus a persistent tier-colored glow that escalates through 5 tiers

**Independent Test**: Trigger level-up events → verify burst particles appear for 2-3 seconds → verify persistent glow changes color at tier boundaries (Level 1 blue, Level 3 purple, Level 5 gold, Level 8 fire, Level 12 legendary). Works with both custom and default sprites.

### Implementation for User Story 4

- [x] T022 [P] [US4] Create `src/game/systems/LevelUpVFXSystem.ts` — constructor takes `(scene: Phaser.Scene)`. Implement `getTierForLevel(level)` pure function using `TIER_CONFIG` from `spriteTypes.ts`. Implement `clearGlow(sprite)` to call `sprite.postFX.clear()` with WebGL fallback check. Implement `playLevelUpEffect(x, y, level, sprite)`: compute tier, create ring burst via `scene.add.particles(x, y, 'particle-white', {...})` + `explode(burstCount)`, create sparkles emitter (float upward), optionally create fire trail emitter for high tiers (continuous 2s), apply persistent glow via `sprite.postFX.addGlow(tier.color, tier.glowStrength)` with pulsing tween. Auto-destroy one-shot emitters via `scene.time.delayedCall()`. See contracts/sprite-system.md §6 and research.md Topic 3
- [x] T023 [US4] Modify `src/game/scenes/GameScene.ts` — instantiate `LevelUpVFXSystem` and pass to `LevelUpSystem` (add constructor parameter)
- [x] T024 [US4] Modify `src/game/systems/LevelUpSystem.ts` `applyUpgrade()` method — after calling `spriteProgression.onLevelUp()`, call `this.vfxSystem.playLevelUpEffect(player.x, player.y, newLevel, player.sprite)`. Add `vfxSystem: LevelUpVFXSystem` as constructor parameter and class field
- [x] T025 [US4] Verify `particle-white` texture exists in `src/game/scenes/BootScene.ts` — ensure the 8×8 white circle texture generated in T007 is available. If BootScene was already modified, confirm the texture key `'particle-white'` is generated before GameScene starts

**Checkpoint**: Level-ups produce visible burst effects and persistent tier-colored glow. Effects escalate across 5 tiers. Works with default geometric shapes and custom sprites.

---

## Phase 7: User Story 5 — Sprite Size & Display (Priority: P2)

**Goal**: Custom sprites display at comfortable increased sizes (~48×48 for characters, proportionally scaled for enemies) with preserved aspect ratio

**Independent Test**: Upload a non-square image for Kitty → start game → verify sprite is ~48px tall/wide, maintaining aspect ratio (no stretching). Upload for enemy-bill → verify ~40×40 display.

### Implementation for User Story 5

- [x] T026 [US5] Create a shared `applyCustomSpriteSize(sprite: Phaser.GameObjects.Sprite, entityId: EntityId)` helper function in `src/game/systems/SpriteProgressionSystem.ts` — reads `DEFAULT_DISPLAY_SIZES[entityId]` from `spriteTypes.ts` to get `{customWidth, customHeight}`, then calls `sprite.setDisplaySize(width, height)`. Preserves aspect ratio by computing the scale factor from the larger dimension
- [x] T027 [US5] Update all `setDisplaySize(48, 48)` calls in `SpriteProgressionSystem.onLevelUp()`, `GameScene.create()`, and `updateEnemyTexture()` to use `applyCustomSpriteSize(sprite, entityId)` instead of hardcoded sizes — ensures proportional scaling per entity type and aspect ratio preservation
- [x] T028 [US5] Add custom display size constants to `DEFAULT_DISPLAY_SIZES` in `src/game/state/spriteTypes.ts` — `kitty: {default: 32, custom: 48}`, `doggo: {default: 32, custom: 48}`, `'enemy-bill': {default: 28, custom: 40}`, `'enemy-deadline': {default: 24, custom: 36}`, `'enemy-ex-lover': {default: 48, custom: 64}`

**Checkpoint**: All entity types render at appropriate increased sizes with preserved aspect ratio.

---

## Phase 8: User Story 6 — Reorder and Remove Uploaded Sprites (Priority: P3)

**Goal**: Players can drag-and-drop to reorder images in sprite lists, and click to remove individual images

**Independent Test**: Upload 3 images for Kitty → drag 3rd image to position 1 → verify list reorders → remove 2nd image → verify it disappears and remaining images re-index → remove all → start game → verify default shape used.

### Implementation for User Story 6

- [x] T029 [US6] Add native HTML5 drag-and-drop to `src/ui/SpriteListItem.tsx` — make the component `draggable`, add `onDragStart` (set drag index via `dataTransfer`), set `draggable={false}` on inner `<img>` to prevent browser default. Add visual feedback classes for dragging state (opacity-30). See research.md Topic 4
- [x] T030 [US6] Add drag-and-drop event handlers to `src/ui/SpriteSlotPanel.tsx` — implement `onDragOver` (e.preventDefault + drop indicator), `onDrop` (compute target index, call `spriteStore.reorderImages(entityId, fromIndex, toIndex)`), `onDragEnd` (clear drag state). Show visual drop indicator (border highlight) on the target position. See research.md Topic 4 for full React DnD pattern
- [x] T031 [US6] Verify `reorderImages` action in `src/game/state/spriteStore.ts` — ensure the array splice logic correctly moves an item from `fromIndex` to `toIndex`, updates all `order` fields in `CustomImage` records, and persists the updated config. Also verify `removeImage` action correctly deletes the blob from IndexedDB and re-indexes remaining images

**Checkpoint**: Full sprite management workflow: upload, reorder via drag-and-drop, remove individual images, clear all. Persists across sessions.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, edge cases, error handling, and performance validation

- [x] T032 [P] Add session persistence validation in `src/game/scenes/BootScene.ts` — after `restoreAllCustomTextures`, verify each blob key in config actually resolved to a Phaser texture. For any missing textures (evicted by browser), remove the `CustomImage` from config, log a warning, and show a notification to the player that some custom sprites were lost
- [x] T033 [P] Add error boundary and notification display in `src/ui/CustomizeOverlay.tsx` — show toast/banner for validation errors (invalid file type, file too large, corrupted image) from `spriteStore.errorMessage`. Auto-dismiss after 5 seconds. Style with TailwindCSS red/warning colors
- [x] T034 Perform end-to-end integration validation: upload sprites for all 5 entity types → start game → level up multiple times → verify sprite progression + VFX → close and reopen browser → verify sprites persist → delete IndexedDB manually → verify graceful fallback to defaults
- [x] T035 [P] Run `npx tsc --noEmit` and `npm run lint` — fix any TypeScript errors or ESLint warnings across all new and modified files
- [x] T036 Run `npm run build` — verify production build succeeds with zero errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001 must complete; T002–T004 must complete for T005–T008)
- **Phase 3 (US1)**: Depends on Phase 2 completion — first user story, delivers MVP
- **Phase 4 (US2)**: Depends on Phase 3 (US1) — needs sprite upload + GameScene wiring
- **Phase 5 (US3)**: Depends on Phase 2 — can run in parallel with Phase 4 (US2) since enemy system is independent of character progression
- **Phase 6 (US4)**: Depends on Phase 2 — can run in parallel with Phase 3–5 since VFX is independent
- **Phase 7 (US5)**: Depends on Phase 4 (US2) and Phase 5 (US3) — refactors display sizing that those phases introduce
- **Phase 8 (US6)**: Depends on Phase 3 (US1) — enhances the upload UI components created in US1
- **Phase 9 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — no other story dependencies
- **US2 (P1)**: Depends on US1 (needs sprites in store + GameScene wiring)
- **US3 (P2)**: Foundation only — independent of US1/US2 (different entity types, different systems)
- **US4 (P2)**: Foundation only — independent VFX system (works with or without custom sprites)
- **US5 (P2)**: Depends on US2 + US3 (refactors sizing across both)
- **US6 (P3)**: Depends on US1 (enhances the UI components created there)

### Within Each User Story

- Create files before modifying existing files
- New modules before wiring into existing systems
- UI components before App.tsx routing changes

### Parallel Opportunities

**Setup (Phase 1)**: T002, T003, T004 can all run in parallel after T001
**Foundational (Phase 2)**: T005 depends on T002–T004; T006–T008 can run in parallel with T005
**After Foundation**: US3 (Phase 5) and US4 (Phase 6) can run in parallel with US1 (Phase 3) + US2 (Phase 4)
**US1 internals**: T009 and T010 can run in parallel (different files)
**US4 internals**: T022 can run in parallel with other US4 tasks

---

## Parallel Example: After Foundational (Multi-Track)

```
Track A (Characters):    US1 (T009–T014) → US2 (T015–T017)
Track B (Enemies):       US3 (T018–T021)
Track C (VFX):           US4 (T022–T025)
                              ↓ all converge ↓
                         US5 (T026–T028) → US6 (T029–T031) → Polish (T032–T036)
```

---

## Parallel Example: User Story 1 Internals

```bash
# These can run in parallel (different files):
Task T009: "Create SpriteListItem.tsx"
Task T010: "Create SpriteSlotPanel.tsx"

# Then sequentially:
Task T011: "Create CustomizeOverlay.tsx" (depends on T009, T010)
Task T012: "Modify App.tsx" (depends on T011)
Task T013: "Modify BootScene.ts" (depends on T005-T007)
Task T014: "Modify GameScene.ts" (depends on T013)
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T008)
3. Complete Phase 3: User Story 1 — Upload & Display (T009–T014)
4. Complete Phase 4: User Story 2 — Level Progression (T015–T017)
5. **STOP and VALIDATE**: Upload custom sprites, play game, level up, verify sprite swaps
6. This is a fully functional MVP — deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Core infrastructure ready
2. US1 → Character upload works → **Playable with custom sprites at Level 1**
3. US2 → Sprite progression on level-up → **Full character customization flow**
4. US3 → Enemy customization → **All 5 entity types customizable**
5. US4 → Level-up VFX → **Visual polish, feels great**
6. US5 → Proper sizing → **Visual quality refined**
7. US6 → Reorder/remove → **Full management UX**
8. Polish → Edge cases, persistence, error handling → **Production-ready**

---

## Notes

- No test tasks included — spec did not request TDD or automated tests
- Manual playtest validation per constitution's "Playtest Gate" requirement
- Only 1 new dependency: `idb-keyval` (~600B gzip)
- Total: 36 tasks across 9 phases
- 6 user stories mapped to Phases 3–8
- Parallelizable tracks: Characters (US1→US2), Enemies (US3), VFX (US4) can all proceed concurrently after Foundational phase
