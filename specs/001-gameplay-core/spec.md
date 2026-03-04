# Feature Specification: Gameplay Core

**Feature Branch**: `001-gameplay-core`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "gameplay core"

## Clarifications

### Session 2026-02-15

- Q: How do enemies deal damage to the pair's shared health pool? → A: Contact hit + cooldown (~1 second invulnerability window after each hit, Survivors-style). Enemies deal one hit on touch, then cannot damage the same player again until the cooldown expires.
- Q: What is the starting/maximum shared health pool value? → A: 100 HP.
- Q: How much ammo/stamina does each player have per reload cycle? → A: Kitty has 10 ranged shots; Doggo has 8 melee swings.
- Q: Does the game pause during level-up selection? → A: Yes, brief pause — enemies freeze for ~3 seconds while the upgrade selection overlay is displayed. Prevents unfair deaths during co-op decision-making.
- Q: What are the viewport/arena dimensions? → A: 1280×720 pixels (standard 720p).

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Tethered Co-op Movement (Priority: P1)

Two players sit at the same keyboard. Player 1 controls the Kitty with WASD; Player 2 controls the Doggo with Arrow keys. Both characters appear on-screen connected by a visible elastic rope. When one player moves away, the other feels a pull. Neither player can move further than a fixed maximum distance from the other. The rope stretches and contracts with a springy, bouncy feel that produces comedic physics interactions.

**Why this priority**: Without tethered movement, no other mechanic (combat, reload, enemies) has meaning. The tether IS the game's identity per Constitution Principle I. This story alone produces a playable toy that two people can laugh at.

**Independent Test**: Two testers press movement keys simultaneously and observe: characters move, rope stretches, pull force is felt, max distance is enforced. No enemies or combat required.

**Acceptance Scenarios**:

1. **Given** the game has started with two players on screen, **When** Player 1 presses W, **Then** the Kitty moves upward and the rope visually stretches toward Player 2's position.
2. **Given** Player 1 is near the maximum tether distance from Player 2, **When** Player 1 continues moving away, **Then** the Kitty is prevented from exceeding the max distance and Player 2 (Doggo) is pulled toward Player 1 with visible inertia.
3. **Given** both players are moving in opposite directions, **When** the rope reaches full extension, **Then** both characters experience a visible elastic snap-back effect.
4. **Given** both players are stationary, **When** one player moves toward the other, **Then** the rope visually contracts and the characters can overlap or stand very close together.
5. **Given** Player 1 is pressing W and D simultaneously while Player 2 is pressing Left Arrow, **When** both inputs are processed in the same frame, **Then** both characters move according to their respective inputs without any input conflict or dropped keys.

---

### User Story 2 — Enemy Spawning and Auto-Attack Combat (Priority: P2)

Enemies representing "adult life pressures" spawn from the edges of the screen and move toward the midpoint between the two players. The Kitty automatically fires ranged attacks at the nearest enemy within range. The Doggo automatically performs melee attacks on the nearest enemy within close range. Destroyed enemies drop coins that players can collect by touching them.

**Why this priority**: Enemies and auto-attack create the survival pressure that gives the tether mechanic purpose. Without enemies, there is nothing to survive. This story transforms the toy (P1) into a game loop.

**Independent Test**: Start the game, verify enemies spawn from edges, walk toward players, take damage from auto-attacks, and drop coins on death. Health/ammo depletion can be ignored (infinite for this test).

**Acceptance Scenarios**:

