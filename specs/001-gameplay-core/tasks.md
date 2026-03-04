# Tasks: Gameplay Core

**Input**: Design documents from `/specs/001-gameplay-core/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/game-events.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, Vite + React + Phaser scaffold, and shared configuration

- [x] T001 Initialize Vite + React + TypeScript project with `npm create vite@latest` and install dependencies (phaser, zustand, tailwindcss, postcss, autoprefixer) in package.json
- [x] T002 Configure TailwindCSS with postcss.config.js, tailwind.config.js, and add Tailwind directives to src/index.css
- [x] T003 [P] Configure TypeScript strict mode and path aliases in tsconfig.json
- [x] T004 [P] Configure ESLint and Prettier for TypeScript + React in .eslintrc.cjs and .prettierrc
- [x] T005 Create Phaser game configuration with Matter.js physics, 1280×720 viewport, and fixed timestep in src/game/config.ts
- [x] T006 Create React entry point that mounts Phaser game into a ref container using useEffect with cleanup in src/main.tsx and src/App.tsx
- [x] T007 Create empty public/assets/ directory with a .gitkeep file for Phase 2 sprite assets
- [x] T008 Create Vite entry HTML with 1280×720 canvas container in src/index.html

**Checkpoint**: `npm run dev` launches a blank Phaser game inside a React shell at localhost:5173

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented — Zustand store, asset manifest, collision categories, scene skeleton, and entity base classes

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create Zustand game store with full GameStore interface (health, ammo, coins, level, timer, wave, gameState, selectedUpgrade) and all setter actions in src/game/state/gameStore.ts
- [x] T010 [P] Create AssetManifest with asset key → primitive renderer mapping (pink circle for Kitty, brown square for Doggo, red triangles for enemies, white line for tether, yellow circle for coins) in src/game/assets/AssetManifest.ts
- [x] T011 [P] Create collision category bitmask constants (PLAYER, ENEMY, PROJECTILE, COIN, BOUNDARY) and mask definitions in src/game/entities/CollisionCategories.ts
- [x] T012 Create BootScene that generates primitive graphic textures from AssetManifest and transitions to GameScene in src/game/scenes/BootScene.ts
- [x] T013 Create GameScene skeleton with create() and update() lifecycle, player instantiation hooks, and system registration pattern in src/game/scenes/GameScene.ts
- [x] T014 Create GameOverScene stub that stops game physics and displays game-over state via Zustand store in src/game/scenes/GameOverScene.ts
- [x] T015 [P] Create arena boundary walls (static Matter.js bodies at screen edges with BOUNDARY collision category) in GameScene.create()
- [x] T016 [P] Create base HUD React overlay component (health bar, ammo indicators, timer, coin count, wave number) reading from Zustand store selectors in src/ui/HUD.tsx
- [x] T017 [P] Create GameOverOverlay React stub component that renders when gameState === "game-over" in src/ui/GameOverOverlay.tsx. Note: humorous Vietnamese-flavored quotes (Constitution IV) are deferred to a separate polish feature

**Checkpoint**: Foundation ready — Phaser boots into GameScene with arena boundaries, Zustand store is active, HUD overlay renders placeholder values, BootScene generates primitive textures

---

## Phase 3: User Story 1 — Tethered Co-op Movement (Priority: P1) 🎯 MVP

**Goal**: Two players move independently with WASD/Arrows, connected by an elastic rope that stretches, pulls, and enforces a 300px max distance

**Independent Test**: Two testers press movement keys simultaneously; characters move, rope stretches, pull force is felt, max distance is enforced. No enemies required.

### Implementation for User Story 1

- [x] T018 [P] [US1] Create Player entity class with Matter.js body, role config (ranged/melee), movement speed, position clamping to arena, and primitive rendering via AssetManifest in src/game/entities/Player.ts
- [x] T019 [P] [US1] Create InputSystem that binds WASD keys to Kitty and Arrow keys to Doggo, applies velocity to Matter.js bodies, supports simultaneous multi-key input without conflicts in src/game/systems/InputSystem.ts
- [x] T020 [US1] Create Tether entity with Matter.js spring constraint (stiffness 0.02, damping 0.05, rest length 200px), per-frame hard clamp at max distance 300px, and Phaser Graphics line rendering in src/game/entities/Tether.ts
- [x] T021 [US1] Integrate Player (x2) and Tether into GameScene.create() — instantiate Kitty at (400, 360), Doggo at (880, 360), connect with Tether, register InputSystem in GameScene update loop in src/game/scenes/GameScene.ts
- [x] T022 [US1] Implement Tether visual rendering in GameScene.update() — clear and redraw Graphics line between player positions each frame, with color shift from white to red based on stretch ratio in src/game/entities/Tether.ts

**Checkpoint**: Two players move with WASD/Arrows, elastic rope stretches and contracts, max distance is enforced with bouncy pull. Playable toy — MVP milestone.

---

## Phase 4: User Story 2 — Enemy Spawning and Auto-Attack Combat (Priority: P2)

**Goal**: Enemies spawn from screen edges, seek the player midpoint, take damage from auto-attacks, drop coins on death, and deal contact damage with cooldowns

**Independent Test**: Start game, enemies spawn and walk toward players, auto-attacks fire, enemies die and drop coins, coins are collectible. Ammo is infinite for this story's test (deplete + auto-refill or use high max).

### Implementation for User Story 2

- [x] T023 [P] [US2] Create base Enemy entity class with Matter.js body, health, movement speed, contact damage, coin drop value, active/inactive pooling, per-player hit cooldown timestamps, and seek-toward-midpoint velocity in src/game/entities/Enemy.ts
- [x] T024 [P] [US2] Create EnemyBill subclass extending Enemy with type-specific stats (20 HP, speed 1.0, 5 contact damage, 1 coin) and red triangle primitive rendering in src/game/entities/EnemyBill.ts
- [x] T025 [P] [US2] Create Coin entity class with Matter.js sensor body, value attribute, active/inactive pooling, position clamping to 20px margin, and yellow circle primitive rendering in src/game/entities/Coin.ts
- [x] T026 [P] [US2] Create Projectile entity class with type config (ranged-shot / emotional-baggage), velocity, damage, lifetime, active/inactive pooling, and collision filtering in src/game/entities/Projectile.ts. Note: melee-swing is a virtual distance query in CombatSystem, not a pooled Projectile body
- [x] T027 [US2] Create SpawnSystem with weighted random perimeter point selection, minimum 120px distance from players, batch spawning, and active enemy cap of 50 in src/game/systems/SpawnSystem.ts
- [x] T028 [US2] Create CombatSystem with auto-attack logic — Kitty fires ranged projectile at nearest enemy within 250px every 1000ms, Doggo performs melee AoE within 60px every 800ms, ammo/stamina depletion per attack, and damage cooldown Map per enemy-per-player in src/game/systems/CombatSystem.ts
- [x] T029 [US2] Implement enemy-player contact damage collision handler — on Matter.js collision event between PLAYER and ENEMY categories, deal contactDamage to shared health with 1s per-player cooldown check, update Zustand store health in src/game/systems/CombatSystem.ts
- [x] T030 [US2] Implement enemy death and coin drop — when enemy health ≤ 0, deactivate enemy body (setStatic + mask=0), spawn Coin at position from pool, increment store coins on player-coin overlap in src/game/systems/CombatSystem.ts
- [x] T031 [US2] Implement ranged projectile collision — on PROJECTILE-ENEMY collision, filter by projectile.type: only 'ranged-shot' damages enemies, only 'emotional-baggage' applies slow to players. Deal damage to enemy, deactivate projectile, and handle enemy death chain in src/game/systems/CombatSystem.ts
- [x] T032 [US2] Integrate SpawnSystem and CombatSystem into GameScene — register in create(), call update() each frame, wire collision events via Matter.Events.on, start spawning after 5-second delay in src/game/scenes/GameScene.ts
- [x] T033 [US2] Wire ammo/stamina display to HUD — update Zustand store kittyAmmo and doggoStamina on each attack, show empty indicator when ammo/stamina reaches 0 in src/ui/HUD.tsx
- [x] T034 [US2] Implement game timer — increment elapsedTime in GameScene.update(), format as MM:SS, push to Zustand store, display in HUD in src/game/scenes/GameScene.ts

**Checkpoint**: Enemies spawn, seek players, take auto-attack damage, drop coins, coins are collectible. Players take contact damage with cooldowns. Timer runs. Core game loop works.

---

## Phase 5: User Story 3 — Clothesline Tether Attack (Priority: P3)

**Goal**: The rope line segment between players damages and knocks back enemies on contact, creating the signature "clothesline" mechanic

**Independent Test**: With tethered movement and enemies working, sweep the rope through a cluster of enemies — all touching enemies take heavy damage and get knocked back.

### Implementation for User Story 3

- [x] T035 [US3] Implement clothesline hit detection — per frame, iterate active enemies, compute point-to-segment distance from enemy center to rope line, if distance < threshold (enemy radius + rope width) and rope length > minActiveLength (50px), mark enemy as hit in src/game/systems/CombatSystem.ts
- [x] T036 [US3] Implement clothesline damage and knockback — for each hit enemy, deal Tether.clotheslineDamage (50), compute perpendicular knockback vector from rope, apply Matter.Body.applyForce with magnitude 8.0, trigger enemy death if health ≤ 0 in src/game/systems/CombatSystem.ts
- [x] T037 [US3] Add clothesline hit cooldown — prevent the same enemy from being hit by the rope more than once per 0.5 seconds using a per-enemy timestamp map, reset on enemy pool recycle in src/game/systems/CombatSystem.ts
- [x] T038 [US3] Add visual feedback for clothesline hits — 100ms white flash on hit enemies, rope thickness pulse on contact via Phaser Graphics lineStyle in src/game/entities/Tether.ts

**Checkpoint**: Rope sweeping through enemies deals heavy damage with knockback. Slack rope does not trigger clothesline. Signature mechanic works.

---

## Phase 6: User Story 4 — Love Reload Mechanic (Priority: P4)

**Goal**: Players collide to restore ammo/stamina and heal, with heart particle effects, creating the resource tension loop

**Independent Test**: Deplete ammo by auto-attacking, verify attacks stop, collide players, verify heart particles + ammo restore + small health heal.

### Implementation for User Story 4

- [x] T039 [US4] Create LoveReloadSystem — detect Player-Player collision via Matter.js collision events (both PLAYER category bodies), trigger reload logic on overlap, enforce 1-second cooldown between reloads in src/game/systems/LoveReloadSystem.ts
- [x] T040 [US4] Implement reload effects — on Love Reload trigger: set Kitty ammo to 10, Doggo stamina to 8, increase shared health by 5 (clamped to maxHealth 100), update all values in Zustand store in src/game/systems/LoveReloadSystem.ts
- [x] T041 [US4] Create particle emitter — on Love Reload, emit 8–12 pink circle particles (floating upward with fade) at collision midpoint using Phaser.GameObjects.Particles in src/game/systems/LoveReloadSystem.ts. Note: swap to heart-shaped sprites in Phase 2 asset pass
- [x] T042 [US4] Add empty weapon visual indicator — when Kitty ammo or Doggo stamina reaches 0, show pulsing outline or icon above the player's primitive graphic in src/game/entities/Player.ts
- [x] T043 [US4] Integrate LoveReloadSystem into GameScene — register in create(), wire Player-Player collision event, call update() in game loop in src/game/scenes/GameScene.ts

**Checkpoint**: Ammo/stamina depletes, attacks stop, players collide for Love Reload with heart particles, ammo refills, health heals. Full resource loop works.

---

## Phase 7: User Story 5 — Wave Progression and Boss Encounters (Priority: P5)

**Goal**: Waves escalate every 30 seconds with new enemy types and stats; Ex-Lover boss spawns at 2 minutes with slowing projectiles; game ends at health=0

**Independent Test**: Survive and observe wave transitions at 30s, new enemy type at 60s, boss at 2min with slowing projectiles, health=0 triggers game over.

### Implementation for User Story 5

- [x] T044 [P] [US5] Create EnemyDeadline subclass extending Enemy with type-specific stats (10 HP, speed 3.0, 8 contact damage, 2 coins) and orange triangle primitive rendering in src/game/entities/EnemyDeadline.ts
- [x] T045 [P] [US5] Create EnemyExLover subclass extending Enemy with boss stats (500 HP, speed 1.5, 15 contact damage, 10 coins), larger body, unique purple square primitive rendering, and 4-state FSM (SPAWN → CHASE → ATTACK → COOLDOWN) in src/game/entities/EnemyExLover.ts
- [x] T046 [US5] Implement Emotional Baggage projectile firing in EnemyExLover — during ATTACK state, fire 3 fan-spread projectiles toward pair midpoint at speed 4.0, projectiles apply isSlowed=true and slowExpiry=now+3000ms on Player hit in src/game/entities/EnemyExLover.ts
- [x] T047 [US5] Implement slow debuff on Player — when isSlowed is true, reduce effective movement speed by 50% in InputSystem velocity application, clear debuff when current time > slowExpiry in src/game/systems/InputSystem.ts and src/game/entities/Player.ts
- [x] T048 [US5] Create WaveSystem with 30-second wave timer, wave progression table (spawn interval 2000→400ms floor, batch size 2→6, enemy type composition per wave), wave number increment, and Zustand store updates in src/game/systems/WaveSystem.ts
- [x] T049 [US5] Integrate WaveSystem with SpawnSystem — WaveSystem drives spawn parameters (interval, batch size, enemy types), SpawnSystem uses current wave config for each spawn cycle, cap at 50 active enemies in src/game/systems/SpawnSystem.ts
- [x] T050 [US5] Implement boss spawn logic — at wave 5 (2min) and every 4th wave thereafter, spawn EnemyExLover from farthest screen edge, enforce max 1 active boss (defer if bossActive=true), set bossActive=false on boss death in src/game/systems/WaveSystem.ts
- [x] T051 [US5] Implement wave stat scaling — at spawn time, scale enemy health by √(waveNumber) and speed by (1 + 0.1 × log₂(waveNumber)), apply to base stats from data model in src/game/systems/SpawnSystem.ts
- [x] T052 [US5] Implement game over transition — when Zustand health reaches 0, call setGameState("game-over"), transition to GameOverScene, stop all physics and spawning in src/game/scenes/GameScene.ts
- [x] T053 [US5] Implement clothesline stun on boss — EnemyExLover enters STUNNED state (0.5s) when hit by clothesline, interrupting current CHASE/ATTACK action, then resumes FSM in src/game/entities/EnemyExLover.ts

**Checkpoint**: Waves escalate every 30s, Deadlines appear at wave 2, boss spawns at 2min with fan-spread slowing projectiles, slow debuff works, game over triggers at health=0.

---

## Phase 8: User Story 6 — Coin Leveling System (Priority: P6)

**Goal**: Coins accumulate toward level-up thresholds, game pauses for upgrade selection, chosen upgrade instantly applies to game stats

**Independent Test**: Kill enemies, collect coins, observe level-up pause at threshold, select upgrade, verify stat change in gameplay.

### Implementation for User Story 6

- [x] T054 [US6] Create LevelUpSystem — monitor Zustand coin count against nextLevelThreshold (formula: 10 × level), trigger level-up when threshold met, set gameState to "level-up", freeze all enemies (setStatic=true on active enemies), pause SpawnSystem and WaveSystem timers in src/game/systems/LevelUpSystem.ts
- [x] T055 [US6] Create LevelUpOverlay React component — render when gameState === "level-up", display three upgrade buttons (Tether Length, Damage, Speed) with descriptions, call setSelectedUpgrade on click, styled with TailwindCSS in src/ui/LevelUpOverlay.tsx
- [x] T056 [US6] Implement upgrade application in LevelUpSystem — poll selectedUpgrade in update(), when not null: apply upgrade effects (tether-length: maxDistance+50/restLength+33; damage: attackDamage+5/clotheslineDamage+15; speed: movementSpeed+0.5), increment level, compute new threshold, clear selectedUpgrade, set gameState to "playing", unfreeze enemies in src/game/systems/LevelUpSystem.ts
- [x] T057 [US6] Integrate LevelUpSystem into GameScene — register in create(), call update() in game loop, wire freeze/unfreeze to SpawnSystem and WaveSystem pause states in src/game/scenes/GameScene.ts
- [x] T058 [US6] Update HUD to display current level and coin progress bar toward next threshold in src/ui/HUD.tsx

**Checkpoint**: Coins accumulate, level-up pauses game with overlay, upgrade selection applies immediately, game resumes. Full progression loop works.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, edge case handling, asset swap verification, and quickstart validation

- [x] T059 [P] Implement enemy pool pre-allocation — create 50 inactive Enemy bodies and 20 inactive Projectile bodies at scene start instead of on-demand allocation in src/game/scenes/GameScene.ts
- [x] T060 [P] Implement coin pool pre-allocation — create 30 inactive Coin bodies at scene start in src/game/scenes/GameScene.ts
- [x] T061 Verify edge case: coins dropped near screen edge are nudged inward to 20px margin (already implemented in T025; this is a validation checkpoint)
- [x] T062 Verify edge case: enemy spawn minimum 120px distance from both players (already implemented in T027; this is a validation checkpoint)
- [x] T063 Verify edge case: boss spawn deferred when bossActive=true (already implemented in T050; this is a validation checkpoint)
- [x] T064 [P] Verify asset swap readiness — create a test AssetManifest variant that references placeholder PNGs in public/assets/, confirm zero gameplay code changes needed in src/game/assets/AssetManifest.ts
- [x] T065 Performance validation — profile game at 50 active enemies, verify ≥60 FPS, tune collision filters and object pool sizes if needed
- [x] T066 Run quickstart.md manual validation checklist — complete all 15 items in specs/001-gameplay-core/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — No dependencies on other stories
- **US2 (Phase 4)**: Depends on Phase 2 + Player entity from US1 (T018) — US2 entity tasks (T023-T026) can parallel with US1, but US2 systems (T027-T034) require Player to exist
- **US3 (Phase 5)**: Depends on US1 (tether) + US2 (enemies) — both must be complete
- **US4 (Phase 6)**: Depends on US1 (movement) + US2 (combat for ammo depletion)
- **US5 (Phase 7)**: Depends on US2 (spawning/combat) + US3 (clothesline for boss stun T053) + US4 (health depletion for game over)
- **US6 (Phase 8)**: Depends on US2 (coin drops) — can start once Phase 4 is done
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Phase 2 only — standalone MVP ✅
- **US2 (P2)**: Phase 2 + T018 from US1 (Player entity) — entity tasks parallelizable, systems blocked on Player
- **US3 (P3)**: US1 + US2 must be complete (needs tether + enemies)
- **US4 (P4)**: US1 + US2 must be complete (needs movement + ammo depletion)
- **US5 (P5)**: US2 + US3 + US4 must be complete (needs spawning + clothesline + health system)
- **US6 (P6)**: US2 must be complete (needs coin drops)

### Within Each User Story

- Entity classes before systems
- Systems before scene integration
- Core logic before visual feedback
- Store updates before UI rendering

### Parallel Opportunities

- T003, T004 can run in parallel (config files, no dependencies)
- T010, T011 can run in parallel with each other and with T009 (different files)
- T015, T016, T017 can run in parallel (arena walls, HUD, game over overlay)
- T018, T019 can run in parallel (Player entity vs InputSystem — different files)
- T023, T024, T025, T026 can all run in parallel (different entity files)
- T044, T045 can run in parallel (different enemy subclass files)
- US1 and US2 can proceed in parallel after Phase 2 (different entity/system files)
- US6 can start as soon as US2 is complete, in parallel with US3/US4/US5

---

## Parallel Example: User Story 2

```bash
# Launch all entity classes in parallel (different files, no dependencies):
Task T023: "Create base Enemy entity in src/game/entities/Enemy.ts"
Task T024: "Create EnemyBill in src/game/entities/EnemyBill.ts"
Task T025: "Create Coin entity in src/game/entities/Coin.ts"
Task T026: "Create Projectile entity in src/game/entities/Projectile.ts"

