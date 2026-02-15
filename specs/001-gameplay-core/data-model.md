# Data Model: Gameplay Core

**Feature**: `001-gameplay-core` | **Date**: 2026-02-15
**Source**: [spec.md](spec.md) Key Entities + [research.md](research.md) technical decisions

---

## Entity Relationship Diagram

```text
┌──────────┐       owns        ┌──────────┐       connects      ┌──────────┐
│  Player  │◄─────────────────►│   Pair   │◄────────────────────►│  Tether  │
│ (Kitty)  │  belongs to (1:1) │          │   owns (1:1)         │          │
└────┬─────┘                   └────┬─────┘                      └────┬─────┘
     │                              │                                  │
     │ fires/swings                 │ tracks                           │ damages on contact
     ▼                              ▼                                  ▼
┌──────────┐                  ┌──────────┐                       ┌──────────┐
│Projectile│                  │  Coin    │◄── dropped by ──────►│  Enemy   │
└──────────┘                  └──────────┘                       └────┬─────┘
                                                                      │
                                                                 ┌────┴─────┐
                                                                 │   Wave   │
                                                                 │ (spawner)│
                                                                 └──────────┘
```

---

## Entities

### Player

Represents one of the two co-op characters.

| Field          | Type                       | Constraints                      | Notes                                               |
| -------------- | -------------------------- | -------------------------------- | --------------------------------------------------- |
| id             | `"kitty" \| "doggo"`       | Required, unique                 | Also used as asset key prefix                       |
| position       | `{ x: number, y: number }` | Within 0–1280, 0–720             | Matter.js body position                             |
| role           | `"ranged" \| "melee"`      | Kitty=ranged, Doggo=melee        | Determines attack behavior                          |
| ammo           | `number`                   | 0–maxAmmo                        | Kitty: 10 shots, Doggo: 8 swings                    |
| maxAmmo        | `number`                   | Kitty: 10, Doggo: 8              | Restored fully on Love Reload                       |
| movementSpeed  | `number`                   | Default: 3.0                     | Upgradeable via LevelUp; reduced 50% by slow debuff |
| attackRange    | `number`                   | Kitty: 250px, Doggo: 60px        | Radius for auto-attack target search                |
| attackDamage   | `number`                   | Default: 10 (ranged), 15 (melee) | Upgradeable via LevelUp                             |
| attackCooldown | `number` (ms)              | Kitty: 1000, Doggo: 800          | Time between auto-attacks                           |
| lastAttackTime | `number` (ms)              | ≥0                               | Timestamp of last attack fire                       |
| isSlowed       | `boolean`                  | Default: false                   | Set true by Emotional Baggage hit                   |
| slowExpiry     | `number` (ms)              | 0 if not slowed                  | Timestamp when slow wears off                       |

**State transitions**:

- `ammo > 0` → can auto-attack → fires/swings on cooldown
- `ammo === 0` → cannot attack → visual "empty" indicator active
- Love Reload → `ammo = maxAmmo`
- Emotional Baggage hit → `isSlowed = true`, `slowExpiry = now + 3000`

---

### Pair

The unit of two players as a team. Singleton per game session.

| Field              | Type        | Constraints              | Notes                                  |
| ------------------ | ----------- | ------------------------ | -------------------------------------- |
| health             | `number`    | 0–maxHealth              | Shared pool, both players draw from it |
| maxHealth          | `number`    | Default: 100             | Not upgradeable (per spec)             |
| coins              | `number`    | ≥0                       | Accumulated from enemy drops           |
| level              | `number`    | ≥1                       | Current pair level                     |
| nextLevelThreshold | `number`    | Scales per level         | Coins needed for next level-up         |
| activeUpgrades     | `Upgrade[]` | Accumulates per level-up | Applied stats persist for run duration |

**Validation rules**:

- `health` clamped to `[0, maxHealth]` — Love Reload cannot exceed max
- `coins` only increases (no spending mechanic beyond level-up auto-consume)
- `level` starts at 1; increments by 1 per threshold reached
- `nextLevelThreshold` formula: `10 * level` (level 2 costs 10, level 3 costs 20, etc.)

