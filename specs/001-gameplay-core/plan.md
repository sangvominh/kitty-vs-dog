# Implementation Plan: Gameplay Core

**Branch**: `001-gameplay-core` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-gameplay-core/spec.md`

## Summary

Implement the core gameplay loop for "Tethered Love: The Deadline Survivors" — a local co-op top-down survival roguelike where two players (Kitty and Doggo) are physically tied by an elastic rope. The feature covers: tethered movement with Matter.js spring constraints, dual-player WASD/Arrow input, auto-attack combat for ranged (Kitty) and melee (Doggo) roles, the "Clothesline" rope-as-weapon mechanic, the "Love Reload" collision-based ammo/health restore, enemy spawning with three types (Bill, Deadline, Ex-Lover boss), wave progression scaling every 30 seconds, coin collection with level-up upgrades, and a shared health pool driving game-over state.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+ (Vite bundler), Phaser 3.80+, Matter.js (via `phaser-matter`), Zustand (state bridge to React UI), TailwindCSS 3+
**Storage**: N/A (no persistence — single-session roguelike)
**Testing**: Vitest (unit), Playwright (integration/E2E for browser validation)
**Target Platform**: Web — latest stable Chrome and Firefox, 1280×720 viewport
**Project Type**: Single project (Phaser game embedded in React shell)
**Performance Goals**: 60 FPS with ≤50 simultaneous on-screen enemies on mid-range laptop (integrated GPU, 8 GB RAM)
**Constraints**: No scrolling/camera, fixed 1280×720 arena, all assets in `/public/assets/`, geometric primitives for Phase 1
**Scale/Scope**: 2 players, 3 enemy types, 1 boss, 3 upgrade paths, ~10-minute average session length

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle              | Status  | Notes                                                                                                                                             |
| --- | ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Tether-First Design    | ✅ PASS | Tether is the central mechanic (P1); clothesline (P3) and Love Reload (P4) derive from it. Every user story integrates with the rope constraint.  |
| II  | Swap-Ready Assets      | ✅ PASS | FR-017 mandates a configuration layer for asset keys; Phase 1 uses primitives, Phase 2 swaps sprites with zero gameplay code changes.             |
| III | Co-op Parity           | ✅ PASS | FR-001 defines WASD/Arrow dual input; roles are distinct (ranged vs melee); Love Reload enforces mutual dependence.                               |
| IV  | Humor-Driven Design    | ✅ PASS | Enemy themes (Bills, Deadlines, Ex-Lover with Emotional Baggage), exaggerated knockback physics, and heart particle effects are all humor-driven. |
| V   | Incremental Milestones | ✅ PASS | User stories P1→P6 map directly to Steps 2–4 of the milestone plan; each is independently testable and produces a playable build.                 |
| —   | Tech Stack             | ✅ PASS | React/Vite + TS, Phaser 3, Matter.js, Zustand, TailwindCSS all match constitution requirements.                                                   |
| —   | Performance            | ✅ PASS | 60 FPS @ 50 enemies target is specified in SC-005 and matches constitution constraint.                                                            |

**Gate result: ALL PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-gameplay-core/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── game-events.md   # Event-driven contract (no REST API)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── main.tsx                    # React entry point, mounts Phaser + UI
├── App.tsx                     # React shell with Zustand provider
├── game/
│   ├── config.ts               # Phaser game configuration (1280×720, Matter.js)
│   ├── scenes/
│   │   ├── BootScene.ts        # Asset loading (primitive graphics + future sprites)
│   │   ├── GameScene.ts        # Main gameplay scene (update loop, spawning, collisions)
│   │   └── GameOverScene.ts    # Transition target on health=0
│   ├── entities/
│   │   ├── CollisionCategories.ts # Bitmask constants (PLAYER, ENEMY, PROJECTILE, COIN, BOUNDARY)
│   │   ├── Player.ts           # Player class (Kitty/Doggo with role config)
│   │   ├── Tether.ts           # Matter.js spring constraint + clothesline collision
│   │   ├── Enemy.ts            # Base enemy class
│   │   ├── EnemyBill.ts        # "The Bill" slow swarm type
│   │   ├── EnemyDeadline.ts    # "The Deadline" fast rusher type
│   │   ├── EnemyExLover.ts     # "The Ex-Lover" boss type
│   │   ├── Projectile.ts       # Ranged shot + Emotional Baggage projectile
│   │   └── Coin.ts             # Collectible coin entity
│   ├── systems/
│   │   ├── InputSystem.ts      # WASD + Arrow key binding (no conflicts)
│   │   ├── CombatSystem.ts     # Auto-attack logic, damage cooldowns, clothesline detection
│   │   ├── WaveSystem.ts       # 30s wave timer, enemy composition, difficulty scaling
│   │   ├── LoveReloadSystem.ts # Player collision detection, ammo restore, health heal, particles
│   │   ├── LevelUpSystem.ts    # Coin thresholds, pause, upgrade selection, stat application
│   │   └── SpawnSystem.ts      # Edge-of-screen spawn logic, min-distance enforcement
│   ├── assets/
│   │   └── AssetManifest.ts    # Asset key → primitive/sprite mapping (Principle II)
│   └── state/
│       └── gameStore.ts        # Zustand store: health, coins, level, ammo, timer, wave
├── ui/
│   ├── HUD.tsx                 # React overlay: health bar, ammo, timer, coins, wave
│   ├── LevelUpOverlay.tsx      # React overlay: upgrade selection during pause
│   └── GameOverOverlay.tsx     # React overlay: death screen (out-of-scope content, stub)
└── index.html                  # Vite entry HTML

public/
└── assets/                     # Phase 2 sprite PNGs (empty in Phase 1)

tests/
├── unit/
│   ├── Tether.test.ts          # Spring constraint math, max distance enforcement
│   ├── CombatSystem.test.ts    # Auto-attack targeting, damage cooldown, clothesline
│   ├── WaveSystem.test.ts      # Wave timing, composition scaling
│   └── LevelUpSystem.test.ts   # Coin thresholds, stat application
└── integration/
    └── gameplay.test.ts        # Full loop: move → attack → reload → wave → boss → die
```

**Structure Decision**: Single project. Phaser 3 runs inside a React shell via a `useEffect` mount pattern. Game state flows from Phaser → Zustand store → React UI overlays. No backend, no separate frontend package. TailwindCSS styles all React components.

## Complexity Tracking

> No constitution violations detected. No complexity justifications required.

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
