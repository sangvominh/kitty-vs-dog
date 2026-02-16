# Research: Custom Character & Monster Sprite System

**Feature**: 002-custom-character-sprites  
**Date**: 2026-02-15  
**Stack**: Phaser 3.90 · React 19 · Zustand 5 · Vite 7 · TypeScript 5.9 · Matter.js

---

## Topic 1: Phaser 3 Dynamic Texture Loading

### Context

The game currently generates textures from geometric primitives in `BootScene.create()` using `graphics.generateTexture(key, w, h)`. Custom sprite upload requires loading user-provided images as Phaser textures **at runtime** (after boot), then swapping them onto existing sprites.

### Best Approach: `scene.textures.addImage(key, htmlImageElement)`

Use the **synchronous `textures.addImage()`** method with an `HTMLImageElement` loaded from a Blob URL or data URL. This bypasses the Phaser Loader queue entirely, making it instant and suitable for runtime use.

```typescript
/**
 * Load an image blob as a Phaser texture at runtime.
 * Returns a promise that resolves with the texture key.
 */
function loadBlobAsTexture(scene: Phaser.Scene, key: string, blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      // Remove old texture if key already exists (for re-upload)
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
      scene.textures.addImage(key, img);
      URL.revokeObjectURL(url); // Clean up blob URL after GPU upload
      resolve(key);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image for texture: ${key}`));
    };
    img.src = url;
  });
}
```

### Swapping a Sprite's Texture

```typescript
// After texture is loaded as 'kitty-custom-lv2':
player.sprite.setTexture('kitty-custom-lv2');

// If the new texture has different dimensions, update display size:
player.sprite.setDisplaySize(48, 48);
```

**Gotchas with `setTexture()`:**

1. **Texture must exist first** — calling `setTexture('nonexistent')` silently falls back to `__DEFAULT` (a white square). Always verify with `scene.textures.exists(key)` before swapping.
2. **Physics body is not resized** — `setTexture()` only changes the visual. The Matter.js body (circle radius 16) stays the same. This is actually desirable: we want consistent hitboxes regardless of sprite art.
3. **Frame index resets** — if switching from a spritesheet to a single-frame texture, any active animation stops. Not an issue here since we use single-frame images.
4. **Origin resets** — `setTexture()` preserves the sprite's origin, but if textures have different dimensions, the visual offset may shift. Call `sprite.setOrigin(0.5, 0.5)` after swapping to re-center.

### Performance: 50+ Custom Textures

- Each texture occupies one WebGL texture slot on the GPU. Phaser batches draw calls per texture.
- **50 textures is trivially fine.** Phaser can handle hundreds of textures. The real limit is VRAM — at 128×128 RGBA, each texture is ~64KB. 50 textures = ~3.2MB VRAM. Well within budget.
- Phaser 3.90 uses a `WebGLTextureWrapper` that auto-manages slots. No manual `gl.bindTexture` needed.
- **Batch break concern**: If 50 different sprites all use different textures, each sprite causes a batch break (draw call). At 50 enemies with unique textures, this is still performant. Phaser's multi-texture pipeline binds up to `maxTextures` (usually 16) textures per batch.

### Alternative Considered: `scene.load.image()` + `scene.load.start()`

```typescript
// Alternative: Use Phaser's loader at runtime
scene.load.image('kitty-custom-lv1', blobUrl);
scene.load.once('complete', () => {
  player.sprite.setTexture('kitty-custom-lv1');
});
scene.load.start();
```

**Why rejected:**

- **Asynchronous and event-driven** — requires listening for loader events, adds complexity.
- **Loader queue conflicts** — if `load.start()` is called while another load is in progress, it can cause race conditions.
- **Blob URL lifecycle** — the loader doesn't revoke the blob URL, leading to memory leaks unless manually managed.
- **Overkill** — the Lloader pipeline (XHR, caching, retry logic) is unnecessary when we already have the image data in memory.

### Alternative Considered: `scene.textures.addBase64(key, base64String)`

```typescript
// Alternative: Load from base64 string
scene.textures.addBase64('kitty-lv1', 'data:image/png;base64,iVBOR...');
// This fires 'addtexture' event when done
```

**Why not primary:**

- Works, but base64 strings are ~33% larger than binary blobs.
- We'd store blobs in IndexedDB anyway, so converting to base64 is an unnecessary step.
- `addBase64()` is actually async internally (it creates an Image element), but doesn't return a Promise — harder to await.
- Could be useful as a **fallback** if blob URL handling has issues in specific browsers.

---

## Topic 2: Browser Image Storage for Persistence

### Context

User-uploaded sprite images must persist across browser sessions. The `public/` directory is static and cannot be written to at runtime. We need a client-side storage solution for image blobs.

### Best Approach: IndexedDB via `idb-keyval`

**IndexedDB** is the right storage for binary image data:

- **No size limit** (practical limit ~50% of free disk, typically hundreds of MB+).
- **Stores Blobs natively** — no base64 encoding overhead.
- **Async API** — doesn't block the main thread.

Use **`idb-keyval`** (< 1KB gzipped) as a minimal wrapper:

```bash
npm install idb-keyval
```

```typescript
import { get, set, del, keys } from 'idb-keyval';