1. **Given** the game is running, **When** 5 seconds have elapsed, **Then** "The Bill" enemies begin spawning from random positions along the screen edges.
2. **Given** enemies are on screen, **When** an enemy is within the Kitty's attack range, **Then** the Kitty automatically fires a ranged projectile toward that enemy without any player input.
3. **Given** enemies are on screen, **When** an enemy is within the Doggo's melee range, **Then** the Doggo automatically performs a melee strike on that enemy without any player input.
4. **Given** an enemy's health reaches zero from auto-attack damage, **When** the enemy is destroyed, **Then** it disappears and drops one or more coins at its position.
5. **Given** coins are on the ground, **When** either player's character moves over a coin, **Then** the coin is collected and the pair's shared coin count increases.
6. **Given** enemies are spawning, **When** 30 seconds elapse, **Then** the spawn rate and/or enemy composition shifts to increase difficulty (new wave). _(Validated when US5 wave system is complete.)_

---

### User Story 3 — Clothesline Tether Attack (Priority: P3)

The elastic rope connecting the two players is itself a weapon. When an enemy touches the line segment between the Kitty and the Doggo, that enemy takes heavy damage or is knocked back violently. Players can strategically run around groups of enemies to "clothesline" them with the rope.

**Why this priority**: The clothesline is the signature mechanic that differentiates this game from standard survivors. It turns the tether (a constraint) into a weapon, rewarding coordination. It depends on P1 (tether) and P2 (enemies) being functional.

**Independent Test**: With tether movement and enemy spawning working, two testers deliberately move so the rope sweeps through a cluster of enemies. Enemies touching the rope take visible damage or are knocked away.

**Acceptance Scenarios**:

1. **Given** two players are separated with rope stretched between them, **When** an enemy walks into the rope line, **Then** the enemy takes damage significantly higher than a single auto-attack hit.
2. **Given** the rope is in contact with an enemy, **When** the damage is applied, **Then** the enemy is visibly knocked back away from the rope with an exaggerated physics impulse.
3. **Given** a cluster of 5 enemies is between the two players, **When** the players run in a circular pattern so the rope sweeps through all 5, **Then** all 5 enemies are hit by the clothesline effect.
4. **Given** the two players are standing very close together (rope is slack), **When** an enemy passes near them, **Then** the enemy does NOT take rope damage because the rope segment is too short to meaningfully intersect.

---

### User Story 4 — Love Reload Mechanic (Priority: P4)

Weapons have limited ammo (Kitty's ranged shots) and stamina (Doggo's melee strikes). When a player's resource is depleted, they can no longer auto-attack. To reload ammo and restore a portion of health, both players must move their characters so they collide with each other (a "hug"). Upon collision, heart-shaped particle effects appear, ammo is fully restored, and a small amount of shared health is recovered.

**Why this priority**: The Love Reload mechanic is the resource management layer that forces players to periodically regroup, creating natural tension between spreading out (for clothesline coverage) and coming together (to reload). It depends on P1 (movement) and P2 (combat that drains ammo).

**Independent Test**: Start the game with enemies. Let both players deplete their ammo by auto-attacking. Verify attacks stop. Move both characters into each other. Verify heart particles appear, ammo refills, and health partially restores.

**Acceptance Scenarios**:

1. **Given** the Kitty has fired all available ranged shots, **When** no ammo remains, **Then** the Kitty stops auto-attacking and a visual indicator shows the weapon is empty.
2. **Given** the Doggo has exhausted melee stamina, **When** no stamina remains, **Then** the Doggo stops auto-attacking and a visual indicator shows stamina is depleted.
3. **Given** either player's ammo/stamina is depleted, **When** both characters collide (hitboxes overlap), **Then** heart particle effects burst from the collision point, both players' ammo/stamina is fully restored, and the pair's shared health increases by a small fixed amount (not exceeding maximum health).
4. **Given** both players have full ammo and full health, **When** the characters collide, **Then** heart particles still appear (for fun) but no gameplay values change beyond the visual feedback.
5. **Given** the pair's shared health is at maximum, **When** a Love Reload is triggered, **Then** ammo/stamina is restored but health does not exceed the maximum cap.

---

### User Story 5 — Wave Progression and Boss Encounters (Priority: P5)

