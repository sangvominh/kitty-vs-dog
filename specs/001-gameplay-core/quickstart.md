# Quickstart: Gameplay Core

**Feature**: `001-gameplay-core` | **Date**: 2026-02-15

---

## Prerequisites

- Node.js 18+ and npm 9+
- A modern browser (Chrome or Firefox latest stable)
- Git (for branch management)

## Setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd KT-kitty-vs-MSmini
git checkout 001-gameplay-core

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The game opens at `http://localhost:5173` in a 1280×720 viewport.

## Controls

| Player   | Character            | Keys       | Role                                     |
| -------- | -------------------- | ---------- | ---------------------------------------- |
| Player 1 | Kitty (Pink Circle)  | W/A/S/D    | Ranged DPS — auto-fires at nearest enemy |
| Player 2 | Doggo (Brown Square) | Arrow keys | Melee — auto-swings at nearest enemy     |

**Love Reload**: Move both characters into each other (overlap) to restore ammo/stamina and heal.

## How to Play

1. Both players move using their respective keys
2. Characters auto-attack enemies within range — no button press needed
3. Watch the elastic rope between you — it stretches and pulls!
4. Sweep the rope through enemies to "clothesline" them (heavy damage + knockback)
5. When ammo/stamina runs out (visual indicator), run back to each other for a Love Reload
6. Collect coins from defeated enemies to level up and choose upgrades
7. Survive as long as you can — waves get harder every 30 seconds
8. A boss ("The Ex-Lover") spawns every 2 minutes — dodge the Emotional Baggage projectiles!
9. Game ends when the shared health bar hits zero

## Project Structure Overview

```text
src/
├── main.tsx                     # React entry point
├── App.tsx                      # React shell + Zustand provider
├── game/
│   ├── config.ts                # Phaser config (1280×720, Matter.js)
│   ├── scenes/
│   │   ├── BootScene.ts         # Asset loading
│   │   ├── GameScene.ts         # Main gameplay loop
│   │   └── GameOverScene.ts     # End state
│   ├── entities/                # Player, Tether, Enemy*, Projectile, Coin
│   ├── systems/                 # Input, Combat, Wave, LoveReload, LevelUp, Spawn
│   ├── assets/AssetManifest.ts  # Asset keys (primitives ↔ sprites)
│   └── state/gameStore.ts       # Zustand store
├── ui/                          # React overlays (HUD, LevelUp, GameOver)
└── index.html
```

## Key Architecture Decisions

| Decision              | Detail                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physics engine        | Matter.js via Phaser's Matter plugin — elastic spring constraint for the tether                                                                     |
| Tether enforcement    | Soft spring (rest length 200px) + hard clamp at 300px per frame                                                                                     |
| Clothesline detection | Manual point-to-segment distance check per enemy per frame                                                                                          |
| State bridge          | Phaser mutates Zustand store directly; React reads via selectors                                                                                    |
| Asset swap            | All entities reference asset keys from `AssetManifest.ts` — swap primitives for sprites by updating the manifest + adding PNGs to `/public/assets/` |
| Enemy pooling         | Pre-allocated Matter.js bodies; deactivated enemies go `setStatic(true)` + mask=0                                                                   |

## Build & Validate

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build for production
npm run build

# Run tests
npm test
```

## Validation Checklist (Manual Playtest)

- [ ] Both players move independently with WASD / Arrows (no input conflicts)
- [ ] Rope stretches visually; players cannot exceed max distance
- [ ] Pulling player drags the other with bouncy inertia
- [ ] Enemies spawn from edges and move toward midpoint
- [ ] Auto-attacks fire without player input at correct range
- [ ] Clothesline damages enemies crossing the rope
- [ ] Ammo/stamina depletes; attack stops at zero
- [ ] Love Reload restores ammo + small health on player collision
- [ ] Heart particles appear on Love Reload
- [ ] Waves increase difficulty every 30 seconds
- [ ] Ex-Lover boss spawns at 2 minutes with slowing projectiles
- [ ] Coins drop on enemy death and are collectible
- [ ] Level-up pauses game, shows upgrade choices, applies selection
- [ ] Game Over triggers when health reaches zero
- [ ] Runs at 60 FPS with 50+ enemies on screen