// ── Storage Schema ──
// Key format: 'sprite:{entityId}:{levelIndex}'
// Value: Blob (image/png or image/jpeg)
// Metadata key: 'sprite-meta:{entityId}' → { count: number, mimeTypes: string[] }

interface SpriteMetadata {
  entityId: string; // 'kitty' | 'doggo' | 'enemy-bill' | etc.
  count: number; // Number of uploaded sprites
  mimeTypes: string[]; // MIME type per level index
  originalNames: string[]; // Original filenames for UI display
}

// ── Save a sprite image ──
async function saveSprite(entityId: string, levelIndex: number, file: File): Promise<void> {
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  await set(`sprite:${entityId}:${levelIndex}`, blob);

  // Update metadata
  const metaKey = `sprite-meta:${entityId}`;
  const meta: SpriteMetadata = (await get(metaKey)) ?? {
    entityId,
    count: 0,
    mimeTypes: [],
    originalNames: [],
  };
  meta.count = Math.max(meta.count, levelIndex + 1);
  meta.mimeTypes[levelIndex] = file.type;
  meta.originalNames[levelIndex] = file.name;
  await set(metaKey, meta);
}

// ── Load all sprites for an entity ──
async function loadSprites(entityId: string): Promise<Blob[]> {
  const meta: SpriteMetadata | undefined = await get(`sprite-meta:${entityId}`);
  if (!meta) return [];

  const blobs: Blob[] = [];
  for (let i = 0; i < meta.count; i++) {
    const blob = await get<Blob>(`sprite:${entityId}:${i}`);
    if (blob) blobs.push(blob);
  }
  return blobs;
}

