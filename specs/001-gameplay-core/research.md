# Research: Elastic Spring Constraint (Tether/Rope) in Phaser 3 + Matter.js

**Date**: 2026-02-15
**Context**: Co-op survival game — two players connected by an elastic rope (300px max). Rope is a weapon (clothesline mechanic). Target: 60 FPS, ≤50 enemies, 1280×720 arena.

---

## Question 1: What is the correct Matter.js API for spring constraints between two bodies?

### Decision

Use `Phaser.Physics.Matter.Matter.Constraint.create()` (or the Phaser wrapper `this.matter.add.constraint()`) with tuned `stiffness` and `damping` parameters.

### API Reference

```ts
// In GameScene.create():
const ropeConstraint = this.matter.add.constraint(
  playerA.body as MatterJS.BodyType,
  playerB.body as MatterJS.BodyType,
  300, // length — the "rest length" of the spring
  0.02, // stiffness — low value = stretchy/elastic feel
);

// Fine-tune after creation:
ropeConstraint.damping = 0.05; // 0 = no damping (infinite bounce), 1 = critically damped
ropeConstraint.length = 300; // rest length in pixels
```

The underlying Matter.js call is:

```ts
Matter.Constraint.create({
  bodyA: playerA.body,
  bodyB: playerB.body,
  length: 300,
  stiffness: 0.02, // range: 0–1. Lower = softer spring.
  damping: 0.05, // range: 0–1. Higher = less oscillation.
  pointA: { x: 0, y: 0 }, // anchor relative to bodyA center
  pointB: { x: 0, y: 0 }, // anchor relative to bodyB center
});
```

### Key Parameters

| Param       | Range  | Recommended          | Effect                                                                                                                                 |
| ----------- | ------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `stiffness` | 0–1    | **0.01–0.05**        | Lower = more elastic/bouncy rope. 0.02 gives a satisfying "bungee cord" feel. Values above 0.1 feel rigid.                             |
| `damping`   | 0–1    | **0.02–0.08**        | Lower = more oscillation (comedic bounce). Higher = settles faster. 0.05 is a good starting point for "bouncy but not infinite jello." |
| `length`    | pixels | **300** (per FR-002) | Rest length. The spring pulls bodies together when distance > length. Below rest length, the spring does NOT push apart by default.    |

### Rationale

- Phaser 3's Matter plugin directly exposes `Matter.Constraint` via `this.matter.add.constraint()`. No need to drop to raw Matter.js.
- `stiffness` 0.02 + `damping` 0.05 produces the "stretchy, bouncy" feel described in the spec's User Story 1 ("springy, bouncy feel that produces comedic physics interactions").
- The constraint automatically applies equal and opposite forces to both bodies — when Player A walks away, Player B gets pulled. This satisfies FR-003 ("pulled with visible inertia proportional to stretch distance") for free.

### Alternatives Considered

| Alternative                                             | Why Rejected                                                                                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Distance Joint** (`stiffness: 1`)                     | Rigid rod, not elastic. No stretch/bounce.                                                                                                                 |
| **Manual force application each frame** (no constraint) | Reinventing the wheel. Matter.js solver handles sub-stepping, stability, and bidirectional forces correctly. Manual approach risks jitter at high stretch. |
| **Phaser Arcade Physics springs**                       | Arcade Physics has no constraint system. Would require switching physics engine or manual implementation.                                                  |

---

## Question 2: How do you enforce a hard max distance with a spring?

### Decision

**Hybrid approach**: Use Matter.js constraint as the soft spring + a per-frame hard clamp in the `update()` loop.

### Implementation

```ts
// In GameScene.update():
const MAX_TETHER = 300;

const posA = playerA.body.position; // { x, y }
const posB = playerB.body.position;

const dx = posB.x - posA.x;
const dy = posB.y - posA.y;
const dist = Math.sqrt(dx * dx + dy * dy);

if (dist > MAX_TETHER) {
  // Normalize direction vector
  const nx = dx / dist;
  const ny = dy / dist;

  // Calculate midpoint
  const midX = (posA.x + posB.x) / 2;
  const midY = (posA.y + posB.y) / 2;

  // Snap both bodies to exactly MAX_TETHER apart, centered on midpoint
  const halfMax = MAX_TETHER / 2;
  Matter.Body.setPosition(playerA.body, {
    x: midX - nx * halfMax,
    y: midY - ny * halfMax,
  });
  Matter.Body.setPosition(playerB.body, {
    x: midX + nx * halfMax,
    y: midY + ny * halfMax,
  });

  // Optional: zero out velocity components that push them apart
  const velA = playerA.body.velocity;
  const dotA = velA.x * nx + velA.y * ny;
  if (dotA < 0) {
    // moving away from B
    Matter.Body.setVelocity(playerA.body, {
      x: velA.x - dotA * nx * 0.8, // 0.8 = keep some bounce
      y: velA.y - dotA * ny * 0.8,
    });
  }

  const velB = playerB.body.velocity;
  const dotB = velB.x * -nx + velB.y * -ny;
  if (dotB < 0) {
    // moving away from A
    Matter.Body.setVelocity(playerB.body, {
      x: velB.x - dotB * -nx * 0.8,
      y: velB.y - dotB * -ny * 0.8,
    });
  }
}
```

### Rationale

- Matter.js constraints are **soft** by design. Even at `stiffness: 1`, the solver can allow overshoot for a frame or two, especially under strong forces (both players pressing away simultaneously at 60 FPS).
- The hard clamp runs **after** the physics step in `update()`, guaranteeing the 300px invariant every rendered frame. This satisfies acceptance scenario 1.2 ("prevented from exceeding the max distance").
- The midpoint-centering approach is fair to both players — neither gets priority.
- Zeroing outward velocity with a 0.8 multiplier preserves some bounce (comedic snap-back per scenario 1.3) while preventing further divergence.

### Alternatives Considered

| Alternative                                            | Why Rejected                                                                                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Very high stiffness (0.8–1.0)**                      | Reduces overshoot but doesn't guarantee it. Still allows 1–3 frames of violation. Also removes the elastic feel — can't have both a soft spring AND a hard limit in one constraint.                    |
| **Two constraints** (soft spring + rigid max-distance) | Matter.js doesn't support inequality constraints (only equality springs). A rigid constraint at length=300 would always pull toward 300px, preventing players from standing close.                     |
| **`Matter.Events.on('beforeUpdate')`**                 | Same idea as update-loop clamping but fires before collision resolution. Could cause jitter if positions are corrected before the solver runs. Post-physics clamping (Phaser `update`) is more stable. |
| **Custom Matter.js plugin**                            | Over-engineered for this use case. The 5-line clamp is sufficient and debuggable.                                                                                                                      |

### Important Note

Set the constraint's `length` to something **less** than 300 (e.g., 200) so the spring starts pulling before the hard clamp kicks in. This creates a smooth transition: from 0–200px the rope is slack, from 200–300px the spring pulls gently, and at 300px the hard clamp activates.

```ts
ropeConstraint.length = 200; // spring engages at 200px
// Hard clamp at 300px in update()
```

This avoids jarring snaps by ensuring players feel increasing resistance before hitting the wall.

---

## Question 3: How to detect collisions with the rope LINE for the clothesline mechanic?

### Decision

**Thin Matter.js body (capsule/chain of rectangles) repositioned each frame along the rope line.**

### Implementation

```ts
// === Setup (in create) ===
const ROPE_SEGMENTS = 8;
const SEGMENT_WIDTH = 8; // thin enough to look like a rope, thick enough for collision

// Create a sensor body (no physical pushback, only triggers collisions)
const ropeBodies: MatterJS.BodyType[] = [];
for (let i = 0; i < ROPE_SEGMENTS; i++) {
  const segment = this.matter.add.rectangle(0, 0, SEGMENT_WIDTH, SEGMENT_WIDTH, {
    isSensor: true, // detects overlap but doesn't physically block
    isStatic: true, // we reposition manually each frame
    label: "rope-segment",
    collisionFilter: {
      category: 0x0004, // rope category
      mask: 0x0002, // only collide with enemies
    },
  });
  ropeBodies.push(segment);
}

// === Update (every frame) ===
function updateRopeColliders(posA: Vector, posB: Vector) {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const angle = Math.atan2(dy, dx);
  const segLen = Math.sqrt(dx * dx + dy * dy) / ROPE_SEGMENTS;

  for (let i = 0; i < ROPE_SEGMENTS; i++) {
    const t = (i + 0.5) / ROPE_SEGMENTS;
    const x = posA.x + dx * t;
    const y = posA.y + dy * t;

    Matter.Body.setPosition(ropeBodies[i], { x, y });
    Matter.Body.setAngle(ropeBodies[i], angle);

    // Resize segment to match current rope length / segment count
    // (Matter.js doesn't support dynamic scaling — use scaleX/scaleY or recreate)
    Matter.Body.scale(ropeBodies[i], segLen / ropeBodies[i].bounds.max.x + ropeBodies[i].bounds.min.x || 1, 1);
  }
}

// === Collision Handler ===
this.matter.world.on("collisionstart", (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
  for (const pair of event.pairs) {
    const labels = [pair.bodyA.label, pair.bodyB.label];
    if (labels.includes("rope-segment") && labels.includes("enemy")) {
      const enemyBody = pair.bodyA.label === "enemy" ? pair.bodyA : pair.bodyB;
      // Apply clothesline damage + knockback
      applyClotheslineDamage(enemyBody);
    }
  }
});
```

### Simplified Alternative (Recommended for Phase 1)

Since Matter.js body scaling is awkward, a simpler approach uses **manual point-to-line distance** checks each frame, avoiding extra bodies entirely:

```ts
// In CombatSystem.update():
function checkClotheslineHits(posA: Vector, posB: Vector, enemies: Enemy[]) {
  const ROPE_HIT_RADIUS = 8; // pixels — thickness of the "hit zone"

  // Skip if rope is too short (spec: slack rope = no damage)
  const ropeLenSq = (posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2;
  if (ropeLenSq < 100 * 100) return; // rope must be at least 100px to deal damage

  for (const enemy of enemies) {
    if (enemy.clotheslineCooldown > 0) continue; // prevent double-hits

    const d = pointToSegmentDistance(enemy.x, enemy.y, posA.x, posA.y, posB.x, posB.y);
    if (d <= ROPE_HIT_RADIUS + enemy.hitRadius) {
      enemy.takeClotheslineDamage(CLOTHESLINE_DAMAGE);
      enemy.applyKnockback(posA, posB);
      enemy.clotheslineCooldown = 500; // ms cooldown to prevent multi-frame hits
    }
  }
}

// Standard point-to-line-segment distance formula
function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax,
    aby = by - ay;
  const apx = px - ax,
    apy = py - ay;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));
  const projX = ax + t * abx;
  const projY = ay + t * aby;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
```

### Rationale

**The manual point-to-line approach is recommended** for this project because:

1. **Performance**: One `pointToSegmentDistance` call per enemy per frame ≈ ~50 calls at peak. This is negligible CPU cost vs. 8 extra Matter.js bodies that participate in broadphase every frame.
2. **Simplicity**: No need to manage extra bodies, scaling, rotation, or collision filter synchronization.
3. **Accuracy**: The mathematical check is exact. Sensor bodies can miss fast-moving enemies (tunneling) or have edge cases at segment boundaries.
4. **Spec compliance**: Acceptance scenario 3.4 says "rope is slack → no damage." A simple `ropeLenSq` threshold check handles this trivially.
5. **Knockback direction**: With the math approach, we know the exact closest point on the rope, giving us a precise knockback vector perpendicular to the rope (more satisfying physics).

### Alternatives Considered

| Alternative                                 | Pros                                                                                              | Cons                                                                                                                                               | Verdict                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Matter.js sensor chain** (8 segments)     | Leverages existing collision system; no per-frame iteration over enemies                          | 8 extra bodies in broadphase; awkward scaling; potential tunneling misses; more complex setup/teardown                                             | Viable but over-engineered |
| **Raycasting** (`Matter.Query.ray`)         | Simple API; one call per frame                                                                    | Only detects bodies along a thin ray — no "thickness" parameter; would miss enemies whose center isn't on the exact line; can't control hit radius | Poor fit — too narrow      |
| **`Matter.Query.region`** with rotated AABB | Single broadphase query                                                                           | AABBs can't be rotated in Matter.js; would need to decompose into segments anyway                                                                  | Doesn't solve the problem  |
| **Manual math** (point-to-segment distance) | Exact; fast; simple; no extra bodies; easy knockback vector calculation; trivial slack-rope check | Must iterate enemies manually; not "physics engine native"                                                                                         | **RECOMMENDED**            |

---

## Question 4: How to render the rope visually in Phaser 3?

### Decision

Use `Phaser.GameObjects.Graphics` with `lineStyle()` + `lineBetween()`, redrawn each frame.

### Implementation

```ts
// In GameScene.create():
const ropeGraphics = this.add.graphics();

// In GameScene.update():
ropeGraphics.clear();

// Calculate stretch ratio for visual feedback
const dist = Phaser.Math.Distance.Between(posA.x, posA.y, posB.x, posB.y);
const stretchRatio = Math.min(dist / MAX_TETHER, 1.0);

// Color shifts from white (slack) → yellow (taut) → red (max stretch)
const color =
  stretchRatio < 0.5
    ? 0xffffff // slack: white
    : stretchRatio < 0.85
      ? Phaser.Display.Color.GetColor(255, 255 - (stretchRatio - 0.5) * 600, 0) // yellow→orange
      : 0xff0000; // near-max: red

const thickness = 2 + stretchRatio * 4; // 2px slack → 6px stretched

ropeGraphics.lineStyle(thickness, color, 1.0);
ropeGraphics.lineBetween(posA.x, posA.y, posB.x, posB.y);

// Optional: catenary/sag curve when slack (cosmetic only)
if (stretchRatio < 0.3) {
  const sag = (1 - stretchRatio / 0.3) * 30; // max 30px sag when close together
  const midX = (posA.x + posB.x) / 2;
  const midY = (posA.y + posB.y) / 2 + sag;

  ropeGraphics.clear();
  ropeGraphics.lineStyle(thickness, color, 1.0);
  ropeGraphics.beginPath();
  ropeGraphics.moveTo(posA.x, posA.y);
  ropeGraphics.lineTo(midX, midY); // quadratic would be nicer, but this works for Phase 1
  ropeGraphics.lineTo(posB.x, posB.y);
  ropeGraphics.strokePath();
}
```