# Then systems (depend on entities):
Task T027: "Create SpawnSystem in src/game/systems/SpawnSystem.ts"
Task T028: "Create CombatSystem in src/game/systems/CombatSystem.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Tethered Co-op Movement
4. **STOP and VALIDATE**: Two players move with elastic rope — playable toy
5. Demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Tethered Movement) → Test independently → **Playable toy (MVP!)**
3. Add US2 (Enemies + Auto-Attack) → Test independently → **Core game loop**
4. Add US3 (Clothesline) → Test independently → **Signature mechanic**
5. Add US4 (Love Reload) → Test independently → **Resource tension loop**
6. Add US5 (Waves + Boss) → Test independently → **Full difficulty curve**
7. Add US6 (Coin Leveling) → Test independently → **Complete progression**
8. Polish phase → **Shippable build**
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Tethered Movement) → US3 (Clothesline, needs US1)
   - Developer B: US2 (Enemies + Combat) → US4 (Love Reload, needs US2) → US5 (Waves, needs US3+US4 — wait for Developer A's US3)
   - Developer C: Wait for US2 → US6 (Coin Leveling, needs US2)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No test tasks included — tests were not explicitly requested in spec. Test files listed in plan.md (Tether.test.ts, CombatSystem.test.ts, etc.) are deferred to a testing/polish feature. Ensure Vitest/Playwright are devDependencies only.
- Total: 66 tasks across 9 phases