An on-screen timer counts up from zero. Every 30 seconds, a new wave begins with increased difficulty: more enemies, faster enemies, or new enemy types. "The Deadline" (fast, low-health rushers) begin appearing after the first wave. Every 2 minutes, "The Ex-Lover" boss spawns with a special projectile attack that slows players. The game continues until the pair's cumulative health reaches zero.

**Why this priority**: Wave progression and boss encounters provide long-term engagement and escalating challenge. The core loop (P1–P4) can function with a flat difficulty, but waves and bosses give players a reason to keep surviving. This story depends on all previous stories.

**Independent Test**: Start the game and survive. Verify that after 30 seconds the spawning intensifies, after 60 seconds a new enemy type appears, and at 2 minutes a boss spawns with a slowing projectile. Verify that when health reaches zero, gameplay stops.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** 30 seconds elapse from game start, **Then** a new wave begins with a noticeably higher number of enemies spawning per cycle.
2. **Given** the first wave has ended, **When** the second wave begins, **Then** "The Deadline" enemy type (fast movement, low health) is added to the spawn pool alongside "The Bill."
3. **Given** the game timer reaches 2 minutes, **When** the boss spawn event triggers, **Then** "The Ex-Lover" boss appears from a screen edge with visually distinct presentation (larger, unique appearance).
4. **Given** The Ex-Lover is on screen, **When** the boss uses its special ability, **Then** it fires "Emotional Baggage" projectiles toward the midpoint of the two players that, on hit, reduce player movement speed for a short duration.
5. **Given** the pair's shared health is greater than zero, **When** an enemy deals damage to either player, **Then** the shared health decreases and is displayed on the HUD.
6. **Given** the pair's shared health reaches zero, **When** the last hit is dealt, **Then** gameplay immediately stops and transitions to the Game Over state.

---

### User Story 6 — Coin Leveling System (Priority: P6)

Coins collected from defeated enemies accumulate toward level-up thresholds. When enough coins are gathered, the pair levels up and receives a permanent upgrade for the remainder of the run. Upgrade options include increased tether max distance, increased auto-attack damage, or increased movement speed. The choice of upgrade is applied immediately.

**Why this priority**: Leveling provides progression within a single run and rewards players for surviving longer. It is the final piece of the core loop but the game is playable without it (flat stats). Depends on P2 (coin drops) being functional.

**Independent Test**: Kill enemies, collect coins, observe a level-up prompt when the threshold is reached, select an upgrade, and verify the stat change is reflected in gameplay.

**Acceptance Scenarios**:

1. **Given** the pair has collected enough coins to reach the next level threshold, **When** the threshold is met, **Then** the game briefly pauses or overlays a level-up selection with available upgrade options.
2. **Given** the level-up selection is displayed, **When** the players choose "increase tether max distance," **Then** the maximum rope length increases and the change is immediately observable in gameplay.
3. **Given** the level-up selection is displayed, **When** the players choose "increase damage," **Then** both the Kitty's ranged damage and the Doggo's melee damage increase for the remainder of the run.
4. **Given** the level-up selection is displayed, **When** the players choose "increase movement speed," **Then** both characters move faster and the change is immediately noticeable.
5. **Given** the pair has leveled up multiple times, **When** another level-up occurs, **Then** the coin cost to reach the next level is higher than the previous threshold (scaling difficulty).

---

### Edge Cases