### Enhanced Version (Catenary Curve)

For a more polished look, draw a quadratic Bezier curve:

```ts
ropeGraphics.clear();
ropeGraphics.lineStyle(thickness, color, 1.0);

const sag = Math.max(0, (1 - stretchRatio) * 40); // sag when slack, 0 when taut
const controlX = (posA.x + posB.x) / 2;
const controlY = (posA.y + posB.y) / 2 + sag;

const curve = new Phaser.Curves.QuadraticBezier(
  new Phaser.Math.Vector2(posA.x, posA.y),
  new Phaser.Math.Vector2(controlX, controlY),
  new Phaser.Math.Vector2(posB.x, posB.y),
);

curve.draw(ropeGraphics, 32); // 32 segments for smooth curve
```

### Rationale

- `Graphics.lineBetween()` is the simplest and most performant option for a single line redrawn each frame.
- Color/thickness changes provide visual feedback about tether tension without UI clutter.
- The catenary sag is a polish element that signals "slack" vs "taut" intuitively.
- Graphics objects in Phaser 3 are designed for per-frame redraw — `clear()` + draw is the idiomatic pattern.

### Alternatives Considered

| Alternative                                       | Why Rejected                                                                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phaser `Rope` game object** (`this.add.rope()`) | Designed for textured mesh ribbons with wave deformation. Overkill for a simple line/curve. Requires a texture atlas. Would be appropriate in Phase 2 if we want a textured rope sprite. |
| **Sprite-based segment chain**                    | Much higher draw call count. Each segment is a separate sprite. Bad for performance at 60 FPS.                                                                                           |
| **HTML Canvas overlay**                           | Breaks Phaser's rendering pipeline. Z-ordering issues. Can't use Phaser's camera/scene system.                                                                                           |
| **Shader-based rope**                             | Maximum visual quality, but requires WebGL shader programming. Possible Phase 3 enhancement.                                                                                             |

---

## Question 5: Performance pitfalls with Matter.js in Phaser 3 at 60 FPS

### Known Issues & Mitigations

#### 1. Body Count is the #1 Performance Factor

**Problem**: Matter.js broadphase (grid-based) scales roughly O(n²) for collision checks. Each additional body adds to every-frame overhead.

**Mitigation**:

- Keep total body count low: 2 players + ≤50 enemies + projectiles + coins ≈ ~100 bodies max.
- Use **collision filters** aggressively — enemies don't need to collide with each other (only with players and walls).
- Mark coins and projectiles as **sensors** to skip collision resolution (only trigger overlap events).
- **Do NOT** use Matter.js bodies for the rope collision detection (use manual math per Q3).

```ts
// Collision filter setup — enemies skip enemy-enemy collisions
const CATEGORY = {
  PLAYER: 0x0001,
  ENEMY: 0x0002,
  PROJECTILE: 0x0004,
  COIN: 0x0008,
  WALL: 0x0010,
};

// Enemy only collides with players and walls, not other enemies
enemyBody.collisionFilter = {
  category: CATEGORY.ENEMY,
  mask: CATEGORY.PLAYER | CATEGORY.WALL,
};
```

#### 2. `Matter.Body.setPosition()` vs `Matter.Body.applyForce()`

**Problem**: Directly setting position each frame (`setPosition`) bypasses the physics solver and can cause tunneling or jittery interactions with other bodies.

**Mitigation**:

- For player movement, apply forces or set velocity — don't teleport.
- Only use `setPosition` for the hard-clamp (Q2), which runs post-physics as a safety net.

```ts
// GOOD: Apply force for movement
Matter.Body.setVelocity(player.body, { x: inputX * speed, y: inputY * speed });

// BAD: Teleport each frame
Matter.Body.setPosition(player.body, { x: player.body.position.x + inputX * speed, ... });
```

#### 3. Matter.js `delta` Timing Issues in Phaser

**Problem**: Phaser 3's Matter integration uses a fixed timestep by default (60 Hz). If the game drops below 60 FPS, physics can accumulate and cause large position jumps on the next frame.

**Mitigation**:

