# Game Events Contract: Gameplay Core

**Feature**: `001-gameplay-core` | **Date**: 2026-02-15

This game has no REST API or backend. The "contract" is the event-driven interface
between the Phaser game systems and the Zustand UI store. All communication flows
through these two channels:

1. **Phaser → Zustand** (game state updates for React UI)
2. **Zustand → Phaser** (player decisions fed back into the game loop)

---

## Channel 1: Phaser → Zustand Store (Game → UI)

These are direct mutations on the Zustand store, called from Phaser systems.
React components auto-re-render on subscribed slices.

### Store Shape: `GameStore`

```ts
interface GameStore {
  // --- Health ---
  health: number; // 0–100, shared pool
  maxHealth: number; // 100 (constant)
  setHealth: (hp: number) => void;

  // --- Ammo ---
  kittyAmmo: number; // 0–10
  doggoStamina: number; // 0–8
  setKittyAmmo: (n: number) => void;
  setDoggoStamina: (n: number) => void;

  // --- Coins & Level ---
  coins: number; // cumulative
  level: number; // ≥1
  nextLevelThreshold: number;
  setCoins: (n: number) => void;
  setLevel: (n: number) => void;

  // --- Timer & Wave ---
  elapsedTime: number; // ms since game start
  waveNumber: number;
  setElapsedTime: (ms: number) => void;
  setWaveNumber: (n: number) => void;

  // --- Game State ---
  gameState: 'playing' | 'level-up' | 'game-over';
  setGameState: (state: GameStore['gameState']) => void;

  // --- Level-Up Selection (React → Phaser) ---
  selectedUpgrade: 'tether-length' | 'damage' | 'speed' | null;
  setSelectedUpgrade: (u: GameStore['selectedUpgrade']) => void;
}
```

### Event Table: Phaser System → Store Mutation

| Source System      | Store Mutation              | Frequency            | Trigger                               |
| ------------------ | --------------------------- | -------------------- | ------------------------------------- |
| CombatSystem       | `setHealth(hp)`             | On enemy contact     | Per-enemy per-player with 1s cooldown |
| CombatSystem       | `setKittyAmmo(n)`           | On ranged shot fired | Every 1000ms while target in range    |
| CombatSystem       | `setDoggoStamina(n)`        | On melee swing       | Every 800ms while target in range     |
| LoveReloadSystem   | `setHealth(hp)`             | On player collision  | When hitboxes overlap                 |
| LoveReloadSystem   | `setKittyAmmo(10)`          | On player collision  | Full restore                          |
| LoveReloadSystem   | `setDoggoStamina(8)`        | On player collision  | Full restore                          |
| SpawnSystem (coin) | `setCoins(n)`               | On coin pickup       | Player overlaps coin                  |
| LevelUpSystem      | `setLevel(n)`               | On threshold reached | coins ≥ nextLevelThreshold            |
| LevelUpSystem      | `setGameState("level-up")`  | On threshold reached | Triggers pause + overlay              |
| WaveSystem         | `setWaveNumber(n)`          | Every 30s            | Wave timer tick                       |
| GameScene          | `setElapsedTime(ms)`        | Every frame          | Continuous timer display              |
| GameScene          | `setGameState("game-over")` | On health=0          | Stops gameplay                        |

---

## Channel 2: Zustand → Phaser (UI → Game)

### Level-Up Selection Flow

```text
1. LevelUpSystem detects threshold → calls setGameState("level-up")
2. React renders <LevelUpOverlay> (reads gameState === "level-up")
3. Player clicks an upgrade button
4. React calls setSelectedUpgrade("damage")  // or "tether-length" or "speed"
5. Phaser LevelUpSystem polls selectedUpgrade in update()
6. When selectedUpgrade !== null:
   a. Apply upgrade to game entities
   b. Call setSelectedUpgrade(null)  // clear selection
   c. Call setGameState("playing")   // resume
   d. Unfreeze enemies
```

### Contract Rules

- **Phaser reads** `selectedUpgrade` from `useGameStore.getState().selectedUpgrade`
- **React writes** `selectedUpgrade` via `useGameStore.getState().setSelectedUpgrade(...)`
- **Phaser clears** `selectedUpgrade` back to `null` after applying
- No other React → Phaser communication paths exist in this feature

---

## Collision Categories (Matter.js)

Physics collision filtering contract between entity types.

```ts
// Collision category bitmask constants
const CATEGORY = {
  PLAYER: 0x0001, // Both Kitty and Doggo
  ENEMY: 0x0002, // All enemy types
  PROJECTILE: 0x0004, // Kitty's shots + Emotional Baggage
  COIN: 0x0008, // Dropped coins
  BOUNDARY: 0x0010, // Arena edges
} as const;

// Collision masks: what each category collides WITH
const MASK = {
  PLAYER:
    CATEGORY.PLAYER | CATEGORY.ENEMY | CATEGORY.COIN | CATEGORY.PROJECTILE | CATEGORY.BOUNDARY,
  // ↑ Includes PLAYER so Player↔Player collision fires (Love Reload)
  ENEMY: CATEGORY.PLAYER | CATEGORY.PROJECTILE | CATEGORY.BOUNDARY,
  // Note: ENEMY does NOT collide with ENEMY (prevents stacking physics overhead)
  PROJECTILE: CATEGORY.ENEMY | CATEGORY.PLAYER,
  // ranged-shot hits ENEMY; emotional-baggage hits PLAYER — filtered in collision handler
  COIN: CATEGORY.PLAYER,
  BOUNDARY: CATEGORY.PLAYER | CATEGORY.ENEMY,
} as const;
```

### Collision Pair Behaviors

| Body A            | Body B            | Behavior                                                                        |
| ----------------- | ----------------- | ------------------------------------------------------------------------------- |
| Player            | Enemy             | Contact damage (with 1s cooldown per-enemy-per-player)                          |
| Player            | Player            | Love Reload trigger (check ammo/health conditions)                              |
| Player            | Coin              | Collect coin, deactivate coin, increment store                                  |
| Player            | Emotional Baggage | Apply slow debuff (50% speed, 3s duration)                                      |
| Ranged Shot       | Enemy             | Deal ranged damage, deactivate projectile                                       |
| Rope (line check) | Enemy             | Clothesline damage + knockback (manual per-frame check, not collision category) |

---

## Performance Contract

| Metric             | Target                  | Enforcement                                                 |
| ------------------ | ----------------------- | ----------------------------------------------------------- |
| Frame rate         | ≥ 60 FPS                | Matter.js fixed timestep, collision filters, object pooling |
| Active enemies     | ≤ 50                    | Wave system active cap; spawn deferred at cap               |
| Physics bodies     | ≤ ~110                  | 2 players + 50 enemies + ~50 projectiles + coins (pooled)   |
| Store updates      | ≤ 5/frame typical       | Batch timer updates; damage/ammo only on events             |
| Clothesline checks | 50 distance calcs/frame | O(n) per frame, ~0.01ms at n=50                             |
