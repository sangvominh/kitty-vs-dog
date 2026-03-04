# Implementation Plan: Custom Character & Monster Sprite System

**Branch**: `002-custom-character-sprites` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-custom-character-sprites/spec.md`

## Summary

Build a customization UI that allows players to upload ordered image lists for each character (Kitty, Doggo) and enemy type (Bill, Deadline, Ex-Lover). Images are stored locally (git-ignored), displayed at an increased size (~48×48 for characters), and automatically swap on level-up (characters) or wave progression (enemies). Level-up events trigger tiered burst + persistent glow visual effects via Phaser particle emitters and graphics overlays.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode via tsconfig)
**Primary Dependencies**: React 19, Phaser 3.90, Zustand 5, TailwindCSS 4, Vite
**Storage**: IndexedDB (via `idb-keyval`) for sprite config persistence and image blob storage (all browser-side, no filesystem)
**Testing**: Manual playtest (existing workflow per constitution); TypeScript compiler (`tsc --noEmit`) + ESLint for static validation
**Target Platform**: Latest Chrome & Firefox (browser-based, local)
**Project Type**: Web (React + Phaser single-project hybrid)
**Performance Goals**: 60 FPS with up to 50 enemies + custom sprites loaded for all 5 entity types
**Constraints**: Max 5MB per uploaded image; images stored locally only (not bundled in dist); no complex sprite-sheet animations (constitution: squash-and-stretch tweens only)
**Scale/Scope**: 5 customizable entity slots, up to ~10 images per slot, single-player/local-co-op

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                     | Status       | Assessment                                                                                                                                                                                                                                                                                          |
| ----------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Tether-First Design**    | ✅ PASS      | Feature is purely visual (sprite swaps + VFX). No impact on tether physics, clothesline attack, or Love Reload mechanic. Sprite size increase (32→48px) does not affect collision body radius.                                                                                                      |
| **II. Swap-Ready Assets**     | ✅ PASS      | This feature IS the Phase 2 sprite swap mechanism described in the constitution. Custom sprites override via the asset key / texture system. Gameplay code remains unchanged — only texture references swap. Animation limited to particle emitters and glow tweens (squash-and-stretch compliant). |
| **III. Co-op Parity**         | ✅ PASS      | Both players get independent sprite customization with identical functionality. No gameplay balance impact — purely cosmetic.                                                                                                                                                                       |
| **IV. Humor-Driven Design**   | ✅ PASS      | Custom sprites enable player-driven humor (upload meme images, custom drawings). VFX add visual flair without delaying gameplay features. The feature respects "aesthetics are Phase 2 work" since core gameplay (001) is already implemented.                                                      |
| **V. Incremental Milestones** | ✅ PASS      | Core gameplay loop (Steps 1-4) is complete in branch 001. This feature is Phase 2 polish/asset work, appropriate for the current stage.                                                                                                                                                             |
| **Tech Stack**                | ✅ PASS      | Uses React for UI overlay, Phaser for in-game rendering, Zustand for state bridge, TailwindCSS for styling. All within mandated stack.                                                                                                                                                              |
| **Asset Storage**             | ⚠️ DEVIATION | Constitution says assets in `/public/assets/`. Custom user uploads go to `/public/custom-sprites/` (separate, git-ignored). This is justified because user-uploaded files are not distribution assets and must not enter version control.                                                           |
| **Performance Target**        | ✅ PASS      | Pre-loading sprites as Phaser textures on game start ensures no runtime loading delay. Sprite count is bounded (max ~50 textures total).                                                                                                                                                            |

**Gate Result**: PASS (1 justified deviation documented below)

## Project Structure

### Documentation (this feature)

```text
specs/002-custom-character-sprites/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── sprite-system.md # Sprite system API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── assets/
│   │   └── AssetManifest.ts          # Extended with custom sprite size config
│   ├── entities/
│   │   ├── Player.ts                 # Modified: sprite swap on level-up
│   │   └── Enemy.ts                  # Modified: sprite swap on wave progression
│   ├── scenes/
│   │   ├── BootScene.ts              # Modified: load custom textures from IndexedDB
│   │   └── GameScene.ts              # Modified: wire sprite progression events
│   ├── state/
│   │   ├── gameStore.ts              # Extended: sprite config state fields
│   │   └── spriteStore.ts            # NEW: Zustand store for sprite configuration
│   └── systems/
│       ├── LevelUpSystem.ts          # Modified: trigger sprite swap + VFX on level-up
│       ├── SpriteProgressionSystem.ts # NEW: manages sprite swaps for all entities
│       └── LevelUpVFXSystem.ts       # NEW: burst + persistent glow effects
├── ui/
│   ├── CustomizeOverlay.tsx          # NEW: main customization screen
│   ├── SpriteSlotPanel.tsx           # NEW: upload/reorder/remove for one slot
│   └── SpriteListItem.tsx            # NEW: draggable thumbnail in sprite list
├── lib/
│   ├── spriteStorage.ts              # NEW: IndexedDB persistence layer
│   └── imageValidator.ts             # NEW: file type/size validation
└── App.tsx                           # Modified: add customize screen routing
```

**Structure Decision**: Single-project structure (existing). New files added within existing `src/game/`, `src/ui/`, and new `src/lib/` directories. Images stored in IndexedDB (browser storage) — no filesystem changes needed. Nothing to gitignore for uploads.

## Complexity Tracking

| Deviation                                                                            | Why Needed                                                                                                                    | Simpler Alternative Rejected Because                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Images stored in IndexedDB instead of `/public/assets/` or `/public/custom-sprites/` | Research found `public/` is read-only at runtime; IndexedDB stores blobs natively with no size limit and nothing to gitignore | File system storage requires Node.js server; localStorage has 5MB limit and only stores strings |
| New dependency `idb-keyval` (~600B gzip)                                             | Raw IndexedDB API requires 30+ lines for simple get/set; this tiny wrapper eliminates boilerplate                             | Raw API is verbose and error-prone; `localforage` at 8KB is overkill for our key-value needs    |

## Constitution Re-Check (Post-Design)

_Re-evaluated after Phase 1 design decisions were finalized._

| Principle                     | Status            | Post-Design Assessment                                                                                                                                                                      |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Tether-First**           | ✅ PASS           | No changes. Sprite system is purely visual. Physics bodies unchanged (16px radius).                                                                                                         |
| **II. Swap-Ready Assets**     | ✅ PASS           | Design uses Phaser texture keys (`sprite.setTexture(key)`) per constitution mandate. No hardcoded image paths in gameplay code. Custom sprites load via the same `textures.addImage()` API. |
| **III. Co-op Parity**         | ✅ PASS           | Both players get identical customization capabilities. SpriteSlot for kitty and doggo are symmetric.                                                                                        |
| **IV. Humor-Driven**          | ✅ PASS           | Enables player-sourced humor via custom images. VFX (glow, fire, sparkles) add to comedic chaos. No visual polish delays gameplay — all VFX use built-in Phaser APIs with minimal code.     |
| **V. Incremental Milestones** | ✅ PASS           | Feature builds on completed Steps 1-4. Implementation follows 7-step incremental order (storage → store → textures → UI → progression → VFX → integration).                                 |
| **Tech Stack**                | ✅ PASS           | React overlays for customize UI. Phaser for in-game rendering. Zustand for state. TailwindCSS for styling. Single new dependency: `idb-keyval` (600B).                                      |
| **Asset Storage**             | ✅ PASS (revised) | Research resolved: images stored in IndexedDB (not filesystem). No `public/custom-sprites/` needed. Nothing to gitignore. Constitution compliant — no binary assets in source directories.  |
| **Performance**               | ✅ PASS           | Max ~50 custom textures at 128×128 RGBA = ~3.2MB VRAM. PostFX glow only on 2 player sprites. Particle emitters are one-shot bursts with auto-cleanup.                                       |

**Post-Design Gate Result**: PASS (all deviations resolved; no new violations)