- What happens when both players press toward each other and overlap completely? The tether should go slack (zero tension), characters sit on top of each other, and Love Reload triggers if applicable.
- What happens when an enemy spawns directly on top of a player? The enemy should immediately begin dealing contact damage; it should not spawn inside the player's hitbox in a way that is un-dodgeable (minimum spawn distance from players).
- What happens when a boss is alive and a new 2-minute cycle triggers? Only one Ex-Lover boss should be active at a time; the new boss spawn is deferred until the current boss is defeated.
- What happens when both players run to the same screen corner? Enemies should still be able to reach them; no "safe corner" exploit. Enemies spawn from all edges and track the midpoint.
- What happens when the clothesline rope passes through a boss? The boss takes clothesline damage like any other enemy, but given its higher health pool, it is knocked back rather than killed instantly.
- What happens when a player is slowed by Emotional Baggage and attempts a Love Reload? The slow effect does not prevent collision; the Love Reload still triggers, but the slow debuff remains until its duration expires.
- What happens if coins are dropped off-screen or at the very edge? Coins should be nudged inward so they are always reachable within the playable area.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The game MUST support two simultaneous players on a single keyboard — Player 1 (Kitty) using WASD and Player 2 (Doggo) using Arrow keys — with no input conflicts.
- **FR-002**: The two player characters MUST be connected by a visible elastic rope with a spring-like physics constraint and a maximum distance of 300px.
- **FR-003**: When one player moves beyond the rope's resting length, the other player MUST be pulled with visible inertia proportional to the stretch distance.
- **FR-004**: Enemies MUST spawn continuously from random positions along screen edges and navigate toward the midpoint between the two players.
- **FR-005**: Three enemy types MUST exist: "The Bill" (slow swarm), "The Deadline" (fast rusher), and "The Ex-Lover" (boss with projectile attack).
- **FR-006**: Each player character MUST automatically attack the nearest enemy within their role's range — ranged for Kitty, melee for Doggo — without requiring player input.
- **FR-007**: When an enemy makes contact with the rope line segment between the two players, the enemy MUST take heavy damage and be knocked back (the "Clothesline" attack).
- **FR-008**: Both players MUST have limited attack resources (ammo for Kitty, stamina for Doggo) that deplete with each auto-attack.
- **FR-009**: Attack resources and a small amount of health MUST be restored when both player characters collide with each other (the "Love Reload"), accompanied by heart particle effects.
- **FR-010**: The game MUST track a single shared health pool for the pair that decreases when either player takes enemy damage.
- **FR-011**: The game MUST end when the shared health pool reaches zero.
- **FR-012**: A wave system MUST increase difficulty every 30 seconds by adjusting enemy spawn rate, enemy types, or enemy stats.
- **FR-013**: "The Ex-Lover" boss MUST spawn every 2 minutes and fire "Emotional Baggage" projectiles that temporarily slow player movement on hit.
- **FR-014**: Destroyed enemies MUST drop coins that can be collected by either player walking over them.
- **FR-015**: Accumulated coins MUST trigger a level-up at defined thresholds, offering the pair a choice of permanent run-duration upgrades (tether length, damage, or movement speed).
- **FR-016**: An on-screen timer MUST count up from zero, displaying the current survival time.
- **FR-017**: All game entities MUST be rendered using geometric primitives (Phase 1) with a configuration layer that allows swapping to sprite assets (Phase 2) without changing gameplay code.
- **FR-018**: Only one Ex-Lover boss MUST be active at any time; additional boss spawn events MUST be deferred until the current boss is defeated.
- **FR-019**: Enemies MUST deal damage via contact hit with a cooldown — one damage instance on first touch, then a ~1 second invulnerability window before the same enemy can damage the same player again.
- **FR-020**: The game viewport MUST be 1280×720 pixels with no scrolling or camera movement; all gameplay occurs within this fixed arena.
- **FR-021**: When a level-up threshold is reached, the game MUST briefly pause (freeze all enemy movement and spawning for ~3 seconds) while displaying the upgrade selection overlay.

### Key Entities