// ── Delete all sprites for an entity ──
async function clearSprites(entityId: string): Promise<void> {
  const meta: SpriteMetadata | undefined = await get(`sprite-meta:${entityId}`);
  if (!meta) return;
  for (let i = 0; i < meta.count; i++) {
    await del(`sprite:${entityId}:${i}`);
  }
  await del(`sprite-meta:${entityId}`);
}
```

### Converting File → Blob URL → Phaser Texture

Full pipeline from upload to in-game texture:

```typescript
// 1. User selects file via <input type="file">
async function handleFileUpload(
  file: File,
  entityId: string,
  levelIndex: number,
  scene: Phaser.Scene,
): Promise<void> {
  // 2. Persist to IndexedDB
  await saveSprite(entityId, levelIndex, file);

  // 3. Create Blob URL and load into Phaser
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  const textureKey = `${entityId}-custom-${levelIndex}`;
  await loadBlobAsTexture(scene, textureKey, blob);
}
```

### Reconstructing Textures on Game Restart

```typescript
// Call this during BootScene.create() or a dedicated LoadCustomSpritesScene
async function restoreAllCustomTextures(scene: Phaser.Scene): Promise<void> {
  const entityIds = ['kitty', 'doggo', 'enemy-bill', 'enemy-deadline', 'enemy-ex-lover'];

  const loadPromises: Promise<void>[] = [];
  for (const entityId of entityIds) {
    const blobs = await loadSprites(entityId);
    blobs.forEach((blob, index) => {
      const textureKey = `${entityId}-custom-${index}`;
      loadPromises.push(loadBlobAsTexture(scene, textureKey, blob).then(() => {}));
    });
  }
  await Promise.all(loadPromises);
}
```

### Gotchas

1. **IndexedDB is async** — cannot be accessed synchronously in `BootScene.preload()`. Must use `async/await` in `create()` and delay scene transition until textures are loaded.
2. **Blob URL lifetime** — `URL.createObjectURL()` creates a memory reference. Must call `URL.revokeObjectURL()` after the image is loaded into the GPU (inside `img.onload`). Failing to revoke leaks memory.
3. **Serialization** — Blobs stored in IndexedDB survive across sessions. But `Blob` objects from `structuredClone()` or `postMessage()` may lose their type in some older browsers. Always store the MIME type separately in metadata.
4. **Storage eviction** — Browsers may evict IndexedDB data under storage pressure (Safari is aggressive). Use `navigator.storage.persist()` to request persistent storage:
   ```typescript
   if (navigator.storage?.persist) {
     const granted = await navigator.storage.persist();
     console.log('Persistent storage:', granted ? 'granted' : 'denied');
   }
   ```
5. **File type validation** — Always validate uploaded files are actual images before storing:
   ```typescript
   const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
   if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid image type');
   if (file.size > 2 * 1024 * 1024) throw new Error('Image must be under 2MB');
   ```

### Alternative Considered: localStorage with Base64

```typescript
// Alternative: Store as base64 in localStorage
const reader = new FileReader();
reader.onload = () => {
  localStorage.setItem('sprite-kitty-0', reader.result as string);
};
reader.readAsDataURL(file);
```

**Why rejected:**

- **5MB total limit** for `localStorage` — a few high-res images would exhaust this.
- **Base64 encoding inflates size by ~33%** — a 1MB PNG becomes ~1.33MB as base64.
- **Synchronous blocking API** — `localStorage.getItem()` blocks the main thread. Large base64 strings cause jank.
- **Strings only** — storing binary data as strings is wasteful.

### Alternative Considered: `localforage`

**Why not chosen over `idb-keyval`:**

- `localforage` (~8KB gzipped) includes fallback drivers for `localStorage` and `WebSQL`. We don't need fallbacks — IndexedDB is supported in all modern browsers.
- `idb-keyval` is simpler and smaller (~600 bytes gzipped).
- If we later need advanced queries (indexes, cursors), we'd upgrade to raw IndexedDB or `idb`, not `localforage`.

### Alternative Considered: Raw IndexedDB API

**Why not chosen:**

- Verbose callback/event-based API requires 30+ lines for a simple get/set.
- Error handling is cumbersome (transaction abort events, version conflicts).
- `idb-keyval` wraps this perfectly for our key-value use case. Raw API only needed for complex queries.

---

## Topic 3: Phaser 3 Particle Effects & Glow for Level-Up VFX

### Context

Level-up events (in `LevelUpSystem.ts`) need visual feedback: a burst effect on the event, and a persistent glow/border whose color evolves with level tiers.

### 3A: Burst Particle Effects (Phaser 3.60+ API)

**Important:** Phaser 3.60 completely changed the particle API. `scene.add.particles(x, y, textureKey, emitterConfig)` is the new approach. The old `ParticleEmitterManager` class is removed.

#### Best Approach: `scene.add.particles()` with one-shot emitter config

```typescript
function playLevelUpBurst(scene: Phaser.Scene, x: number, y: number, tierColor: number): void {
  // ── 1. Expanding Ring ──
  // Use a small white circle texture (generate once in BootScene)
  const ring = scene.add.particles(x, y, 'particle-white', {
    speed: { min: 80, max: 200 },
    angle: { min: 0, max: 360 }, // Full circle burst
    scale: { start: 0.6, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: 600,
    quantity: 24, // Burst count
    emitting: false, // Don't auto-emit; we explode manually
    tint: tierColor,
  });
  ring.explode(24); // One-shot burst
  scene.time.delayedCall(1000, () => ring.destroy());

  // ── 2. Sparkles ──
  const sparkles = scene.add.particles(x, y, 'particle-white', {
    speed: { min: 30, max: 120 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.3, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: 1200,
    quantity: 16,
    emitting: false,
    tint: [tierColor, 0xffffff, tierColor], // Alternating colors
    gravityY: -20, // Float upward
  });
  sparkles.explode(16);
  scene.time.delayedCall(1500, () => sparkles.destroy());

  // ── 3. Fire (for high tiers) ──
  const fire = scene.add.particles(x, y, 'particle-white', {
    speed: { min: 20, max: 60 },
    angle: { min: -100, max: -80 }, // Upward
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 800,
    frequency: 30, // Continuous emission
    tint: [0xff4400, 0xff8800, 0xffcc00],
    blendMode: Phaser.BlendModes.ADD,
  });
  // Stop emitting after 2 seconds, destroy after particles fade
  scene.time.delayedCall(2000, () => {
    fire.stop();
    scene.time.delayedCall(1000, () => fire.destroy());
  });
}
```

#### Generating the Particle Texture

Add to `BootScene.create()`:

```typescript
// Generate a small white circle for particles
const pg = this.add.graphics();
pg.fillStyle(0xffffff, 1);
pg.fillCircle(4, 4, 4);
pg.generateTexture('particle-white', 8, 8);
pg.destroy();
```

### 3B: Persistent Glow / Border Around Sprite

#### Best Approach: PostFX Glow (Phaser 3.90 supports this)

Phaser 3.60+ introduced PostFX pipelines. In Phaser 3.90, `sprite.postFX` is available when using WebGL renderer:

```typescript
function applyTierGlow(sprite: Phaser.GameObjects.Sprite, tierColor: number): void {
  // Clear existing PostFX
  sprite.postFX.clear();

  // Convert hex color to RGB components (0-1 range)
  const r = ((tierColor >> 16) & 0xff) / 255;
  const g = ((tierColor >> 8) & 0xff) / 255;
  const b = (tierColor & 0xff) / 255;

  // Add glow effect
  const glow = sprite.postFX.addGlow(tierColor, 4, 0, false, 0.1, 16);
  // Parameters: color, outerStrength, innerStrength, knockout, quality, distance

  // Pulsing animation
  sprite.scene.tweens.add({
    targets: glow,
    outerStrength: 8,
    yoyo: true,
    loop: -1,
    duration: 1000,
    ease: 'Sine.easeInOut',
  });
}
```

**Gotchas with PostFX:**

1. **WebGL only** — `postFX` is `undefined` in Canvas renderer. The game config uses `Phaser.AUTO` which prefers WebGL, but add a fallback check:
   ```typescript
   if (sprite.postFX) {
     sprite.postFX.addGlow(tierColor, 4);
   } else {
     // Fallback: use Graphics overlay
   }
   ```
2. **Performance** — Each PostFX glow runs a shader pass per frame. With 2 player sprites, this is negligible. With 50+ enemies all glowing, it would be expensive. **Only apply glow to player sprites**.
3. **`postFX.clear()` before re-adding** — calling `addGlow()` multiple times stacks effects. Always clear first.
4. **Tween targets the glow object** — the `addGlow()` return value has tweakable properties: `outerStrength`, `innerStrength`, `color`.

#### Alternative: Graphics Overlay (Fallback for Canvas)

```typescript
function drawGlowBorder(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number,
  alpha: number,
): void {
  graphics.clear();
  // Outer glow (multiple translucent circles)
  for (let i = 3; i >= 1; i--) {
    graphics.fillStyle(color, alpha * (0.3 / i));
    graphics.fillCircle(x, y, radius + i * 4);
  }
  // Inner border ring
  graphics.lineStyle(2, color, alpha);
  graphics.strokeCircle(x, y, radius + 2);
}
```

**Why not primary:** Requires manual redraw every frame in `update()`. Looks less polished than the shader-based PostFX glow. But works as a Canvas renderer fallback.

### 3C: Color Tier Progression

```typescript
// Tier thresholds and their colors
const TIER_CONFIG = [
  { minLevel: 1, color: 0x88ccff, name: 'blue' }, // Starter
  { minLevel: 3, color: 0xaa66ff, name: 'purple' }, // Intermediate
  { minLevel: 5, color: 0xffaa00, name: 'gold' }, // Advanced
  { minLevel: 8, color: 0xff4400, name: 'fire' }, // Elite
  { minLevel: 12, color: 0xff0066, name: 'legendary' }, // Legendary
] as const;

function getTierForLevel(level: number): (typeof TIER_CONFIG)[number] {
  // Find highest tier whose minLevel ≤ current level
  for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
    if (level >= TIER_CONFIG[i].minLevel) return TIER_CONFIG[i];
  }
  return TIER_CONFIG[0];
}

// Usage in LevelUpSystem after applying upgrade:
function onLevelUp(player: Player, newLevel: number): void {
  const tier = getTierForLevel(newLevel);

  // Update glow color
  applyTierGlow(player.sprite, tier.color);

  // Play burst effect
  playLevelUpBurst(player.scene, player.x, player.y, tier.color);
}
```

### Gotchas for Particles + VFX

1. **Particle depth** — particles default to the same depth as their creation point. Use `particles.setDepth(100)` to ensure they render above game sprites.
2. **Particle cleanup** — always destroy one-shot particle emitters after their lifespan. If not destroyed, they remain in the scene (invisible but consuming memory).
3. **`explode()` vs `emitting: true`** — `explode(count)` emits all particles at once (burst). Setting `emitting: true` is for continuous streams. For level-up, use `explode()` for the burst and a timed continuous emitter for the fire trail.
4. **`blendMode: ADD`** — makes fire/glow effects look luminous by adding pixel colors. Looks great on dark backgrounds (our `#1a1a2e` works perfectly). Avoid on light backgrounds.

---

## Topic 4: React Drag-and-Drop for Sprite Reordering

### Context

The customization UI needs a vertical list of uploaded sprite thumbnails that can be reordered via drag-and-drop. Each character/enemy has its own list.

### Best Approach: Native HTML5 Drag-and-Drop

For a simple vertical list reorder (5-15 items max), native DnD is sufficient and adds zero bundle size.

```tsx
import { useState, useCallback, type DragEvent } from 'react';

interface SpriteItem {
  id: string;
  thumbnailUrl: string;
  fileName: string;
}

function SpriteReorderList({
  items,
  onReorder,
}: {
  items: SpriteItem[];
  onReorder: (reordered: SpriteItem[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === dropIndex) return;

      const reordered = [...items];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      onReorder(reordered);
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, items, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 p-2 rounded border cursor-grab
            ${dragIndex === index ? 'opacity-30' : ''}
            ${overIndex === index && dragIndex !== index ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600'}
          `}
        >
          <span className="text-gray-400 text-sm w-6">Lv{index + 1}</span>
          <img
            src={item.thumbnailUrl}
            alt={item.fileName}
            className="w-10 h-10 object-contain rounded"
            draggable={false}
          />
          <span className="text-sm text-gray-200 truncate">{item.fileName}</span>
        </li>
      ))}
    </ul>
  );
}
```

### Gotchas

1. **Firefox requires `setData()`** — `e.dataTransfer.setData('text/plain', '')` must be called in `onDragStart` or Firefox won't initiate the drag.
2. **`e.preventDefault()` in `onDragOver`** — without this, the browser won't fire the `onDrop` event. This is the #1 most common DnD bug.
3. **Images inside draggable elements** — browsers natively try to drag `<img>` elements. Set `draggable={false}` on any `<img>` inside the draggable container.
4. **Touch devices** — HTML5 DnD does **not** work on mobile/touch. Since this is a desktop browser game, this is acceptable. If mobile support is needed later, add a touch polyfill or switch to a library.
5. **Drag ghost image** — the browser shows a semi-transparent copy of the dragged element. For custom drag preview, use `e.dataTransfer.setDragImage(element, offsetX, offsetY)`.

### Alternative Considered: `@dnd-kit/core`

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Why not chosen:**

- Adds ~15KB gzipped to the bundle for 3 packages.
- Overkill for a simple vertical list reorder of 5-15 items.
- Introduces its own abstraction layer (sensors, strategies, collision detection) that we don't need.
- **When it would be worth it**: If we needed sortable grids, multiple drop zones, keyboard accessibility for DnD, or complex drag constraints.

### Alternative Considered: `react-beautiful-dnd`

**Why rejected:**

- **Deprecated** — maintainers (Atlassian) stopped development. Not compatible with React 18+ strict mode, let alone React 19.
- Successor `@hello-pangea/dnd` is a fork that maintains compatibility, but still a heavier solution than native DnD for our use case.

### Alternative Considered: `@dnd-kit/core` with `@dnd-kit/sortable`

If native DnD proves too janky, this is the recommended upgrade path:

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Each item uses useSortable() hook for transform/transition
// DndContext wraps the list, SortableContext provides strategy
```