**State transitions**:

- Enemy contact → `health -= enemy.contactDamage` (with cooldown per FR-019)
- Love Reload → `health = min(health + 5, maxHealth)`
- Coin collected → `coins += coin.value`; if `coins >= nextLevelThreshold` → level-up
- `health <= 0` → Game Over

---

### Tether

The elastic rope connecting the two players. Singleton per game session.

| Field                | Type          | Constraints               | Notes                                          |
| -------------------- | ------------- | ------------------------- | ---------------------------------------------- |
| restLength           | `number` (px) | Default: 200              | Spring starts pulling at this distance         |
| maxDistance          | `number` (px) | Default: 300, upgradeable | Hard clamp — never exceeded                    |
| stiffness            | `number`      | Default: 0.02             | Matter.js constraint stiffness                 |
| damping              | `number`      | Default: 0.05             | Matter.js constraint damping                   |
| clotheslineDamage    | `number`      | Default: 50               | Damage to enemy on rope contact                |
| clotheslineKnockback | `number`      | Default: 8.0              | Impulse magnitude for knockback                |
| minActiveLength      | `number` (px) | Default: 50               | Rope shorter than this = slack, no clothesline |

**Validation rules**:

- `maxDistance >= restLength` always
- Clothesline only active when current distance between players > `minActiveLength`
- Post-physics hard clamp at `maxDistance` every frame (hybrid approach from research)

**State transitions**:

- Level-up "increase tether distance" → `maxDistance += 50`, `restLength += 33`

---

### Enemy

A hostile entity. Multiple instances active simultaneously (pool of up to 50).

| Field             | Type                                 | Constraints          | Notes                                   |
| ----------------- | ------------------------------------ | -------------------- | --------------------------------------- |
| id                | `number`                             | Unique per spawn     | Auto-incrementing pool index            |
| type              | `"bill" \| "deadline" \| "ex-lover"` | Required             | Determines stats + behavior             |
| health            | `number`                             | >0 while alive       | Varies by type and wave scaling         |
| maxHealth         | `number`                             | Set at spawn         | Base × wave multiplier                  |
| movementSpeed     | `number`                             | Varies by type       | Bill: 1.0, Deadline: 3.0, Ex-Lover: 1.5 |
| contactDamage     | `number`                             | Varies by type       | Bill: 5, Deadline: 8, Ex-Lover: 15      |
| coinDropValue     | `number`                             | Varies by type       | Bill: 1, Deadline: 2, Ex-Lover: 10      |
| active            | `boolean`                            | Pool management      | false = returned to pool                |
| lastHitTimestamps | `Map<PlayerId, number>`              | Per-player cooldowns | Prevents damage spam per FR-019         |

**Per-type stats (base, wave 1)**:

| Type     | Health | Speed | Contact Damage | Coin Drop |
| -------- | ------ | ----- | -------------- | --------- |
| Bill     | 20     | 1.0   | 5              | 1         |
| Deadline | 10     | 3.0   | 8              | 2         |
| Ex-Lover | 500    | 1.5   | 15             | 10        |

**Wave scaling** (applied at spawn):

- Health: `base × √(waveNumber)`
- Speed: `base × (1 + 0.1 × log₂(waveNumber))`
- Contact damage: unchanged (pressure from volume, not per-hit)

**State transitions (Ex-Lover boss FSM)**:

- `SPAWN` → `CHASE` → `ATTACK` (fires 3 fan-spread projectiles) → `COOLDOWN` (2s) → `CHASE`
- Clothesline hit → brief `STUNNED` state (0.5s) interrupts current action

---

### Coin

A collectible dropped by defeated enemies.

| Field    | Type                       | Constraints          | Notes                               |
| -------- | -------------------------- | -------------------- | ----------------------------------- |
| position | `{ x: number, y: number }` | Within playable area | Nudged inward if near edge          |
| value    | `number`                   | ≥1                   | Set by enemy type's `coinDropValue` |
| active   | `boolean`                  | Pool management      | false = collected or expired        |

**Validation rules**:

- Position clamped to `[20, 1260] × [20, 700]` (20px margin from edges)
- Collected on overlap with either Player body