- Keep the default fixed timestep (don't switch to variable).
- Set `matter.runner.isFixed: true` (the default).
- Cap the maximum delta to prevent spiral-of-death:

```ts
// In Phaser config
physics: {
  matter: {
    gravity: { x: 0, y: 0 },  // top-down game, no gravity
    debug: false,               // disable in production — debug rendering is expensive
    runner: {
      isFixed: true,
      delta: 1000 / 60,        // 16.67ms per physics step
    },
  },
},
```

#### 4. Debug Rendering is Extremely Expensive

**Problem**: `debug: true` in Matter config draws wireframes for every body, constraint, and collision pair. This alone can drop FPS by 30–50%.

**Mitigation**: Only enable during development. Use a toggle:

```ts
// Toggle debug rendering at runtime
this.matter.world.drawDebug = false;

// Keyboard shortcut for dev
this.input.keyboard.on("keydown-F1", () => {
  this.matter.world.drawDebug = !this.matter.world.drawDebug;
});
```

#### 5. Constraint Solver Iterations

**Problem**: Default Matter.js uses 6 position iterations and 4 velocity iterations. Increasing these improves constraint accuracy (less stretchy overshoot) but costs CPU linearly.

**Mitigation**: Keep defaults. The soft spring + hard clamp approach (Q2) means we don't need high solver accuracy.

```ts
// Only increase if constraints feel "mushy" (unlikely needed)
// this.matter.world.engine.positionIterations = 10;  // default: 6
// this.matter.world.engine.velocityIterations = 6;    // default: 4
```

#### 6. Phaser's Matter Plugin Garbage Collection

**Problem**: Creating/destroying Matter.js bodies generates GC pressure. Enemy spawning/despawning at high rates (50 enemies cycling) can cause frame hitches.

**Mitigation**: **Object pooling** for enemies, projectiles, and coins.

```ts
// Pool pattern
class EnemyPool {
  private pool: Enemy[] = [];

  acquire(): Enemy {
    const enemy = this.pool.pop() || new Enemy(scene);
    enemy.activate();
    return enemy;
  }

  release(enemy: Enemy) {
    enemy.deactivate(); // disable body, hide sprite
    this.pool.push(enemy);
  }
}
```

#### 7. Graphics.clear() Each Frame

**Problem**: `Graphics.clear()` followed by redraw is fine for a single rope line, but becomes expensive if you draw hundreds of elements (e.g., debug visualizations).

**Mitigation**: Only use Graphics for the rope line. Use sprites/particles for everything else.

### Performance Budget Summary

| System                | Bodies                               | Per-Frame Cost      | Risk                                         |
| --------------------- | ------------------------------------ | ------------------- | -------------------------------------------- |
| Players               | 2                                    | Negligible          | None                                         |
| Tether Constraint     | 0 extra bodies (1 Matter constraint) | Negligible          | None                                         |
| Clothesline Detection | 0 bodies (math-based)                | ~50 distance calcs  | Low                                          |
| Enemies               | ≤50                                  | Broadphase dominant | **Medium** — mitigate with collision filters |
| Projectiles           | ≤20                                  | Sensors, low cost   | Low                                          |
| Coins                 | ≤30                                  | Sensors, low cost   | Low                                          |
| Rope Rendering        | 0 bodies (Graphics)                  | 1 draw call         | None                                         |
| **Total**             | **~102 bodies**                      |                     | **Feasible at 60 FPS**                       |

---

## Summary of Decisions

| #   | Question                     | Decision                                                                         | Confidence                                                                 |
| --- | ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Spring constraint API        | `this.matter.add.constraint()` with `stiffness: 0.02`, `damping: 0.05`           | **High** — standard Matter.js API, well-documented                         |
| 2   | Hard max distance            | Soft spring (rest length 200px) + post-physics hard clamp at 300px in `update()` | **High** — hybrid approach is the standard pattern for "spring with limit" |
| 3   | Rope collision (clothesline) | Manual point-to-segment distance check per enemy per frame                       | **High** — best performance/accuracy tradeoff for ≤50 enemies              |
| 4   | Rope rendering               | `Phaser.GameObjects.Graphics` with `lineBetween()` or Bezier curve               | **High** — idiomatic Phaser 3, minimal overhead                            |
| 5   | Performance pitfalls         | Collision filters, object pooling, debug off, fixed timestep, ≤100 total bodies  | **High** — well-known Matter.js best practices                             |

---

# Research: Embedding Phaser 3 in React 18+ with Vite, Zustand, and TailwindCSS

**Date**: 2026-02-15
**Context**: Same project — React shell hosts the Phaser canvas; React renders HUD (health bar, ammo, timer), level-up overlay, and game-over screen. Zustand bridges game state. TailwindCSS styles all React components. Vite bundles everything.

---

## Question 6: What is the recommended pattern for mounting/destroying a Phaser game instance inside a React component?

### Decision

Use a dedicated **wrapper component** with `useRef` for the DOM container + `useEffect` for lifecycle (mount → create game, unmount → destroy game). The Phaser `Game` instance lives **outside React's render cycle** — React only owns the `<div>` that Phaser renders into.

### Implementation

```tsx
// src/game/PhaserGame.tsx
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { gameConfig } from "./config";

/**
 * Wrapper component that mounts and owns the Phaser.Game lifecycle.
 * React never re-renders this — the ref is stable.
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create the Phaser game, parented to our div
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current, // Phaser appends its <canvas> here
    });

    // Cleanup on unmount (React Strict Mode double-invokes effects in dev)
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true); // true = remove canvas from DOM
        gameRef.current = null;
      }
    };
  }, []); // empty deps — run once on mount

  return <div ref={containerRef} id="phaser-container" />;
}
```

```ts
// src/game/config.ts
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with Canvas fallback
  width: 1280,
  height: 720,
  // parent is set dynamically in PhaserGame.tsx
  physics: {
    matter: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene, GameOverScene],
  // Let CSS control size, not Phaser's scale manager
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
```

### React Strict Mode Caveat

React 18 `<StrictMode>` double-invokes `useEffect` in development to detect side-effect issues. This means the Phaser game would be created, destroyed, and created again. The `gameRef.current` guard + the `destroy(true)` cleanup handle this correctly:

```
Dev mount →  useEffect fires → game created (gameRef.current = game)
             cleanup fires   → game.destroy(), gameRef.current = null
             useEffect fires → game created again (fresh instance)
```

This is safe because `game.destroy(true)` fully removes the canvas. The second creation starts clean. **No additional workaround needed** — the pattern above handles Strict Mode natively.

### Rationale

- **`useRef` for container**: Gives Phaser a stable DOM node to parent its canvas. `useRef` doesn't trigger re-renders, so Phaser's canvas is never replaced by React's reconciler.
- **`useRef` for game instance**: Prevents re-creation on re-renders. The `if (gameRef.current) return` guard is essential.
- **`useEffect` cleanup**: Phaser's `game.destroy(true)` removes the canvas element from the DOM and tears down all scenes, physics, and event listeners. Without this, hot-module replacement (HMR) during development would stack multiple game instances.
- **Separate config file**: Keeps the Phaser configuration decoupled from the React component. Scenes are registered via classes, not instances — Phaser instantiates them internally.

### Alternatives Considered

| Alternative                                                          | Why Rejected                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Create `Phaser.Game` at module scope** (outside any component)     | Cannot parent to a DOM element that doesn't exist yet. Also leaks the game instance — no cleanup path for HMR or route changes.                                                                                          |
| **`useMemo` to create the game**                                     | `useMemo` is for pure computations, not side effects. Creating a game is a side effect (DOM mutation). React docs explicitly warn against side effects in `useMemo`.                                                     |
| **Class component with `componentDidMount`/`componentWillUnmount`**  | Works but unnecessary with hooks. Functional components are the modern React convention.                                                                                                                                 |
| **`useLayoutEffect` instead of `useEffect`**                         | `useLayoutEffect` fires synchronously before paint, which could block the first frame. Phaser's game creation is async (it starts its own RAF loop), so `useEffect` is more appropriate and doesn't delay initial paint. |
| **Third-party wrappers (`@ion-phaser/react`, `phaser-react-tools`)** | Adds a dependency for what is essentially 20 lines of code. These libraries also tend to lag behind Phaser major versions and impose their own opinions on state management.                                             |

---

## Question 7: How does game state flow from Phaser → Zustand → React?

### Decision

**Direct store mutation from Phaser scenes**: Phaser scene code calls `useGameStore.getState().setHealth(...)` (Zustand's vanilla API) directly. No intermediate event emitter layer.

### Implementation

```ts
// src/state/gameStore.ts
import { create } from "zustand";

interface GameState {
  // State
  health: number;
  maxHealth: number;
  coins: number;
  level: number;
  wave: number;
  kittyAmmo: number;
  doggoStamina: number;
  timer: number;
  isPaused: boolean;
  isGameOver: boolean;

  // Actions (called from Phaser scenes)
  setHealth: (hp: number) => void;
  addCoins: (amount: number) => void;
  setLevel: (level: number) => void;
  setWave: (wave: number) => void;
  setKittyAmmo: (ammo: number) => void;
  setDoggoStamina: (stamina: number) => void;
  setTimer: (seconds: number) => void;
  setPaused: (paused: boolean) => void;
  setGameOver: (isOver: boolean) => void;
  reset: () => void;
}

const initialState = {
  health: 100,
  maxHealth: 100,
  coins: 0,
  level: 1,
  wave: 1,
  kittyAmmo: 10,
  doggoStamina: 8,
  timer: 0,
  isPaused: false,
  isGameOver: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setHealth: (hp) => set({ health: Math.max(0, Math.min(hp, useGameStore.getState().maxHealth)) }),
  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
  setLevel: (level) => set({ level }),
  setWave: (wave) => set({ wave }),
  setKittyAmmo: (ammo) => set({ kittyAmmo: ammo }),
  setDoggoStamina: (stamina) => set({ doggoStamina: stamina }),
  setTimer: (seconds) => set({ timer: seconds }),
  setPaused: (paused) => set({ isPaused: paused }),
  setGameOver: (isOver) => set({ isGameOver: isOver }),
  reset: () => set(initialState),
}));
```

```ts
// In GameScene.ts — Phaser calls Zustand directly
import { useGameStore } from "../../state/gameStore";

export class GameScene extends Phaser.Scene {
  update(time: number, delta: number) {
    // After damage calculation:
    const newHealth = this.sharedHealth - damageThisFrame;
    this.sharedHealth = newHealth;
    useGameStore.getState().setHealth(newHealth); // ← direct call

    // After coin pickup:
    useGameStore.getState().addCoins(1);

    // Timer update:
    useGameStore.getState().setTimer(Math.floor(time / 1000));
  }
}
```

```tsx
// In HUD.tsx — React reads Zustand with selectors (auto-re-renders)
import { useGameStore } from "../state/gameStore";

export function HUD() {
  const health = useGameStore((s) => s.health);
  const maxHealth = useGameStore((s) => s.maxHealth);
  const coins = useGameStore((s) => s.coins);
  const kittyAmmo = useGameStore((s) => s.kittyAmmo);
  const doggoStamina = useGameStore((s) => s.doggoStamina);
  const timer = useGameStore((s) => s.timer);
  const wave = useGameStore((s) => s.wave);

  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between pointer-events-none">
      <div className="flex flex-col gap-1">
        <HealthBar current={health} max={maxHealth} />
        <span className="text-white text-sm">Wave {wave}</span>
      </div>
      <div className="text-white text-lg font-mono">{formatTime(timer)}</div>
      <div className="flex gap-4">
        <AmmoDisplay label="🐱" current={kittyAmmo} max={10} />
        <AmmoDisplay label="🐶" current={doggoStamina} max={8} />
      </div>
      <div className="text-yellow-400 font-bold">🪙 {coins}</div>
    </div>
  );
}
```

### Why Direct Calls (Not Event Emitters)

| Concern              | Direct `getState().setX()`                                                                                                        | Event Emitter Pattern                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Setup complexity** | Zero — just import the store                                                                                                      | Need to create emitter, register listeners, manage subscriptions, clean up on scene shutdown                                                          |
| **Type safety**      | Full TypeScript — `setHealth` signature is enforced at call site                                                                  | Event names are strings; payload types require manual interfaces or a typed emitter library                                                           |
| **Debugging**        | Zustand devtools (Redux DevTools extension) show every state mutation with stack trace                                            | Events are fire-and-forget; harder to trace origin without custom logging                                                                             |
| **Performance**      | Zustand uses shallow equality by default — React only re-renders if the selected slice changed                                    | Event → listener → `setState` adds one hop of indirection; negligible perf difference                                                                 |
| **Coupling**         | Phaser imports the store module. This is acceptable: both run in the same bundle, and the store is the designed contract boundary | Lower coupling (Phaser only knows event names), but at the cost of a parallel contract (event names + payloads) that must stay in sync with the store |

**Verdict**: Direct calls win on simplicity, type safety, and debuggability. The "coupling" downside is theoretical — this is a single-project game, not a reusable library. The Zustand store IS the contract.

### When to Use an Event Emitter Instead

An event emitter layer becomes worthwhile if:

- Phaser scenes need to communicate with each other (scene→scene events are already built into Phaser's `EventEmitter3`).
- Multiple independent consumers need to react to the same game event (e.g., "enemy died" triggers both a Zustand update AND a sound effect AND a particle burst). In this case, Phaser's built-in `this.events.emit()` is the right tool, with one listener that bridges to Zustand.

For this project, the only cross-boundary flow is Phaser→Zustand→React, so direct calls are the right fit.

### Alternatives Considered

| Alternative                                    | Why Rejected                                                                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Phaser `EventEmitter` → listener → Zustand** | Unnecessary indirection. Adds a parallel contract (event strings) alongside the Zustand store. Useful for scene-to-scene communication, not for game-to-UI state.                                                                          |
| **React Context instead of Zustand**           | Context triggers re-renders for ALL consumers when any value changes (no selector support). With health updating 60× per second during combat, this would re-render the entire overlay tree every frame. Zustand's selectors prevent this. |
| **Redux Toolkit**                              | Full-featured but heavy for this use case. Zustand's `getState()` pattern is simpler for non-React callers (Phaser). Redux requires `store.dispatch(action)` which is more boilerplate.                                                    |
| **RxJS Observables**                           | Massive overkill. Adds a large dependency for a problem that Zustand solves natively.                                                                                                                                                      |
| **Custom pub/sub**                             | Reinvents Zustand's `subscribe()` mechanism. No benefit.                                                                                                                                                                                   |

### Performance Note: Throttling High-Frequency Updates

Health, ammo, and timer updates can fire every frame (60 Hz). Zustand handles this efficiently because React components use **selectors** that only trigger re-renders when the selected value actually changes (shallow equality check). However, if needed, throttle updates from Phaser:

```ts
// Throttle timer updates to once per second (not every frame)
private lastTimerSecond = 0;

update(time: number) {
  const currentSecond = Math.floor(time / 1000);
  if (currentSecond !== this.lastTimerSecond) {
    this.lastTimerSecond = currentSecond;
    useGameStore.getState().setTimer(currentSecond);
  }
}
```

---

## Question 8: How do React overlays render ON TOP of the Phaser canvas?

### Decision

Use **CSS `position: absolute` layering** within a shared relative container. The Phaser canvas and React overlays are siblings in the DOM; CSS `z-index` controls stacking. No portals needed.

### Implementation

```tsx
// src/App.tsx
import { PhaserGame } from "./game/PhaserGame";
import { HUD } from "./ui/HUD";
import { LevelUpOverlay } from "./ui/LevelUpOverlay";
import { GameOverOverlay } from "./ui/GameOverOverlay";
import { useGameStore } from "./state/gameStore";

export function App() {
  const isPaused = useGameStore((s) => s.isPaused);
  const isGameOver = useGameStore((s) => s.isGameOver);

  return (
    // Outer container — sets the stacking context
    <div className="relative w-[1280px] h-[720px] mx-auto overflow-hidden">
      {/* Layer 0: Phaser canvas (z-0) */}
      <PhaserGame />

      {/* Layer 1: HUD overlay — always visible, non-interactive background */}
      <HUD />

      {/* Layer 2: Level-up overlay — shown during pause */}
      {isPaused && <LevelUpOverlay />}

      {/* Layer 3: Game over overlay — shown on death */}
      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
```

```tsx
// src/game/PhaserGame.tsx — canvas fills the container
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  // ... useEffect with Phaser.Game creation (see Q6) ...

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}
```

```tsx
// src/ui/HUD.tsx — floats above canvas, doesn't block clicks
export function HUD() {
  // ... Zustand selectors ...
  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-4">
      {/* HUD elements — pointer-events-none lets clicks pass through to Phaser */}
      {/* ... health bar, ammo, timer, coins ... */}
    </div>
  );
}
```

```tsx
// src/ui/LevelUpOverlay.tsx — modal that captures clicks
export function LevelUpOverlay() {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center
                    bg-black/60 pointer-events-auto"
    >
      {/* Semi-transparent backdrop + centered upgrade cards */}
      <div className="bg-gray-900/90 rounded-2xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold text-white text-center mb-6">Level Up! Choose an upgrade:</h2>
        {/* Upgrade option cards */}
      </div>
    </div>
  );
}
```

### DOM Structure (Rendered)

```html
<div class="relative w-[1280px] h-[720px]">
  <!-- stacking context -->
  <div class="absolute inset-0 z-0">
    <!-- PhaserGame -->
    <canvas width="1280" height="720"></canvas>
    <!-- Phaser's canvas -->
  </div>
  <div class="absolute inset-0 z-10 pointer-events-none">
    <!-- HUD -->
    <!-- health bar, ammo, timer -->
  </div>
  <div class="absolute inset-0 z-20 pointer-events-auto">
    <!-- LevelUpOverlay -->
    <!-- upgrade selection cards -->
  </div>
</div>
```

### Key CSS Details

| Property                                | Purpose                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `relative` on outer `<div>`             | Creates a positioning context for `absolute` children                               |
| `absolute inset-0` on each layer        | Fills the container, stacks layers                                                  |
| `z-0`, `z-10`, `z-20`                   | Explicit stacking order. Gaps allow inserting layers later.                         |
| `pointer-events-none` on HUD            | Mouse/touch events pass through to Phaser canvas below                              |
| `pointer-events-auto` on LevelUpOverlay | Captures clicks for upgrade buttons; blocks input to Phaser (game is paused anyway) |
| `overflow-hidden` on container          | Prevents Phaser scale overflow from leaking outside the game area                   |
| `bg-black/60` on overlay                | Semi-transparent backdrop matching the "enemies freeze" pause effect                |

### Rationale

- **Simplicity**: CSS stacking is the most straightforward approach. No React portals, no extra DOM mounting points, no complexity.
- **Performance**: React overlays are standard DOM elements. No canvas-within-canvas rendering. The browser compositor handles z-ordering natively with near-zero cost.
- **Phaser compatibility**: Phaser's canvas is just a `<canvas>` element in the DOM. It participates in CSS stacking contexts like any other element.
- **`pointer-events`**: Critical for HUD — without `pointer-events-none`, the HUD div would intercept all mouse events, breaking any future mouse-based Phaser interactions.

### Alternatives Considered

| Alternative                                                         | Why Rejected                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React Portal** (`createPortal`)                                   | Portals mount children into a different DOM node. Useful for escaping a parent's `overflow: hidden` or `z-index` stacking context. Not needed here — all layers share the same container and stacking context. Portals add indirection without benefit. |
| **Render React UI inside Phaser's canvas** (Phaser DOM elements)    | Phaser 3 has `this.add.dom()` to embed HTML in the scene graph. However, these elements are managed by Phaser's scene lifecycle, not React. Loses React's component model, hooks, and Tailwind styling.                                                 |
| **Separate full-screen overlay `<div>` outside the game container** | Works but requires matching the game's position/size manually. The sibling approach within the same container is self-contained and responsive.                                                                                                         |
| **CSS `iframe` for Phaser**                                         | Terrible for performance and communication. `postMessage` is async and untyped. Never do this.                                                                                                                                                          |

---

## Question 9: How does the React level-up overlay communicate the player's choice BACK to Phaser?

### Decision

**Zustand store as bidirectional bridge**: React writes the selected upgrade to the Zustand store; the Phaser scene subscribes to the store and reads the selection on the next frame.

### Implementation

```ts
// src/state/gameStore.ts — extend with upgrade selection
interface GameState {
  // ... existing fields ...

  // Level-up flow
  isPaused: boolean;
  upgradeOptions: UpgradeOption[]; // set by Phaser when level-up triggers
  selectedUpgrade: UpgradeOption | null; // set by React when player chooses

  // Actions
  triggerLevelUp: (options: UpgradeOption[]) => void;
  selectUpgrade: (upgrade: UpgradeOption) => void;
  clearLevelUp: () => void;
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  stat: "attackSpeed" | "damage" | "maxHealth" | "moveSpeed" | "ammoCapacity";
  value: number;
}

export const useGameStore = create<GameState>((set) => ({
  // ...
  upgradeOptions: [],
  selectedUpgrade: null,

  triggerLevelUp: (options) =>
    set({
      isPaused: true,
      upgradeOptions: options,
      selectedUpgrade: null,
    }),

  selectUpgrade: (upgrade) =>
    set({
      selectedUpgrade: upgrade,
    }),

  clearLevelUp: () =>
    set({
      isPaused: false,
      upgradeOptions: [],
      selectedUpgrade: null,
    }),
}));
```

```ts
// In LevelUpSystem.ts (Phaser) — subscribe to store changes
import { useGameStore } from "../../state/gameStore";

export class LevelUpSystem {
  private unsubscribe: (() => void) | null = null;

  init(scene: Phaser.Scene) {
    // Subscribe to selectedUpgrade changes
    this.unsubscribe = useGameStore.subscribe(
      (state) => state.selectedUpgrade,
      (selectedUpgrade) => {
        if (selectedUpgrade) {
          this.applyUpgrade(selectedUpgrade);
          useGameStore.getState().clearLevelUp();
          scene.matter.world.resume(); // unpause physics
          scene.time.paused = false; // unpause timers
        }
      },
      // Use Zustand's subscribeWithSelector middleware equivalent:
      // Or manually check in update loop (see alternative below)
    );
  }

  destroy() {
    this.unsubscribe?.();
  }

  private applyUpgrade(upgrade: UpgradeOption) {
    // Apply stat changes to game entities...
  }
}
```

**Simpler Alternative (poll in update loop)**:

If Zustand's `subscribe` with selector feels complex, poll in the Phaser update loop instead. Since the game is paused during level-up, use a dedicated check:

```ts
// In GameScene.update():
update(time: number, delta: number) {
  const { selectedUpgrade, isPaused } = useGameStore.getState();

  if (isPaused && selectedUpgrade) {
    // Player made their choice — apply it and resume
    this.levelUpSystem.applyUpgrade(selectedUpgrade);
    useGameStore.getState().clearLevelUp();
    // Resume game...
    return;  // skip normal update this frame
  }

  if (isPaused) return;  // waiting for player choice

  // ... normal game loop ...
}
```

```tsx
// src/ui/LevelUpOverlay.tsx — React writes the choice
import { useGameStore } from "../state/gameStore";

export function LevelUpOverlay() {
  const options = useGameStore((s) => s.upgradeOptions);
  const selectUpgrade = useGameStore((s) => s.selectUpgrade);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900/90 rounded-2xl p-8 max-w-3xl w-full mx-4">
        <h2 className="text-3xl font-bold text-white text-center mb-8">✨ Level Up! Choose an upgrade:</h2>
        <div className="grid grid-cols-3 gap-4">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => selectUpgrade(opt)}
              className="bg-purple-900/80 hover:bg-purple-700 border-2 border-purple-400
                         rounded-xl p-6 text-left transition-all duration-200
                         hover:scale-105 hover:border-yellow-400"
            >
              <h3 className="text-xl font-bold text-white mb-2">{opt.name}</h3>
              <p className="text-purple-200 text-sm">{opt.description}</p>
              <p className="text-yellow-400 font-mono mt-3">
                +{opt.value} {opt.stat}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Data Flow Diagram

```
LEVEL-UP TRIGGER (Phaser → React):
  LevelUpSystem detects coin threshold
    → useGameStore.getState().triggerLevelUp(options)
      → isPaused=true, upgradeOptions=[...]
        → React re-renders: <LevelUpOverlay /> appears (isPaused selector)
        → Phaser pauses physics/timers (isPaused check in update)

PLAYER CHOICE (React → Phaser):
  Player clicks upgrade button in LevelUpOverlay
    → selectUpgrade(choice)
      → selectedUpgrade=choice in Zustand
        → Phaser reads selectedUpgrade in next update() tick (or via subscribe)
          → applyUpgrade() modifies game entities
            → clearLevelUp() resets isPaused=false, clears options
              → React re-renders: <LevelUpOverlay /> unmounts
              → Phaser resumes physics/timers
```

### Rationale

- **Single source of truth**: The Zustand store holds the complete level-up state (`isPaused`, `upgradeOptions`, `selectedUpgrade`). Both Phaser and React read from and write to the same store.
- **No direct scene references in React**: React never imports or calls Phaser scene methods. This keeps the React overlay completely decoupled from Phaser's internals. If the scene structure changes, only the store actions change.
- **Polling vs. subscribing**: The poll approach (`getState()` in `update()`) is recommended because: (a) the game loop already runs at 60 Hz, (b) the level-up system only checks during pause, (c) it's trivially debuggable — just a conditional in update. The `subscribe` approach is technically more reactive but adds lifecycle management (unsubscribe on scene stop).
- **Clean pause/resume**: Phaser's `matter.world.resume()` and `time.paused` are the official APIs for pausing. Setting `isPaused` in Zustand is a parallel flag that both Phaser and React read.

### Alternatives Considered

| Alternative                                       | Why Rejected                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pass a Phaser scene ref to React via context**  | Tight coupling. React would call `scene.applyUpgrade()` directly, breaking separation. If the scene hasn't loaded or is transitioning, the call crashes.                  |
| **Custom DOM events (`dispatchEvent` on window)** | Untyped, global, hard to debug. Must serialize data to string. Zustand is strictly better.                                                                                |
| **Phaser's built-in EventEmitter**                | React components can't easily subscribe to Phaser's `scene.events` without a ref to the scene. Zustand's `subscribe()` is purpose-built for this.                         |
| **Callback prop from React to Phaser**            | How would you pass a callback into a Phaser scene? You'd need a mutable ref that both systems access — which is effectively what Zustand already is, but less structured. |

---

## Question 10: Vite-specific configuration for Phaser 3?

### Decision

Phaser 3.80+ works with Vite out of the box for most use cases. Two specific configurations are needed: (1) exclude Phaser from dependency pre-bundling optimization, and (2) configure static asset handling.

### Implementation

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // TailwindCSS v4 Vite plugin

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Phaser-specific Vite configuration
  optimizeDeps: {
    exclude: ["phaser"], // Phaser's ESM build sometimes chokes during pre-bundling
  },

  build: {
    // Phaser is large (~1.5MB minified). Increase chunk warning threshold.
    chunkSizeWarningLimit: 1500,

    rollupOptions: {
      output: {
        // Separate Phaser into its own chunk for caching
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },

  // Static assets in /public/assets/ are served at /assets/ automatically
  // No additional config needed — Vite's default public dir is /public/

  server: {
    // Enable SharedArrayBuffer if needed for future audio worklets
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
```

### Known Vite + Phaser Issues and Solutions

#### 1. Pre-Bundling Failures

**Problem**: Vite's dependency pre-bundling (esbuild) can fail on Phaser's large, complex ESM entry point, producing cryptic errors like `Cannot read properties of undefined` during dev server startup.

**Solution**: Add `phaser` to `optimizeDeps.exclude`. This tells Vite to skip pre-bundling Phaser and serve it as a native ESM module. Alternatively, if that causes slow page loads in dev, try the opposite — force include:

```ts
optimizeDeps: {
  include: ['phaser'],  // Force esbuild to pre-bundle Phaser
}
```

Test both approaches. As of Phaser 3.80+, `exclude` is more commonly recommended.

#### 2. Asset Loading

**Problem**: Phaser loads assets via its own loader (`this.load.image(...)`) which makes HTTP requests. Assets must be in a location that Vite's dev server can serve.

**Solution**: Place all game assets in `/public/assets/`. Phaser's base URL should reference `/assets/`:

```ts
// In BootScene.ts
preload() {
  this.load.setBaseURL('/');
  this.load.image('kitty', 'assets/sprites/kitty.png');
  this.load.image('doggo', 'assets/sprites/doggo.png');
  // In Phase 1, we use geometric primitives — no asset loading needed
}
```

Vite serves `/public/` at the root URL. No special configuration needed.

#### 3. Production Build Size

**Problem**: Phaser 3 is ~1.5MB minified. Combined with Matter.js (bundled inside Phaser), the total JS payload is large.

**Solution**:

- Use `manualChunks` to split Phaser into its own cacheable chunk (see config above).
- Enable gzip/brotli compression in production deployment (1.5MB → ~350KB compressed).
- For Phase 2+, consider Phaser's custom build tool to exclude unused modules (e.g., Arcade Physics, 3D, Facebook Instant Games plugin).

#### 4. WASM / Web Workers

**Problem/Non-issue**: Phaser 3 does not use WASM or Web Workers by default. Matter.js is pure JavaScript. No WASM or worker exclusion configuration is needed.

If a future dependency uses WASM (e.g., a pathfinding library), Vite handles `.wasm` files natively — no plugin required.

#### 5. Hot Module Replacement (HMR)

**Problem**: Vite's HMR will re-execute modules on change. If the Phaser game is created at module scope, HMR creates duplicate game instances.

**Solution**: The `useEffect` cleanup pattern (Q6) handles this. When HMR triggers, React unmounts and remounts the PhaserGame component, which calls `game.destroy(true)` and creates a fresh instance.

### Rationale

- Vite is the recommended React bundler (as of 2024+, replacing CRA). Phaser 3.80+ ships with ESM support, making Vite a natural fit.
- The `optimizeDeps.exclude` / `manualChunks` pattern is widely documented in the Phaser community forums and the official Phaser Vite template.
- Asset serving via `/public/` is Vite's built-in convention — no plugins required.

### Alternatives Considered

| Alternative                                                   | Why Rejected                                                                                                                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Webpack (CRA or custom)**                                   | Slower dev server, more configuration, no native ESM. Vite is the modern standard.                                                                                                  |
| **Phaser's official Vite template** (`phaser3-vite-template`) | Good starting point but doesn't include React, Zustand, or TailwindCSS. We'd need to merge configs anyway. Better to build from scratch with a clear understanding of each setting. |
| **Import Phaser as a script tag (not bundled)**               | Loses tree-shaking, TypeScript integration, and HMR. Adds a global `Phaser` variable, which is fragile.                                                                             |

---

## Question 11: Can TailwindCSS coexist with Phaser without style conflicts?

### Decision

**Yes — no conflicts.** TailwindCSS and Phaser operate in completely separate rendering domains. TailwindCSS styles DOM elements; Phaser renders to a `<canvas>` element. Canvas pixel rendering is immune to CSS styles (no cascading, no inheritance, no class selectors).

### Explanation

```
TailwindCSS Domain:        Phaser Domain:
┌─────────────────┐        ┌─────────────────┐
│  DOM Elements   │        │  <canvas>       │
│  - <div>        │        │  - WebGL ctx    │
│  - <button>     │        │  - Pixel buffer │
│  - <span>       │        │  - No DOM nodes │
│  CSS classes     │        │  No CSS applies │
│  apply here     │        │  inside canvas  │
└─────────────────┘        └─────────────────┘
       ↓                          ↓
  Browser CSS Engine        Browser GPU Compositor
  (layout, paint)           (canvas rasterization)
```

### Potential Concerns (and Why They're Non-Issues)

#### 1. Tailwind's CSS Reset (`@tailwind base` / Preflight)

**Concern**: Tailwind's Preflight normalizes margins, paddings, borders, and box-sizing on all elements. Could this affect the Phaser `<canvas>` element?

**Answer**: Preflight does set `*, *::before, *::after { box-sizing: border-box; }` and resets margins. This applies to the `<canvas>` element as a DOM node (its outer box), but **not** to anything rendered inside the canvas. The canvas's internal rendering is a pixel buffer — CSS has zero effect on its content.

The only potential visual issue: Preflight sets `img, video, canvas { display: block; }`. This changes `<canvas>` from inline to block-level, which is actually **desirable** (removes the default inline baseline gap that can cause a few pixels of unexpected space below the canvas).

#### 2. Tailwind's Utility Classes on the Canvas Container

**Concern**: Could `overflow-hidden`, `position: relative`, or other utility classes on the container div interfere with Phaser?

**Answer**: These are applied to the wrapper `<div>`, not the canvas itself. They control layout behavior in the DOM, which is what we want (constraining the game to 1280×720, centering it, preventing overflow). Phaser operates independently within its canvas.

#### 3. Global Font/Color Styles

**Concern**: Tailwind sets `font-family`, `color`, and `line-height` on the `<body>`. Could this bleed into Phaser?

**Answer**: No. Phaser renders text using its own `Text` or `BitmapText` game objects, which draw directly to the canvas using Canvas 2D or WebGL text rendering. They do not inherit CSS `font-family` or `color` from the DOM. Phaser text styles are set explicitly in Phaser code:

```ts
this.add.text(100, 100, "Hello", { fontFamily: "Arial", fontSize: "24px", color: "#fff" });
```

#### 4. Tailwind v4 and `@tailwindcss/vite`

TailwindCSS v4 (latest as of 2025+) uses a Vite plugin instead of PostCSS. Configuration is done in CSS with `@theme` directives instead of `tailwind.config.js`. This is even cleaner — the Vite plugin injects styles at build time, and the output is standard CSS that only applies to DOM elements.

```css
/* src/index.css */
@import "tailwindcss";

/* Custom theme for game UI */
@theme {
  --color-hud-bg: oklch(0.2 0.02 250 / 0.8);
  --color-health-bar: oklch(0.65 0.25 145);
  --color-health-bar-low: oklch(0.55 0.25 25);
}
```

### Rationale

- The separation between CSS (DOM) and Canvas (WebGL/2D) is a fundamental browser architecture boundary. No CSS framework can affect canvas pixel rendering.
- Tailwind's reset (Preflight) is beneficial — it normalizes the canvas element's box model, preventing layout surprises.
- The only thing to be mindful of is that Tailwind utility classes should be applied to React overlay components, not to Phaser's internal elements. Since Phaser creates its own DOM elements only via `this.add.dom()` (which we're not using), there's no overlap.

### Conclusion

**No special configuration needed.** Just use TailwindCSS normally for React UI components and let Phaser render into its canvas. They are fully orthogonal.

---

## Summary of Decisions (React/Vite/Zustand Integration)

| #   | Question                                      | Decision                                                                                                                   | Confidence                                                                     |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 6   | Mounting/destroying Phaser in React           | `useRef` for container + `useEffect` with cleanup calling `game.destroy(true)`. Handles Strict Mode and HMR.               | **High** — standard community pattern, no edge cases                           |
| 7   | Phaser → Zustand → React data flow            | Direct `useGameStore.getState().setX()` calls from Phaser scenes. React reads via selectors.                               | **High** — simplest correct approach; full type safety; great devtools support |
| 8   | React overlays on top of Phaser               | CSS `position: absolute` + `z-index` layering in a shared `relative` container. `pointer-events-none` on HUD.              | **High** — standard DOM stacking; no portals needed                            |
| 9   | React → Phaser communication (upgrade choice) | Write to Zustand store from React; Phaser reads in `update()` loop (poll) or via `subscribe()`.                            | **High** — bidirectional Zustand bridge; no scene refs in React                |
| 10  | Vite config for Phaser                        | `optimizeDeps.exclude: ['phaser']`, `manualChunks` for code splitting, assets in `/public/`. No WASM/worker config needed. | **High** — well-documented pattern; Phaser 3.80+ ESM works with Vite           |
| 11  | TailwindCSS + Phaser conflicts                | No conflicts. CSS operates on DOM elements; Phaser renders to a canvas pixel buffer. Completely orthogonal.                | **High** — fundamental browser architecture guarantee                          |

---

## References

- [Matter.js Constraint docs](https://brm.io/matter-js/docs/classes/Constraint.html)
- [Phaser 3 Matter Constraint examples](https://phaser.io/examples/v3/category/physics/matterjs)
- [Phaser 3 Graphics API](https://newdocs.phaser.io/docs/3.80.0/Phaser.GameObjects.Graphics)
- [Matter.js performance tips (official)](https://github.com/liabru/matter-js/wiki/Tips)
- [Phaser 3 Official Vite Template](https://github.com/phaserjs/template-vite)
- [Zustand — Reading/writing state outside React](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)
- [Zustand — `subscribe` with selector](https://docs.pmnd.rs/zustand/recipes/recipes#subscribe-with-selector)
- [TailwindCSS v4 + Vite](https://tailwindcss.com/docs/installation/vite)
- [Phaser 3 `game.destroy()` docs](https://newdocs.phaser.io/docs/3.80.0/Phaser.Game#destroy)
- [React 18 Strict Mode double-effect behavior](https://react.dev/reference/react/StrictMode)

---

# Research: Enemy Spawning, Wave System, and Boss AI in Phaser 3 + Matter.js

**Date**: 2026-02-15
**Context**: Same project — Vampire Survivors / Survivor.io–style survival game. 1280×720 fixed arena, ≤50 simultaneous enemies at 60 FPS, Matter.js physics. Three enemy types: "The Bill" (slow swarm), "The Deadline" (fast rusher), "The Ex-Lover" (boss with projectile). Enemies spawn from screen edges and navigate toward the midpoint of two players. Waves every 30 s, boss every 2 min.

---

## Question 12: Object Pooling for Enemies in Phaser 3 + Matter.js

### Decision

Use a **custom pool class per enemy type** that pre-allocates enemy instances (game objects + Matter.js bodies) at scene creation, deactivates them with `setActive(false)` + `setVisible(false)` + `Matter.Body.set(body, { isSensor: true, isStatic: true })`, and reactivates on spawn. Do **not** use Phaser's built-in `Phaser.GameObjects.Group` pooling for Matter.js bodies — it was designed for Arcade Physics and has friction with Matter's body lifecycle.

### Implementation

```ts
// src/game/systems/EnemyPool.ts
import Phaser from "phaser";
import Matter from "matter-js";

interface PoolableEnemy extends Phaser.GameObjects.GameObject {
  body: MatterJS.BodyType;
  activate(x: number, y: number, config: EnemyConfig): void;
  deactivate(): void;
  enemyType: "bill" | "deadline" | "exlover";
}

export class EnemyPool<T extends PoolableEnemy> {
  private pool: T[] = [];
  private active: Set<T> = new Set();
  private factory: () => T;

  constructor(factory: () => T, preAllocate: number = 0) {
    this.factory = factory;
    // Pre-create instances at scene start to avoid GC spikes mid-game
    for (let i = 0; i < preAllocate; i++) {
      const enemy = this.factory();
      enemy.deactivate();
      this.pool.push(enemy);
    }
  }

  acquire(x: number, y: number, config: EnemyConfig): T {
    let enemy = this.pool.pop();
    if (!enemy) {
      enemy = this.factory();
    }
    enemy.activate(x, y, config);
    this.active.add(enemy);
    return enemy;
  }

  release(enemy: T): void {
    enemy.deactivate();
    this.active.delete(enemy);
    this.pool.push(enemy);
  }

  getActive(): ReadonlySet<T> {
    return this.active;
  }

  get activeCount(): number {
    return this.active.size;
  }
}
```

```ts
// Inside an Enemy class — activate/deactivate pattern
class EnemyBill extends Phaser.GameObjects.Rectangle {
  body!: MatterJS.BodyType;
  enemyType = "bill" as const;
  hp = 0;
  private damageCooldowns = new Map<string, number>(); // per-player cooldown

  activate(x: number, y: number, config: EnemyConfig): void {
    // Re-enable physics body
    Matter.Body.setStatic(this.body, false);
    Matter.Body.set(this.body, "isSensor", false);
    Matter.Body.setPosition(this.body, { x, y });
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });

    // Restore collision filter
    this.body.collisionFilter.mask = CATEGORY.PLAYER | CATEGORY.WALL;

    // Re-enable game object
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);

    // Reset stats from config (allows wave scaling)
    this.hp = config.hp;
    this.damageCooldowns.clear();
  }

  deactivate(): void {
    // Disable physics — make static + sensor so broadphase skips collision resolution
    Matter.Body.setStatic(this.body, true);
    Matter.Body.set(this.body, "isSensor", true);
    Matter.Body.setPosition(this.body, { x: -200, y: -200 }); // park off-screen
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });

    // Zero out collision mask so it participates in nothing
    this.body.collisionFilter.mask = 0x0000;

    // Disable game object
    this.setActive(false);
    this.setVisible(false);
  }
}
```

```ts
// Scene setup — pre-allocate pools
class GameScene extends Phaser.Scene {
  private billPool!: EnemyPool<EnemyBill>;
  private deadlinePool!: EnemyPool<EnemyDeadline>;
  private exLoverPool!: EnemyPool<EnemyExLover>;

  create() {
    // Pre-allocate "The Bill" — most common, need up to ~40
    this.billPool = new EnemyPool(
      () => this.createBillEnemy(),
      30, // pre-allocate 30 instances
    );

    // "The Deadline" — fewer, unlocked in later waves
    this.deadlinePool = new EnemyPool(() => this.createDeadlineEnemy(), 15);

    // "The Ex-Lover" — only 1 active max, but pool 2 for safety
    this.exLoverPool = new EnemyPool(() => this.createExLoverEnemy(), 2);
  }
}
```

### Why NOT `Phaser.GameObjects.Group` with `createMultiple`

Phaser's `Group` pool (`getFirstDead()`, `createMultiple`, `setActive/setVisible`) is designed for Arcade Physics where toggling `enableBody` / `disableBody` cleanly removes bodies from the physics simulation. With Matter.js:

- There is **no `disableBody()`** on Matter game objects. Phaser's Matter-wrapped game objects don't support the same body enable/disable API that Arcade objects do.
- Calling `this.matter.world.remove(body)` and re-adding it later works but triggers a full broadphase rebuild, which is expensive at high churn rates (enemies dying/spawning every few seconds).
- `Group.getFirstDead()` uses linear scan, which is fine for ≤50 objects but less efficient than a stack-based pool (`pool.pop()` is O(1)).

### Why `isStatic + isSensor + mask: 0` Instead of `world.remove()`

| Approach                                              | Cost                  | Broadphase Impact                                                                                  | Stability                                    |
| ----------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `world.remove(body)` + `world.add(body)`              | ~0.5ms per add/remove | Triggers broadphase rebuild                                                                        | Can cause 1-frame ghost collisions on re-add |
| `Body.setStatic(true)` + `isSensor: true` + `mask: 0` | ~0.01ms               | Body stays in broadphase but is skipped by narrowphase (mask=0 means no collision pairs generated) | Stable; no re-add timing issues              |
| Teleport to `(-200, -200)` off-screen                 | ~0.01ms               | Body stays in broadphase but grid cell is far from action                                          | Stable but wastes a broadphase slot          |

**Recommended combination**: `setStatic(true)` + `isSensor: true` + `mask: 0` + teleport off-screen. The mask=0 ensures zero collision pair generation; the teleport ensures no accidental broadphase overlap with active entities; the static flag prevents the solver from wasting cycles on velocity integration.

### Pre-Allocation Budget

| Enemy Type   | Max Active | Pre-Allocate | Rationale                                                                                                                     |
| ------------ | ---------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| The Bill     | ~35        | 30           | Most common; spawns in swarms. Pre-allocating 30 covers typical early-game peak. Late-game may dynamically allocate up to 35. |
| The Deadline | ~15        | 15           | Appears wave 2+. Fewer but faster turnover (low HP → die fast → respawn fast).                                                |
| The Ex-Lover | 1 (max)    | 2            | Only 1 active (FR-018). Pool 2 so one can deactivate while the new one activates, avoiding frame gaps.                        |
| **Total**    | **~50**    | **47**       | Within the 50-enemy budget (SC-005).                                                                                          |

### Rationale

- **GC avoidance**: Pre-allocation means zero `new` calls during gameplay. Matter.js body creation is particularly expensive (~0.3ms each with vertices and collision filter setup). Creating 50 bodies at scene start is a one-time ~15ms cost during the loading screen.
- **Predictable performance**: The pool size is bounded. If `acquire()` is called when the pool is empty AND active count is at cap, the spawn system skips the spawn (graceful degradation, not a crash).
- **Wave scaling**: `activate()` accepts a `config` parameter, allowing the wave system to pass scaled HP/speed values without creating new enemy instances.

### Alternatives Considered

| Alternative                                                          | Why Rejected                                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`Phaser.GameObjects.Group` with `createMultiple`**                 | Designed for Arcade Physics. `getFirstDead()` is a linear scan. No clean `disableBody()` for Matter.js.                                                                                                                                    |
| **Destroy and recreate enemies** (`enemy.destroy()` + `new Enemy()`) | Maximum GC pressure. Each destroy deallocates body vertices, game object, and textures. Each create re-allocates. At 50 enemies with ~5s average lifespan, this is ~10 allocations/second — enough to trigger GC pauses every few seconds. |
| **`world.remove()` / `world.add()`**                                 | Works but triggers broadphase rebuilds. At high churn rates (late-game swarm cycling), this adds measurable overhead. The static+sensor+mask approach avoids this entirely.                                                                |
| **Web Workers for pooling**                                          | Over-engineered. Pool operations are O(1) push/pop on a plain array. No concurrency needed.                                                                                                                                                |

---

## Question 13: Edge-Spawning Algorithm

### Decision

Use **weighted random perimeter sampling** with a **minimum distance** from both players and a **bias toward the midpoint's opposite side** to prevent enemies from clustering on one edge.

### Implementation

```ts
// src/game/systems/SpawnSystem.ts

const ARENA_W = 1280;
const ARENA_H = 720;
const SPAWN_MARGIN = 20; // spawn enemies slightly outside the visible area
const MIN_PLAYER_DIST = 120; // minimum spawn distance from any player (pixels)
const MAX_SPAWN_ATTEMPTS = 8; // retries before giving up (prevent infinite loops)

interface SpawnPoint {
  x: number;
  y: number;
}

/**
 * Generate a random spawn point on the screen perimeter.
 * Weighted to favor edges OPPOSITE to the midpoint of the two players,
 * so enemies approach from the direction players are NOT facing.
 */
function getSpawnPoint(playerA: { x: number; y: number }, playerB: { x: number; y: number }): SpawnPoint | null {
  const midX = (playerA.x + playerB.x) / 2;
  const midY = (playerA.y + playerB.y) / 2;

  for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
    const point = samplePerimeterPoint(midX, midY);

    // Enforce minimum distance from both players
    const distA = Math.hypot(point.x - playerA.x, point.y - playerB.y);
    const distB = Math.hypot(point.x - playerB.x, point.y - playerB.y);
    if (distA >= MIN_PLAYER_DIST && distB >= MIN_PLAYER_DIST) {
      return point;
    }
  }

  return null; // rare: skip this spawn cycle
}

/**
 * Sample a point on the screen perimeter with weighted edge selection.
 * Edges farther from the midpoint are more likely to be chosen.
 */
function samplePerimeterPoint(midX: number, midY: number): SpawnPoint {
  // Calculate distance from midpoint to each edge
  const distTop = midY; // distance from midpoint to top edge
  const distBottom = ARENA_H - midY; // to bottom
  const distLeft = midX; // to left
  const distRight = ARENA_W - midX; // to right

  // Weight = distance (farther edge → higher weight → more spawns from there)
  // This means if players are in the top-left, most enemies come from bottom-right
  const weights = [distTop, distBottom, distLeft, distRight];
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Weighted random edge selection
  let roll = Math.random() * totalWeight;
  let edge = 0; // 0=top, 1=bottom, 2=left, 3=right
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      edge = i;
      break;
    }
  }

  // Random position along the chosen edge
  switch (edge) {
    case 0: // top
      return { x: Math.random() * ARENA_W, y: -SPAWN_MARGIN };
    case 1: // bottom
      return { x: Math.random() * ARENA_W, y: ARENA_H + SPAWN_MARGIN };
    case 2: // left
      return { x: -SPAWN_MARGIN, y: Math.random() * ARENA_H };
    case 3: // right
      return { x: ARENA_W + SPAWN_MARGIN, y: Math.random() * ARENA_H };
    default:
      return { x: -SPAWN_MARGIN, y: Math.random() * ARENA_H };
  }
}
```

### Why Weighted (Not Uniform Random)

In Vampire Survivors, enemies surround the player from all directions. With a **fixed arena** (no scrolling), uniform random perimeter spawning has a problem: if both players huddle near one edge, enemies spawning on that same edge appear instantly next to them — unfair and un-dodgeable.

Weighting spawn probability by distance from the midpoint to each edge ensures:

- Enemies mostly approach from far away, giving players reaction time.
- No "safe corner" exploit — if players are in a corner, three edges (far ones) get high weight, enemies close in from three directions.
- Natural surround behavior — enemies fill in from all directions, but the farthest edges spawn more, creating wave-like approach patterns.

### Visual Example

```
Players near top-left corner:
┌───────────────────────────────┐
│ P1 P2          ← few spawns  │ top edge (close to players → low weight)
│                               │
│                               │ right edge (far → high weight ★)
│                               │
│   ← few spawns                │ left edge (close → low weight)
│                               │
│     ★★★ many spawns ★★★       │ bottom edge (far → high weight ★)
└───────────────────────────────┘

Result: enemies approach mainly from bottom and right — players see them coming.
```

### Boss Spawn Variation

The Ex-Lover boss should spawn with **dramatic intent**: always from the edge farthest from the midpoint, centered on that edge. This gives maximum screen time for the boss to approach, building tension:

```ts
function getBossSpawnPoint(midX: number, midY: number): SpawnPoint {
  const distTop = midY;
  const distBottom = ARENA_H - midY;
  const distLeft = midX;
  const distRight = ARENA_W - midX;

  const maxDist = Math.max(distTop, distBottom, distLeft, distRight);

  if (maxDist === distTop) return { x: ARENA_W / 2, y: -SPAWN_MARGIN };
  if (maxDist === distBottom) return { x: ARENA_W / 2, y: ARENA_H + SPAWN_MARGIN };
  if (maxDist === distLeft) return { x: -SPAWN_MARGIN, y: ARENA_H / 2 };
  /* distRight */ return { x: ARENA_W + SPAWN_MARGIN, y: ARENA_H / 2 };
}
```

### Rationale

- **Fairness**: Minimum distance check prevents "instant death" spawns on top of players (spec edge case: "enemy should not spawn inside the player's hitbox in a way that is un-dodgeable").
- **Gameplay feel**: Weighted spawning mimics the Vampire Survivors pattern where enemies visibly converge from the horizon. In a fixed arena, the "horizon" is the farthest screen edge.
- **Performance**: The algorithm is O(1) per spawn (random roll + switch statement). Even spawning 10 enemies per second costs negligible CPU.
- **Retry cap**: `MAX_SPAWN_ATTEMPTS = 8` prevents infinite loops if both players are near an edge. In practice, retries rarely exceed 2 (the perimeter is large relative to the exclusion zone).

### Alternatives Considered

| Alternative                                                                | Why Rejected                                                                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Uniform random perimeter** (no weighting)                                | Enemies spawn equally on all edges. If players are near an edge, enemies appear instantly in their face. Unfair.                    |
| **Pre-defined spawn points** (fixed grid on perimeter)                     | Predictable. Players learn the pattern and camp between spawn points. Survivors-style games use randomness to prevent memorization. |
| **Spawn at fixed intervals around the perimeter** (clock-like sweep)       | Creates a predictable wave pattern. Loses the chaotic "surrounded" feel that makes survivors games tense.                           |
| **Spawn from off-screen on all four edges simultaneously**                 | OK for a different style. But doesn't weight for fairness, and spawning from the near edge is still a problem.                      |
| **Quadrant-based spawning** (divide perimeter into quadrants, round-robin) | Guarantees distribution but is overly regular. Weighted random preserves randomness while biasing toward fair directions.           |

---

## Question 14: Enemy Pathfinding Toward a Point (Midpoint of Two Players)

### Decision

Use **simple steering behavior** (seek) — each frame, compute direction from enemy to target, then apply velocity in that direction. No A\* or navmesh needed. The arena is open (no obstacles), so straight-line movement is optimal.

### Implementation

```ts
// In Enemy.update() or CombatSystem.update():
function steerEnemyTowardTarget(enemy: MatterJS.BodyType, targetX: number, targetY: number, speed: number): void {
  const dx = targetX - enemy.position.x;
  const dy = targetY - enemy.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) return; // close enough, avoid division by zero

  // Normalize and scale to desired speed
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;

  Matter.Body.setVelocity(enemy, { x: vx, y: vy });
}
```

```ts
// In GameScene.update():
const midX = (playerA.x + playerB.x) / 2;
const midY = (playerA.y + playerB.y) / 2;

for (const enemy of this.activeEnemies) {
  if (!enemy.active) continue;

  // Different enemy types have different speeds
  const speed = ENEMY_SPEEDS[enemy.enemyType];
  steerEnemyTowardTarget(enemy.body, midX, midY, speed);
}
```

### Why `setVelocity` (Not `applyForce`)

| Approach                               | Behavior                                                                                   | Suitability                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `Matter.Body.setVelocity()`            | Instant velocity change. Enemy moves at exact desired speed. No acceleration/deceleration. | **Best for Survivors-style**: enemies are relentless, constant speed, no momentum. Simple and predictable.               |
| `Matter.Body.applyForce()`             | Gradual acceleration toward target. Enemy has momentum, can overshoot, slides.             | Better for realistic physics games. For survivors, the "sliding" feel is unwanted — enemies should home in like zombies. |
| `Matter.Body.setPosition()` (teleport) | Frame-by-frame position update. Bypasses physics entirely.                                 | Breaks collisions. Enemies would clip through each other and players. Avoid.                                             |

`setVelocity` gives the "mindless horde" feel where enemies march directly at the players without momentum or overshoot. This matches Vampire Survivors' enemy behavior exactly.

### Separation Force (Optional — Prevent Enemy Overlap)

Without enemy-enemy collision (we disabled it via collision filters for performance), enemies will stack on top of each other, especially near the target point. A lightweight **separation force** prevents this:

```ts
const SEPARATION_RADIUS = 24; // px — how close before they push apart
const SEPARATION_STRENGTH = 0.3; // how aggressively they separate (0–1)

function applySeparation(enemies: PoolableEnemy[]): void {
  const activeList = enemies.filter((e) => e.active);

  for (let i = 0; i < activeList.length; i++) {
    let sepX = 0,
      sepY = 0;
    const a = activeList[i].body;

    for (let j = i + 1; j < activeList.length; j++) {
      const b = activeList[j].body;
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const force = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS;
        sepX += (dx / dist) * force;
        sepY += (dy / dist) * force;
      }
    }

    if (sepX !== 0 || sepY !== 0) {
      const vel = a.velocity;
      Matter.Body.setVelocity(a, {
        x: vel.x + sepX * SEPARATION_STRENGTH,
        y: vel.y + sepY * SEPARATION_STRENGTH,
      });
    }
  }
}
```

**Performance note**: The naive O(n²) separation check for 50 enemies = 1,225 distance checks per frame. Each check is ~4 arithmetic ops → ~5,000 ops/frame. This is trivial at 60 FPS (well under 0.1ms). No spatial hashing needed at this scale.

### Why NOT A\* or NavMesh

- **Open arena**: There are zero obstacles. No walls, no barriers, no terrain variation. A\* solves "navigate around obstacles" — there is nothing to navigate around.
- **Moving target**: The midpoint shifts every frame as players move. A\* would need to recompute paths every frame for 50 enemies — massive overkill for straight-line movement.
- **Performance**: A\* on a grid for 50 agents at 60 FPS is feasible but unnecessary. Seek behavior is O(1) per enemy per frame.
- **Survivors convention**: Vampire Survivors, Brotato, Survivor.io, and HoloCure all use simple seek/chase behavior. Enemies beeline toward the player. The difficulty comes from numbers and speed, not from pathfinding complexity.

### Enemy Speed Values (Starting Tier)

| Enemy        | Speed (px/frame @60FPS) | Speed (px/s) | Character                                                               |
| ------------ | ----------------------- | ------------ | ----------------------------------------------------------------------- |
| The Bill     | 1.0                     | 60           | Slow, relentless swarm. Approaches like unpaid invoices — inevitable.   |
| The Deadline | 2.5                     | 150          | Fast rusher. Sprints in, dies fast.                                     |
| The Ex-Lover | 0.8                     | 48           | Slowest. Boss doesn't need speed — has projectiles. Menacing slow walk. |

These are base values; the wave system multiplies them (see Q16).

### Rationale

- **Simplicity**: The seek behavior is 6 lines of code. No libraries, no algorithms, no data structures. Easy to debug, easy to tune.
- **Correctness**: In an open arena with a single target point, seek IS the optimal path. There is mathematically no better route than a straight line.
- **Feel**: Constant-velocity seek creates the "zombie horde" visual where enemies file toward you from all directions. Combined with weighted edge spawning (Q13), this produces the signature Survivors-style surround pressure.
- **Separation**: The optional separation force is a cosmetic nicety. Without it, the game is still playable — enemies just stack into a single blob near the midpoint. With it, they spread into a visible crowd, which is more visually interesting and makes the clothesline mechanic more satisfying (sweeping through a spread-out horde).

### Alternatives Considered

| Alternative                    | Why Rejected                                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A\* pathfinding**            | No obstacles to path around. Massive overkill. 50 agents × path recompute per frame = unnecessary CPU.                                                                                                                                            |
| **NavMesh / flow field**       | Flow fields shine with hundreds of agents and static obstacles. With ≤50 agents and zero obstacles, the setup cost exceeds the benefit.                                                                                                           |
| **Flocking (boids)**           | Full boids (separation + alignment + cohesion) creates aesthetically beautiful swarm behavior but is NOT what survivors games do. Enemies should independently seek the target, not flock. Separation alone (as an optional layer) is sufficient. |
| **`applyForce` toward target** | Gives enemies momentum/inertia. They overshoot the midpoint, slide around, and feel "floaty." Survivors enemies should be sticky and relentless. `setVelocity` is snappier.                                                                       |

---

## Question 15: Contact Damage Cooldown Implementation

### Decision

Use a **per-enemy-per-player `Map<string, number>`** storing the timestamp of the last damage event. On collision, check if `currentTime - lastHitTime > COOLDOWN_MS`. This is simple, memory-efficient, and scales well.

### Implementation

```ts
// src/game/systems/CombatSystem.ts

const CONTACT_DAMAGE_COOLDOWN = 1000; // ms — ~1 second per spec (FR-019)

/**
 * Tracks cooldowns as: Map<"enemyId:playerId", lastHitTimestamp>
 * Using a composite string key avoids nested Maps.
 */
class ContactDamageTracker {
  private cooldowns = new Map<string, number>();

  private key(enemyId: number, playerId: string): string {
    return `${enemyId}:${playerId}`;
  }

  /**
   * Returns true if this enemy can damage this player right now.
   * If true, also records the hit (starts cooldown).
   */
  tryHit(enemyId: number, playerId: string, currentTime: number): boolean {
    const k = this.key(enemyId, playerId);
    const lastHit = this.cooldowns.get(k);

    if (lastHit !== undefined && currentTime - lastHit < CONTACT_DAMAGE_COOLDOWN) {
      return false; // still on cooldown
    }

    this.cooldowns.set(k, currentTime);
    return true;
  }

  /**
   * Remove all entries for a specific enemy (call when enemy dies/despawns).
   * Prevents the Map from growing unbounded.
   */
  clearEnemy(enemyId: number): void {
    // Iterate and delete matching keys
    for (const key of this.cooldowns.keys()) {
      if (key.startsWith(`${enemyId}:`)) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Periodic cleanup: remove expired entries.
   * Call every ~5 seconds to keep Map size bounded.
   */
  cleanup(currentTime: number): void {
    for (const [key, timestamp] of this.cooldowns) {
      if (currentTime - timestamp > CONTACT_DAMAGE_COOLDOWN * 2) {
        this.cooldowns.delete(key);
      }
    }
  }
}
```

```ts
// Integration with Matter.js collision events
class CombatSystem {
  private damageTracker = new ContactDamageTracker();
  private cleanupTimer = 0;

  update(time: number, delta: number): void {
    // Periodic cleanup every 5 seconds
    this.cleanupTimer += delta;
    if (this.cleanupTimer > 5000) {
      this.damageTracker.cleanup(time);
      this.cleanupTimer = 0;
    }
  }

  handleCollision(enemyBody: MatterJS.BodyType, playerBody: MatterJS.BodyType, currentTime: number): void {
    const enemyId = enemyBody.id; // Matter.js auto-assigns unique id
    const playerId = playerBody.label; // 'kitty' or 'doggo'

    if (this.damageTracker.tryHit(enemyId, playerId, currentTime)) {
      // Deal damage to shared health pool
      const damage = ENEMY_DAMAGE[enemyBody.label as EnemyType];
      useGameStore.getState().setHealth(useGameStore.getState().health - damage);

      // Visual feedback: flash player, brief invulnerability indicator
      this.flashPlayer(playerId);
    }
  }

  onEnemyDeath(enemyId: number): void {
    this.damageTracker.clearEnemy(enemyId);
  }
}
```

### Collision Detection Setup

```ts
// In GameScene.create() — register Matter.js collision handler
this.matter.world.on("collisionactive", (event: Phaser.Physics.Matter.Events.CollisionActiveEvent) => {
  for (const pair of event.pairs) {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;

    // Check if this is an enemy-player collision
    const enemyBody = this.getEnemyBody(bodyA, bodyB);
    const playerBody = this.getPlayerBody(bodyA, bodyB);

    if (enemyBody && playerBody) {
      this.combatSystem.handleCollision(enemyBody, playerBody, this.time.now);
    }
  }
});
```

**Key**: Use `collisionactive` (fires every frame bodies overlap), NOT `collisionstart` (fires once on first contact). Enemies walk into players and stay — `collisionactive` ensures the cooldown system is checked continuously while they overlap.

### Why Per-Enemy-Per-Player (Not Global Invulnerability)

The spec says "per-player cooldown" (FR-019: "cannot damage the **same player** again until the cooldown expires"). This means:

- Enemy A hits Kitty → Kitty has 1s cooldown **from Enemy A only**
- Enemy B can still hit Kitty immediately
- Enemy A can still hit Doggo immediately
- After 1s, Enemy A can hit Kitty again

This is the Vampire Survivors model. Global invulnerability (any hit → player invulnerable to ALL enemies for 1s) would make swarms trivial — you'd take max 1 hit/second regardless of 50 surrounding enemies. Per-enemy-per-player means more enemies = more damage pressure, which is the intended difficulty scaling.

### Memory Analysis

Worst case: 50 enemies × 2 players = 100 Map entries. Each entry is a string key (~12 chars = ~24 bytes) + a number (8 bytes) = ~32 bytes. Total: 100 × 32 = **3.2 KB**. Completely negligible.

### Rationale

- **Correctness**: Matches FR-019 exactly — per-player, per-enemy cooldown.
- **Performance**: `Map.get()` and `Map.set()` are O(1). No iteration during collision checks.
- **Simplicity**: One flat Map with composite keys. No nested data structures.
- **Cleanup**: `clearEnemy()` on death prevents stale entries; periodic `cleanup()` handles enemies that somehow weren't properly cleared.
- **`collisionactive` event**: Ensures the cooldown is checked every frame of overlap, not just on initial contact (enemies don't bounce off — they walk through/into players).

### Alternatives Considered

| Alternative                                                                                    | Why Rejected                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global i-frames** (player is fully invulnerable for 1s after ANY hit)                        | Trivializes swarm pressure. 50 enemies deal the same DPS as 1 enemy. Doesn't match Survivors-style damage model.                                                                              |
| **Collision category swap** (change player's collision mask during cooldown to ignore enemies) | Prevents ALL enemy collisions during cooldown. Can't do per-enemy — collision filters are on the body, not per-pair. Also breaks other enemy interactions (clothesline, knockback detection). |
| **Per-enemy cooldown only** (not per-player)                                                   | Enemy A hits Kitty → can't hit Kitty OR Doggo for 1s. Too generous. In a co-op game where both players might overlap with the same enemy, each player should take independent damage.         |
| **Store cooldown on the enemy object** (`enemy.lastHitKitty`, `enemy.lastHitDoggo`)            | Works for 2 players. But pollutes the enemy class with player-specific state. The Map approach is cleaner and would scale if more players were added.                                         |
| **Separate i-frame component per player** (e.g., `kitty.isInvulnerableTo(enemy)`)              | Same idea as the Map, but distributed across player objects instead of centralized. Harder to clean up when enemies die.                                                                      |

---

## Question 16: Wave Scaling Formula

### Decision

Use a **piecewise linear + step-function hybrid** inspired by Vampire Survivors' wave design. Spawn rate increases linearly within each 30-second wave. New enemy types unlock at fixed wave thresholds. Enemy stat multipliers scale sub-linearly (square root) to prevent exponential blowup.

### Formula

```ts
// src/game/systems/WaveSystem.ts

interface WaveConfig {
  waveNumber: number; // 1, 2, 3, ...
  spawnInterval: number; // ms between spawn batches
  batchSize: number; // enemies per batch
  enemyTypes: EnemyType[]; // which types can spawn this wave
  hpMultiplier: number; // applied to base enemy HP
  speedMultiplier: number; // applied to base enemy speed
  isBossWave: boolean; // whether to spawn Ex-Lover
}

function getWaveConfig(waveNumber: number, elapsedSeconds: number): WaveConfig {
  // --- Spawn Rate: linear increase ---
  // Wave 1: spawn every 2000ms, batch of 2 → 1 enemy/sec
  // Wave N: spawn every max(400, 2000 - (N-1)*200)ms, batch of min(6, 2 + floor(N/2))
  const spawnInterval = Math.max(400, 2000 - (waveNumber - 1) * 200);
  const batchSize = Math.min(6, 2 + Math.floor(waveNumber / 2));

  // --- Enemy Type Unlocks: step function ---
  const enemyTypes: EnemyType[] = ["bill"]; // always available
  if (waveNumber >= 2) enemyTypes.push("deadline"); // 60s+
  // Boss handled separately (every 2 min = every 4th wave)

  // --- Stat Scaling: sub-linear (square root) ---
  // HP increases gently: 1.0x → 1.41x → 1.73x → 2.0x → ...
  const hpMultiplier = Math.sqrt(waveNumber);
  // Speed increases very gently: 1.0x → 1.1x → 1.15x → 1.2x → ...
  const speedMultiplier = 1 + Math.log2(waveNumber) * 0.1;

  // --- Boss Wave: every 4th wave (= every 2 minutes) ---
  const isBossWave = waveNumber > 0 && waveNumber % 4 === 0;

  return {
    waveNumber,
    spawnInterval,
    batchSize,
    enemyTypes,
    hpMultiplier,
    speedMultiplier,
    isBossWave,
  };
}
```

### Wave Progression Table

| Wave | Time  | Spawn Interval | Batch Size | Types          | HP Mult | Speed Mult | Boss?        | Approx Enemies/Min |
| ---- | ----- | -------------- | ---------- | -------------- | ------- | ---------- | ------------ | ------------------ |
| 1    | 0:00  | 2000ms         | 2          | Bill           | 1.00×   | 1.00×      | No           | ~60                |
| 2    | 0:30  | 1800ms         | 3          | Bill, Deadline | 1.41×   | 1.10×      | No           | ~100               |
| 3    | 1:00  | 1600ms         | 3          | Bill, Deadline | 1.73×   | 1.16×      | No           | ~113               |
| 4    | 1:30  | 1400ms         | 4          | Bill, Deadline | 2.00×   | 1.20×      | **Ex-Lover** | ~171               |
| 5    | 2:00  | 1200ms         | 4          | Bill, Deadline | 2.24×   | 1.23×      | No           | ~200               |
| 6    | 2:30  | 1000ms         | 5          | Bill, Deadline | 2.45×   | 1.26×      | No           | ~300               |
| 7    | 3:00  | 800ms          | 5          | Bill, Deadline | 2.65×   | 1.28×      | No           | ~375               |
| 8    | 3:30  | 600ms          | 6          | Bill, Deadline | 2.83×   | 1.30×      | **Ex-Lover** | ~600               |
| 9    | 4:00  | 400ms          | 6          | Bill, Deadline | 3.00×   | 1.32×      | No           | ~900               |
| 10+  | 4:30+ | 400ms (floor)  | 6 (cap)    | Bill, Deadline | √N ×    | log₂ ×     | Every 4th    | ~900 (capped)      |

**Note**: Enemies/min is theoretical spawn rate. Active on-screen count is bounded by the 50-enemy cap — when the cap is reached, spawning pauses until enemies die.

### Active Enemy Cap

```ts
// In SpawnSystem.update():
const MAX_ACTIVE_ENEMIES = 50;

function trySpawnBatch(waveConfig: WaveConfig): void {
  const currentActive = billPool.activeCount + deadlinePool.activeCount + exLoverPool.activeCount;
  const slotsAvailable = MAX_ACTIVE_ENEMIES - currentActive;

  if (slotsAvailable <= 0) return; // cap reached, skip spawn

  const toSpawn = Math.min(waveConfig.batchSize, slotsAvailable);

  for (let i = 0; i < toSpawn; i++) {
    const type = pickWeightedEnemyType(waveConfig);
    const point = getSpawnPoint(playerA, playerB);
    if (!point) continue;

    const pool = type === "bill" ? billPool : deadlinePool;
    pool.acquire(point.x, point.y, {
      hp: BASE_HP[type] * waveConfig.hpMultiplier,
      speed: BASE_SPEED[type] * waveConfig.speedMultiplier,
    });
  }
}

function pickWeightedEnemyType(config: WaveConfig): EnemyType {
  if (config.enemyTypes.length === 1) return config.enemyTypes[0];

  // 70% Bill, 30% Deadline (when both available)
  // Bills are the bread-and-butter swarm; Deadlines are spice
  return Math.random() < 0.7 ? "bill" : "deadline";
}
```

### How Survivors Games Typically Scale Difficulty

Based on analysis of Vampire Survivors, HoloCure, Brotato, and Survivor.io:

| Mechanic               | Typical Pattern                                                                              | This Game's Approach                               |
| ---------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Spawn rate**         | Linear increase, with a hard floor (minimum interval)                                        | Linear decrease in interval (2000ms → 400ms floor) |
| **Batch size**         | Gradual increase, capped                                                                     | 2 → 6, capped at 6                                 |
| **Enemy HP**           | Sub-linear (√n or log) to avoid bullet-sponge feel                                           | √(waveNumber) — gentle scaling                     |
| **Enemy speed**        | Very gentle increase (~10–30% over entire run)                                               | 1 + 0.1 × log₂(wave) — caps around 1.3× by wave 10 |
| **New enemy types**    | Unlock at fixed time thresholds                                                              | Deadline at wave 2 (0:30), Boss at wave 4 (2:00)   |
| **Active cap**         | Hard limit on screen (Vampire Survivors famously has thousands, but uses aggressive culling) | 50 for performance (Matter.js constraint)          |
| **Kill → spawn cycle** | Enemies dying creates slots for new spawns, self-regulating                                  | Yes — cap check before spawn                       |
| **Boss timing**        | Fixed timer (e.g., every 5/10/15 minutes in VS, every 2 min here)                            | Every 4th wave (2-minute intervals)                |

### Why Sub-Linear HP Scaling (Not Linear or Exponential)

| Scaling             | Formula         | Wave 10 HP | Feel                                                                                        |
| ------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------- |
| **Linear**          | `1 + 0.5*(N-1)` | 5.5×       | Enemies become bullet sponges fast. Player DPS can't keep up. Frustrating.                  |
| **Exponential**     | `1.5^(N-1)`     | 38.4×      | Completely broken by wave 8. Game becomes impossible.                                       |
| **Sub-linear (√N)** | `√N`            | 3.16×      | Gentle curve. Enemies get tougher but player upgrades (via leveling) keep pace. Feels fair. |
| **Logarithmic**     | `1 + ln(N)`     | 3.30×      | Nearly identical to √N but flattens faster. Also viable.                                    |

**√N is recommended** because it produces a difficulty curve that "feels right" — noticeable wave-over-wave, but never overwhelming if the player is leveling up. This matches Vampire Survivors' design where the main pressure comes from **volume** (more enemies), not **individual toughness**.

### Rationale

- **Linear spawn rate + sub-linear stats**: The primary difficulty increase is MORE enemies, not individually harder enemies. This is the Survivors genre's core design — you feel powerful mowing down individuals, but overwhelmed by sheer numbers.
- **30-second wave cycle**: Matches spec (FR-012). Short enough that players feel progression quickly; long enough that each wave has a distinct "this is harder" moment.
- **400ms spawn floor**: At 6 enemies per 400ms = 15 enemies/second theoretical. With the 50-cap and enemies living ~2–5 seconds, actual on-screen count stabilizes around 40–50. This prevents the spawn rate from outpacing rendering.
- **Enemy type weighting (70/30)**: Bills are the "filler" — slow, numerous, easy to kill, satisfying to mow through. Deadlines are the "spice" — fast, dangerous, demanding attention. 70/30 keeps the swarm feel while adding variety.

### Alternatives Considered

| Alternative                                                 | Why Rejected                                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pure exponential scaling**                                | Breaks the game by wave 5–6. Exponential is never used in polished survivors games.                                                                        |
| **Flat difficulty per wave (table-driven)**                 | Maximum designer control but fragile — every wave is hand-tuned. Formula-driven with a table override for boss waves is more maintainable.                 |
| **Adaptive difficulty (scale based on player performance)** | Interesting but complex. Requires tracking player DPS, dodge rate, health trajectory. Out of scope for Phase 1. Could be a Phase 3 enhancement.            |
| **No cap, just spawn forever**                              | Without a cap, late-game would have 200+ active enemies. Matter.js broadphase would collapse. The 50-cap is a performance constraint, not a design choice. |

---

## Question 17: Boss State Machine for The Ex-Lover

### Decision

Use an **explicit finite state machine (FSM)** with 4 states: `SPAWN`, `CHASE`, `ATTACK`, and `COOLDOWN`. State transitions are timer-driven and position-driven. Implemented as a simple `switch` statement in the boss's `update()` — no state machine library needed.

### State Diagram

```
                    ┌─────────┐
                    │  SPAWN  │  (enter from edge, dramatic entrance)
                    └────┬────┘
                         │ reached arena interior (y > 50 or similar)
                         ▼
              ┌─────────────────────┐
         ┌───►│       CHASE         │◄────────────────┐
         │    │ (move toward mid-   │                  │
         │    │  point at slow speed)│                  │
         │    └──────────┬──────────┘                  │
         │               │ distance to midpoint < ATTACK_RANGE │
         │               │       OR attack timer elapsed       │
         │               ▼                                     │
         │    ┌──────────────────────┐                         │
         │    │       ATTACK         │                         │
         │    │ (stop, fire 3 Emo-   │                         │
         │    │  tional Baggage      │                         │
         │    │  projectiles)        │                         │
         │    └──────────┬───────────┘                         │
         │               │ all projectiles fired               │
         │               ▼                                     │
         │    ┌──────────────────────┐                         │
         │    │      COOLDOWN        │─────────────────────────┘
         │    │ (pause for 2s,       │    cooldown timer expired
         │    │  glow/telegraph      │
         │    │  before next cycle)  │
         │    └──────────────────────┘
         │
         │ (on taking clothesline hit OR heavy damage: brief stun
         │  → return to CHASE after stun wears off)
         └────────────────────────────────────────────────────
```

### Implementation

```ts
// src/game/entities/EnemyExLover.ts

type BossState = "SPAWN" | "CHASE" | "ATTACK" | "COOLDOWN";

const BOSS_CONFIG = {
  chaseSpeed: 0.8, // px/frame — slow, menacing
  attackRange: 300, // px — fires when this close to midpoint
  attackCycleTime: 4000, // ms — attacks every 4s even if not in range
  projectileCount: 3, // fires 3 projectiles per attack cycle
  projectileInterval: 300, // ms between each projectile in a burst
  cooldownDuration: 2000, // ms — pause after attack before chasing again
  stunDuration: 500, // ms — brief stun when hit by clothesline
  projectileSpeed: 3.0, // px/frame
  slowDebuffDuration: 3000, // ms — how long Emotional Baggage slows players
  slowDebuffMultiplier: 0.5, // speed × 0.5 = 50% slow
  hp: 500, // base HP (scaled by wave multiplier)
};

export class EnemyExLover {
  body!: MatterJS.BodyType;
  enemyType = "exlover" as const;

  private state: BossState = "SPAWN";
  private stateTimer = 0;
  private attackTimer = 0; // time since last attack cycle
  private projectilesFired = 0; // count within current attack burst
  private projectileBurstTimer = 0;
  hp: number;
  private isStunned = false;
  private stunTimer = 0;

  constructor(private scene: Phaser.Scene) {
    this.hp = BOSS_CONFIG.hp;
  }

  activate(x: number, y: number, config: EnemyConfig): void {
    this.hp = config.hp;
    this.state = "SPAWN";
    this.stateTimer = 0;
    this.attackTimer = 0;
    this.projectilesFired = 0;
    this.isStunned = false;
    // ... body activation (see Q12 pattern) ...
  }

  update(delta: number, midX: number, midY: number): void {
    // Handle stun (from clothesline)
    if (this.isStunned) {
      this.stunTimer -= delta;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.state = "CHASE";
      }
      return; // no action while stunned
    }

    this.stateTimer += delta;
    this.attackTimer += delta;

    switch (this.state) {
      case "SPAWN":
        this.handleSpawn(delta, midX, midY);
        break;
      case "CHASE":
        this.handleChase(delta, midX, midY);
        break;
      case "ATTACK":
        this.handleAttack(delta, midX, midY);
        break;
      case "COOLDOWN":
        this.handleCooldown(delta);
        break;
    }
  }

  private handleSpawn(delta: number, midX: number, midY: number): void {
    // Move inward from spawn edge toward arena center
    steerEnemyTowardTarget(this.body, midX, midY, BOSS_CONFIG.chaseSpeed * 0.5);

    // Transition: once fully inside the arena
    const pos = this.body.position;
    if (pos.x > 50 && pos.x < 1230 && pos.y > 50 && pos.y < 670) {
      this.transitionTo("CHASE");
    }
  }

  private handleChase(delta: number, midX: number, midY: number): void {
    steerEnemyTowardTarget(this.body, midX, midY, BOSS_CONFIG.chaseSpeed);

    const dist = Math.hypot(this.body.position.x - midX, this.body.position.y - midY);

    // Transition to ATTACK: in range OR attack timer elapsed
    if (dist < BOSS_CONFIG.attackRange || this.attackTimer >= BOSS_CONFIG.attackCycleTime) {
      this.transitionTo("ATTACK");
    }
  }

  private handleAttack(delta: number, midX: number, midY: number): void {
    // Stop moving during attack
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });

    this.projectileBurstTimer += delta;

    // Fire projectiles in a timed burst
    if (
      this.projectilesFired < BOSS_CONFIG.projectileCount &&
      this.projectileBurstTimer >= BOSS_CONFIG.projectileInterval
    ) {
      this.fireEmotionalBaggage(midX, midY);
      this.projectilesFired++;
      this.projectileBurstTimer = 0;
    }

    // All projectiles fired → go to cooldown
    if (this.projectilesFired >= BOSS_CONFIG.projectileCount) {
      this.transitionTo("COOLDOWN");
    }
  }

  private handleCooldown(delta: number): void {
    // Stand still, maybe pulse/glow as a telegraph
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });

    if (this.stateTimer >= BOSS_CONFIG.cooldownDuration) {
      this.transitionTo("CHASE");
    }
  }

  private transitionTo(newState: BossState): void {
    this.state = newState;
    this.stateTimer = 0;

    // State entry logic
    switch (newState) {
      case "CHASE":
        this.attackTimer = 0;
        break;
      case "ATTACK":
        this.projectilesFired = 0;
        this.projectileBurstTimer = BOSS_CONFIG.projectileInterval; // fire first one immediately
        break;
      case "COOLDOWN":
        break;
    }
  }

  private fireEmotionalBaggage(targetX: number, targetY: number): void {
    // Spread projectiles in a small fan (±15 degrees)
    const baseAngle = Math.atan2(targetY - this.body.position.y, targetX - this.body.position.x);

    const spreadAngle = (this.projectilesFired - 1) * 0.26; // ~15 degrees in radians
    const angle = baseAngle + spreadAngle;

    const vx = Math.cos(angle) * BOSS_CONFIG.projectileSpeed;
    const vy = Math.sin(angle) * BOSS_CONFIG.projectileSpeed;

    // Acquire projectile from projectile pool (similar pattern to enemy pool)
    this.scene.events.emit("boss-fire-projectile", {
      x: this.body.position.x,
      y: this.body.position.y,
      vx,
      vy,
      type: "emotional-baggage",
      slowDuration: BOSS_CONFIG.slowDebuffDuration,
      slowMultiplier: BOSS_CONFIG.slowDebuffMultiplier,
    });
  }

  applyClotheslineStun(): void {
    this.isStunned = true;
    this.stunTimer = BOSS_CONFIG.stunDuration;
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
  }
}
```

### Emotional Baggage Projectile

```ts
// src/game/entities/Projectile.ts (for boss projectile)

class EmotionalBaggageProjectile {
  body!: MatterJS.BodyType;

  activate(x: number, y: number, vx: number, vy: number): void {
    Matter.Body.setPosition(this.body, { x, y });
    Matter.Body.setVelocity(this.body, { x: vx, y: vy });
    Matter.Body.setStatic(this.body, false);
    this.body.isSensor = true; // sensor: detects overlap, no physical blocking
    this.body.collisionFilter.mask = CATEGORY.PLAYER; // only hits players
    this.setActive(true);
    this.setVisible(true);
  }

  update(): void {
    // Destroy if off-screen (flew past players)
    const pos = this.body.position;
    if (pos.x < -50 || pos.x > 1330 || pos.y < -50 || pos.y > 770) {
      this.pool.release(this);
    }
  }

  // On collision with player → apply slow debuff
  onPlayerHit(player: Player): void {
    player.applySlowDebuff(BOSS_CONFIG.slowDebuffDuration, BOSS_CONFIG.slowDebuffMultiplier);
    this.pool.release(this); // destroy on hit
  }
}
```

### Player Slow Debuff

```ts
// In Player.ts
class Player {
  private slowMultiplier = 1.0;
  private slowTimer = 0;
  private baseSpeed = 3.0;

  applySlowDebuff(duration: number, multiplier: number): void {
    this.slowMultiplier = multiplier;
    this.slowTimer = duration;
  }

  update(delta: number): void {
    // Tick down slow debuff
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1.0; // slow expired
      }
    }

    // Apply movement with slow factor
    const effectiveSpeed = this.baseSpeed * this.slowMultiplier;
    // ... apply input × effectiveSpeed ...
  }
}
```

### Why a Simple Switch-Based FSM (Not a Library)

| Approach                                      | Complexity                       | Suitability                                                                                                                                                                        |
| --------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`switch` on state enum**                    | ~80 lines                        | **Perfect** for 4 states. Easy to read, debug, and modify. No dependencies.                                                                                                        |
| **State pattern (class per state)**           | ~150 lines (4 classes + context) | Over-engineered for 4 states. Makes sense at 8+ states with complex transitions.                                                                                                   |
| **Behavior tree library** (`behaviortree.js`) | 200+ lines + dependency          | Designed for complex AI with conditional branching, sequences, parallels. The Ex-Lover has a simple linear cycle. Overkill.                                                        |
| **`xstate` (state machine library)**          | ~100 lines + 50KB dependency     | Type-safe, visualizer-friendly, handles edge cases well. Worth considering if the boss had 10+ states with complex guard conditions. For 4 states, the dependency isn't justified. |

### Boss Behavior Summary

| State         | Duration | Movement                             | Action                                                              | Transition                            |
| ------------- | -------- | ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------- |
| **SPAWN**     | ~1–3s    | Slow walk inward (50% chase speed)   | None                                                                | When fully inside arena bounds        |
| **CHASE**     | 2–4s     | Walk toward midpoint at 0.8 px/frame | None                                                                | When in attack range OR 4s elapsed    |
| **ATTACK**    | ~0.9s    | Stopped                              | Fire 3 Emotional Baggage projectiles (300ms apart) in a fan pattern | When all 3 fired                      |
| **COOLDOWN**  | 2s       | Stopped                              | Visual telegraph (glow/pulse)                                       | When 2s elapsed → return to CHASE     |
| **(Stunned)** | 0.5s     | Stopped                              | None (interrupt overlay on any state)                               | When stun wears off → return to CHASE |

### Rationale

- **Readable cycle**: CHASE → ATTACK → COOLDOWN → CHASE is a simple, predictable loop. Players learn the pattern and time their clothesline attacks during the COOLDOWN window (when the boss is stationary = easier target). This is genre-standard boss design.
- **Timer + range dual trigger**: The boss attacks on a 4-second cycle OR when close enough, whichever comes first. This prevents the degenerate case where players kite the boss at max range and it never attacks.
- **Fan-spread projectiles**: Three projectiles at ±15° makes dodging interesting — players need to move laterally to avoid the spread. A single projectile aimed at the midpoint would be trivially avoidable by splitting the pair.
- **Clothesline stun**: Rewards coordinated tether play. Players sweep the rope through the boss during cooldown for damage AND a stun, buying a few extra safe frames. This ties the boss fight to the game's core mechanic (Constitution Principle I: Tether-First Design).
- **No `world.remove()` for the boss**: The boss uses the same pool activate/deactivate pattern (Q12). When the boss dies, it's deactivated and returned to the pool. On the next 2-minute cycle, it's reactivated with scaled stats.

### Alternatives Considered

| Alternative                                                                   | Why Rejected                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No state machine — just timers** (fire every N seconds regardless of state) | Loses the dramatic rhythm. The boss would attack while moving, which is less interesting. The pause-and-fire pattern creates visible attack windows.                                                 |
| **Hierarchical state machine** (meta-states with sub-states)                  | The boss only has 4 states. Hierarchical FSMs are for complex AI with "modes" (e.g., patrolling, alerted, searching, combat, fleeing). Not needed here.                                              |
| **Component-based AI** (separate components for movement, attack, cooldown)   | Good architecture for a game with many different AI types. For 3 enemy types (2 of which are pure seek + contact damage), a full ECS-style AI system is over-designed.                               |
| **Phaser `Timeline` / `Chain`** (sequence of timed events)                    | Phaser's timeline is for cutscenes and scripted sequences. It can't handle dynamic transitions (e.g., "attack when in range OR after 4s"). The switch-based FSM handles conditional logic naturally. |

---

## Summary of Decisions (Enemy Spawning, Waves, Boss AI)

| #   | Question                               | Decision                                                                                                                                                                                   | Confidence                                                                                                                         |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 12  | Object pooling for enemies + Matter.js | Custom pool class per enemy type. Pre-allocate bodies. Deactivate with `setStatic + isSensor + mask:0 + teleport`. Do NOT use `Phaser.GameObjects.Group` or `world.remove()`.              | **High** — standard pattern for Matter.js game object reuse; avoids broadphase rebuild                                             |
| 13  | Edge-spawning algorithm                | Weighted random perimeter sampling. Edge weight = distance from midpoint (farther edges spawn more). Min 120px from players. Boss spawns from farthest edge, centered.                     | **High** — prevents "instant death" spawns; mimics Survivors-style surround pressure                                               |
| 14  | Enemy pathfinding toward midpoint      | Simple seek: `setVelocity` toward midpoint each frame. Optional lightweight separation force (O(n²) but trivial at n≤50). No A\* or navmesh.                                               | **High** — open arena with no obstacles; seek is mathematically optimal; matches genre convention                                  |
| 15  | Contact damage cooldown                | Per-enemy-per-player `Map<string, number>` with composite key `"enemyId:playerId"`. Check via `collisionactive` event. 1s cooldown. Cleanup on enemy death.                                | **High** — simple O(1) lookups; matches FR-019 exactly; bounded memory (~3KB worst case)                                           |
| 16  | Wave scaling formula                   | Spawn interval: linear decrease (2000ms → 400ms floor). Batch size: 2 → 6 (capped). HP: √(wave). Speed: 1 + 0.1×log₂(wave). Deadlines at wave 2. Boss every 4th wave. 50-enemy active cap. | **High** — sub-linear stat scaling prevents bullet-sponge feel; volume is the primary pressure; matches Survivors genre convention |
| 17  | Boss state machine (Ex-Lover)          | 4-state FSM: SPAWN → CHASE → ATTACK → COOLDOWN → loop. Switch-based, no library. 3-projectile fan spread. Clothesline stun interrupt. Timer + range dual attack trigger.                   | **High** — simple, readable, debuggable; attack windows reward tether coordination                                                 |

---

## References (Enemy Systems)

- [Vampire Survivors — Reverse-engineered wave data](https://vampire-survivors.fandom.com/wiki/Waves)
- [Matter.js `Body.setStatic` API](https://brm.io/matter-js/docs/classes/Body.html#method_setStatic)
- [Matter.js collision filtering](https://brm.io/matter-js/docs/classes/Body.html#property_collisionFilter)
- [Phaser 3 Matter collision events](https://newdocs.phaser.io/docs/3.80.0/Phaser.Physics.Matter.Events)
- [Craig Reynolds — Steering Behaviors for Autonomous Characters (1999)](https://www.red3d.com/cwr/steer/gdc99/)
- [Game Programming Patterns — State Pattern (Robert Nystrom)](https://gameprogrammingpatterns.com/state.html)
- [Object Pooling in Phaser 3 (Ourcade)](https://blog.ourcade.co/posts/2020/phaser3-object-pool-shader/)