**Keep as fallback** if user testing reveals issues with native DnD smoothness.

---

## Topic 5: Vite + `public/` Directory & Runtime File Storage

### Context

The spec mentions "lưu ở thư mục local" (save to local directory). We need to clarify: can we write files to `public/` at runtime?

### Answer: No, `public/` Cannot Be Written to at Runtime

- Vite's `public/` directory is **static and read-only** at runtime. It's copied verbatim to the build output during `vite build`.
- The Vite dev server serves `public/` files directly but provides no write API.
- Even in development, writing to `public/` would require Node.js (`fs.writeFile`), which is not available in the browser.

### Best Approach: IndexedDB + Object URLs (No File System Needed)

The entire pipeline works without touching the file system:

```
User uploads file → File API → IndexedDB (persist) → Blob → URL.createObjectURL() → HTMLImageElement → scene.textures.addImage()
```

```typescript
// Complete integration: React upload → IndexedDB → Phaser texture
async function uploadAndRegisterSprite(
  file: File,
  entityId: string,
  levelIndex: number,
  scene: Phaser.Scene,
): Promise<string> {
  // 1. Validate
  if (!file.type.startsWith('image/')) throw new Error('Not an image');
  if (file.size > 2 * 1024 * 1024) throw new Error('Max 2MB');

  // 2. Store in IndexedDB for persistence
  await saveSprite(entityId, levelIndex, file);

  // 3. Load into Phaser as a texture
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  const textureKey = `${entityId}-custom-${levelIndex}`;
  await loadBlobAsTexture(scene, textureKey, blob);

  return textureKey;
}
```