- **Player**: Represents one of the two co-op characters (Kitty or Doggo). Attributes: position, role (ranged/melee), current ammo or stamina (Kitty: 10 shots, Doggo: 8 swings), movement speed, attack range, attack damage. Belongs to exactly one Pair.
- **Pair**: The unit of the two players together. Attributes: shared health (current/max, starting at 100 HP), shared coin count, current level, active upgrades. Owns the Tether.
- **Tether**: The elastic rope connecting the two players. Attributes: current length, max distance (300 units, upgradeable), spring stiffness, damage dealt on enemy contact. Always exists between the two Players.
- **Enemy**: A hostile entity targeting the pair. Attributes: type (Bill/Deadline/Ex-Lover), health, movement speed, damage dealt on contact (with ~1s per-player hit cooldown), special abilities (projectile for Ex-Lover). Drops Coins on death.
- **Coin**: A collectible dropped by defeated enemies. Attributes: value (may vary by enemy type), position. Collected on contact with either Player.
- **Wave**: A difficulty tier in the progression system. Attributes: wave number, time threshold (every 30s), enemy spawn rate, enemy type composition, enemy stat multipliers.
- **Projectile**: An attack object. Sub-types: Kitty's ranged shot (targets nearest enemy), Doggo's melee swing (area around Doggo), Ex-Lover's "Emotional Baggage" (targets pair midpoint, applies slow debuff on hit).

## Assumptions

- The game viewport is a fixed 1280×720 pixel arena (no scrolling or camera movement); all gameplay occurs within this visible area.
- The tether max distance is 300px within the fixed 1280×720 arena (1:1 pixel mapping).
- Auto-attack fires at a fixed cadence (e.g., one shot per second for Kitty, one swing per 0.8 seconds for Doggo); exact rates are tuning values, not specification-level decisions.
- Kitty starts each reload cycle with 10 ranged shots; Doggo starts with 8 melee swings. These deplete one-per-attack and are fully restored on Love Reload.
- Shared health starts at 100 HP (also the maximum). Love Reload restores a small fixed amount (tunable, e.g., 5 HP).
- Enemies deal contact damage with a ~1 second per-player hit cooldown, preventing instant-melt from overlapping swarms.
- The "slow" debuff from Emotional Baggage reduces movement speed by approximately 50% for 3 seconds; exact values are tunable.
- Coin thresholds for leveling scale linearly or by a simple multiplier (e.g., 10 coins for level 2, 20 for level 3, etc.); the exact formula is a tuning decision.
- Enemy spawn positions are randomized along screen edges with a minimum distance from both players to avoid unfair instant-damage spawns.
- When a level-up threshold is reached, the game briefly pauses (enemies freeze for ~3 seconds) while the upgrade selection overlay is displayed, preventing unfair deaths during co-op decision-making.
- Sound effects and music are out of scope for this feature (covered in a polish/Step 5 feature).
- Start screen, Game Over screen, and HUD presentation are out of scope for this feature; they will be specified separately. This feature focuses on the in-game mechanics only.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Two players can independently control their characters using WASD and Arrow keys simultaneously, with zero dropped inputs, for a continuous 5-minute session.
- **SC-002**: The elastic tether visually stretches and contracts in real time; when one player pulls away, the other is dragged within 0.2 seconds of the rope reaching max distance.
- **SC-003**: The Clothesline attack successfully damages all enemies that intersect the rope line during a sweep, with 100% hit detection accuracy for enemies crossing the rope.
- **SC-004**: Players can deplete their ammo/stamina, perform a Love Reload by colliding, and resume auto-attacking — the full reload cycle completes in under 2 seconds of player collision.
- **SC-005**: The game sustains 60 frames per second with up to 50 simultaneous on-screen enemies on a mid-range laptop.
- **SC-006**: Wave difficulty perceptibly increases every 30 seconds, with players reporting that the game "feels harder" after each wave transition.
- **SC-007**: The Ex-Lover boss spawns at the 2-minute mark, fires slowing projectiles that visibly reduce player speed, and requires coordinated effort (clothesline + auto-attacks) to defeat.
- **SC-008**: A pair of testers can complete a full gameplay session (start → survive waves → die → see Game Over state) in a single uninterrupted run with no crashes or soft-locks.
- **SC-009**: Swapping geometric primitives for sprite images requires changing only asset configuration — zero modifications to movement, physics, combat, or enemy behavior code.