---

### Wave

Manages the difficulty progression timeline.

| Field         | Type          | Constraints | Notes                                         |
| ------------- | ------------- | ----------- | --------------------------------------------- |
| number        | `number`      | ≥1          | Increments every 30s                          |
| elapsedTime   | `number` (ms) | ≥0          | Game clock since start                        |
| spawnInterval | `number` (ms) | 400–2000    | Decreases each wave                           |
| batchSize     | `number`      | 2–6         | Enemies per spawn event                       |
| enemyTypes    | `EnemyType[]` | Accumulates | Wave 1: [Bill], Wave 2+: [Bill, Deadline]     |
| bossActive    | `boolean`     | Max 1 boss  | Defers next boss spawn until current defeated |
| activeCap     | `number`      | Default: 50 | Max simultaneous enemies                      |

**Wave progression table**:

| Wave | Time  | Spawn Interval | Batch Size | Enemy Types    | Boss?              |
| ---- | ----- | -------------- | ---------- | -------------- | ------------------ |
| 1    | 0:00  | 2000ms         | 2          | Bill           | No                 |
| 2    | 0:30  | 1600ms         | 3          | Bill, Deadline | No                 |
| 3    | 1:00  | 1200ms         | 3          | Bill, Deadline | No                 |
| 4    | 1:30  | 1000ms         | 4          | Bill, Deadline | No                 |
| 5    | 2:00  | 800ms          | 4          | Bill, Deadline | **Yes (Ex-Lover)** |
| 6    | 2:30  | 700ms          | 5          | Bill, Deadline | No                 |
| 7    | 3:00  | 600ms          | 5          | Bill, Deadline | No                 |
| 8    | 3:30  | 500ms          | 6          | Bill, Deadline | No                 |
| 9+   | 4:00+ | 400ms (floor)  | 6          | Bill, Deadline | Every 4th wave     |

---

### Projectile

An attack object with multiple sub-types.

| Field    | Type                                                    | Constraints              | Notes                                                       |
| -------- | ------------------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| type     | `"ranged-shot" \| "melee-swing" \| "emotional-baggage"` | Required                 | Determines behavior                                         |
| position | `{ x: number, y: number }`                              | Game world coords        | Matter.js body or manual                                    |
| velocity | `{ x: number, y: number }`                              | Direction + speed        | Ranged: toward target enemy; Baggage: toward midpoint       |
| damage   | `number`                                                | ≥0                       | Ranged: Player.attackDamage; Baggage: 0 (applies slow only) |
| active   | `boolean`                                               | Pool management          | false = returned to pool                                    |
| owner    | `PlayerId \| "ex-lover"`                                | Source of the projectile | For collision filtering                                     |

**Sub-type details**:

| Sub-type          | Speed | Range/Lifetime       | Behavior                                                  |
| ----------------- | ----- | -------------------- | --------------------------------------------------------- |
| ranged-shot       | 6.0   | 300px or first hit   | Fires toward nearest enemy, destroyed on hit              |
| melee-swing       | N/A   | Instant, 60px radius | **Virtual** — distance query in CombatSystem, no Matter.js body. Damages all enemies within radius of Doggo. |
| emotional-baggage | 4.0   | Screen-wide          | Fires toward pair midpoint, applies 3s slow on player hit |

---

### Upgrade

Represents a level-up choice. Not a persistent entity — applied immediately to Pair/Player/Tether stats.

| Field | Type                                     | Notes                           |
| ----- | ---------------------------------------- | ------------------------------- |
| type  | `"tether-length" \| "damage" \| "speed"` | One of 3 options                |
| label | `string`                                 | Display text for UI overlay     |
| apply | `(state) => void`                        | Mutates game state on selection |

**Upgrade effects**:

| Type          | Effect per level                                                    |
| ------------- | ------------------------------------------------------------------- |
| tether-length | `Tether.maxDistance += 50`, `Tether.restLength += 33`               |
| damage        | Both players: `attackDamage += 5`, `Tether.clotheslineDamage += 15` |
| speed         | Both players: `movementSpeed += 0.5`                                |