### Does `URL.createObjectURL()` Work with Phaser's Texture System?

**Yes.** Blob URLs (`blob:http://localhost:5173/...`) are valid `src` values for `HTMLImageElement`. The flow:

```
URL.createObjectURL(blob)  →  img.src = blobUrl  →  img.onload fires  →  scene.textures.addImage(key, img)
```

This works because:

1. `URL.createObjectURL()` creates a temporary URL pointing to in-memory data.
2. The browser's image decoder handles it like any URL.
3. `scene.textures.addImage()` accepts any `HTMLImageElement` — it uploads the pixel data to a WebGL texture. The source URL is irrelevant after upload.
4. After `img.onload`, we call `URL.revokeObjectURL()` to free the blob reference. The WebGL texture is already on the GPU.

### What About `scene.textures.addBase64()`?

```typescript
// Convert Blob to base64, then load
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Usage:
const base64 = await blobToBase64(blob);
scene.textures.addBase64('kitty-lv1', base64);
// Note: addBase64 is async but doesn't return a Promise!
// Listen for the event instead:
scene.textures.once('addtexture', (key: string) => {
  console.log(`Texture ${key} ready`);
});
```

**This works** but is inferior to the Blob URL approach:

- Creates a 33% larger string in memory (base64 overhead).
- `addBase64()` doesn't return a Promise — must listen for `'addtexture'` event, which is error-prone (no error event for decode failures in some Phaser versions).
- The Blob URL → `addImage()` approach is more direct and controllable.

### Gotchas

1. **`URL.createObjectURL()` memory leaks** — every call allocates memory. Must revoke after use. In our pattern, revoke inside `img.onload` after `textures.addImage()`.
2. **Cross-origin issues** — not applicable here since blob URLs are same-origin by definition.
3. **Service Worker caching** — blob URLs cannot be cached by service workers. Not an issue — we reconstruct from IndexedDB on each page load.
4. **Phaser texture key uniqueness** — if the same key is used twice, `textures.addImage()` will warn. Always call `textures.remove(key)` before re-adding:
   ```typescript
   if (scene.textures.exists(key)) {
     scene.textures.remove(key);
   }
   ```

### Git Ignore Consideration

Since images are stored in IndexedDB (browser storage), not in the file system, there's **nothing to `.gitignore`**. The spec's mention of "ignore khỏi git" is naturally satisfied — no uploaded files ever touch the repository.

---

## Summary: Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT UI LAYER                           │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  <input file>    │───▶│  Zustand spriteStore              │   │
│  │  Upload + Validate│    │  - sprites per entity            │   │
│  └──────────────────┘    │  - thumbnail URLs                │   │
│                          │  - reorder / delete actions       │   │
│  ┌──────────────────┐    └──────────┬───────────────────────┘   │
│  │  SpriteReorderList│               │                          │
│  │  (native DnD)    │◀──────────────┘                          │
│  └──────────────────┘                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   IndexedDB     │
                    │   (idb-keyval)  │
                    │   Blob storage  │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │     PHASER TEXTURE LAYER     │
              │                              │
              │  Blob → ObjectURL → Image    │
              │  → textures.addImage(key)    │
              │                              │
              │  On level-up:                │
              │  sprite.setTexture(nextKey)  │
              │  + PostFX glow (tier color)  │
              │  + Particle burst            │
              └──────────────────────────────┘
```

### Key Dependencies to Add

| Package      | Size (gzip) | Purpose                                             |
| ------------ | ----------- | --------------------------------------------------- |
| `idb-keyval` | ~600B       | IndexedDB key-value wrapper for sprite blob storage |

No other new dependencies needed. Native HTML5 DnD, Phaser built-in PostFX, and Phaser built-in particles cover all requirements.

### Key Decisions

| Decision               | Choice                                | Rationale                                                 |
| ---------------------- | ------------------------------------- | --------------------------------------------------------- |
| Texture loading method | `textures.addImage()` with Blob URL   | Synchronous after image decode, no loader queue conflicts |
| Image persistence      | IndexedDB via `idb-keyval`            | Native blob storage, no size limits, tiny library         |
| Glow effect            | `sprite.postFX.addGlow()`             | Built into Phaser 3.90, GPU-accelerated, tweakable        |
| Particle effects       | `scene.add.particles()` + `explode()` | Phaser 3.60+ API, one-shot bursts, auto-cleanup           |
| Drag-and-drop          | Native HTML5 DnD                      | Zero dependencies, sufficient for vertical list reorder   |
| File storage location  | Browser IndexedDB (not filesystem)    | Nothing to gitignore, works in all deployment scenarios   |
