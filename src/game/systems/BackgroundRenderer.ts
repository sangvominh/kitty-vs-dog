/**
 * BackgroundRenderer — draws preset or custom backgrounds in the GameScene.
 * Each preset is a procedural generator. Custom backgrounds use an uploaded image.
 *
 * All elements are placed at depth <= -90 so gameplay renders above.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import type { BackgroundId } from '../state/backgroundStore';
import { useBackgroundStore } from '../state/backgroundStore';
import { loadBlobAsTexture } from '../scenes/BootScene';

const DEPTH_BASE = -100;

export class BackgroundRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Render the currently selected background.
   * Called once in GameScene.create().
   */
  async render(): Promise<void> {
    const store = useBackgroundStore.getState();
    const bgId = store.selectedBg;

    switch (bgId) {
      case 'night-sky':
        this.drawNightSky();
        break;
      case 'sunset-city':
        this.drawSunsetCity();
        break;
      case 'sakura':
        this.drawSakura();
        break;
      case 'neon-grid':
        this.drawNeonGrid();
        break;
      case 'deep-ocean':
        this.drawDeepOcean();
        break;
      case 'custom':
        await this.drawCustom();
        break;
      default:
        this.drawNightSky();
    }

    // Always add vignette on top of background
    this.drawVignette();
  }

  // ── Night Sky (original) ──────────────────────────────────────────
  private drawNightSky(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Gradient sky
    this.drawGradient('__bg_night_grad', [
      { stop: 0, color: '#0b0e2a' },
      { stop: 0.35, color: '#151040' },
      { stop: 0.65, color: '#1a0a3e' },
      { stop: 1, color: '#0d0d1a' },
    ]);

    // Nebula wisps
    const nebulaGfx = this.scene.add
      .graphics()
      .setDepth(DEPTH_BASE + 1)
      .setAlpha(0.12);
    const nebulaColors = [0x6c3483, 0x2e86c1, 0xd4a8ff, 0xff69b4];
    for (let i = 0; i < 6; i++) {
      const nx = Phaser.Math.Between(w * 0.1, w * 0.9);
      const ny = Phaser.Math.Between(h * 0.1, h * 0.9);
      const nr = Phaser.Math.Between(80, 200);
      nebulaGfx.fillStyle(Phaser.Utils.Array.GetRandom(nebulaColors), 0.3 + Math.random() * 0.3);
      nebulaGfx.fillCircle(nx, ny, nr);
    }

    // Stars
    this.drawStars(120, [0xffffff, 0xc8d6e5, 0xdff9fb, 0xffeaa7, 0xf8c8dc]);
    this.drawGlowStars(8);

    // Floating particles
    this.addFloatingParticles([0xffffff, 0xd4a8ff, 0xff69b4, 0x74b9ff]);
  }

  // ── Sunset City ───────────────────────────────────────────────────
  private drawSunsetCity(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Warm gradient
    this.drawGradient('__bg_sunset_grad', [
      { stop: 0, color: '#1a0533' },
      { stop: 0.2, color: '#4a1942' },
      { stop: 0.45, color: '#c0392b' },
      { stop: 0.6, color: '#e67e22' },
      { stop: 0.75, color: '#f39c12' },
      { stop: 1, color: '#1a1a2e' },
    ]);

    // Sun glow
    const sunGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 1);
    sunGfx.fillStyle(0xf39c12, 0.15);
    sunGfx.fillCircle(w * 0.5, h * 0.55, 200);
    sunGfx.fillStyle(0xf39c12, 0.3);
    sunGfx.fillCircle(w * 0.5, h * 0.55, 100);
    sunGfx.fillStyle(0xffeaa7, 0.8);
    sunGfx.fillCircle(w * 0.5, h * 0.55, 40);

    // City silhouette
    const cityGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 2);
    cityGfx.fillStyle(0x0a0a1a, 0.85);
    const buildings = [
      { x: 0, bw: 60, bh: 120 },
      { x: 70, bw: 45, bh: 180 },
      { x: 130, bw: 70, bh: 140 },
      { x: 210, bw: 50, bh: 200 },
      { x: 270, bw: 80, bh: 160 },
      { x: 370, bw: 40, bh: 220 },
      { x: 420, bw: 90, bh: 130 },
      { x: 530, bw: 55, bh: 190 },
      { x: 600, bw: 70, bh: 250 },
      { x: 680, bw: 60, bh: 170 },
      { x: 750, bw: 85, bh: 210 },
      { x: 850, bw: 50, bh: 150 },
      { x: 910, bw: 75, bh: 230 },
      { x: 1000, bw: 60, bh: 180 },
      { x: 1070, bw: 80, bh: 200 },
      { x: 1160, bw: 55, bh: 160 },
      { x: 1220, bw: 70, bh: 190 },
    ];
    for (const b of buildings) {
      cityGfx.fillRect(b.x, h - b.bh, b.bw, b.bh);
      // Windows
      cityGfx.fillStyle(0xffeaa7, 0.3);
      for (let wy = h - b.bh + 15; wy < h - 10; wy += 20) {
        for (let wx = b.x + 8; wx < b.x + b.bw - 8; wx += 15) {
          if (Math.random() > 0.4) {
            cityGfx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      cityGfx.fillStyle(0x0a0a1a, 0.85);
    }

    // Fewer stars (sunset sky)
    this.drawStars(40, [0xffffff, 0xffeaa7]);

    // Warm particles
    this.addFloatingParticles([0xf39c12, 0xe67e22, 0xffeaa7, 0xff6b6b]);
  }

  // ── Sakura (Cherry Blossom) ───────────────────────────────────────
  private drawSakura(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Soft pink gradient
    this.drawGradient('__bg_sakura_grad', [
      { stop: 0, color: '#1a0a1e' },
      { stop: 0.3, color: '#2d132c' },
      { stop: 0.6, color: '#3d1f3d' },
      { stop: 1, color: '#1a0a1e' },
    ]);

    // Large soft blossoms (bokeh effect)
    const blossomGfx = this.scene.add
      .graphics()
      .setDepth(DEPTH_BASE + 1)
      .setAlpha(0.15);
    const pinkShades = [0xff69b4, 0xffb6c1, 0xf8c8dc, 0xff1493];
    for (let i = 0; i < 10; i++) {
      const bx = Phaser.Math.Between(0, w);
      const by = Phaser.Math.Between(0, h);
      const br = Phaser.Math.Between(40, 120);
      blossomGfx.fillStyle(Phaser.Utils.Array.GetRandom(pinkShades), 0.3 + Math.random() * 0.4);
      blossomGfx.fillCircle(bx, by, br);
    }

    // Branch silhouettes
    const branchGfx = this.scene.add
      .graphics()
      .setDepth(DEPTH_BASE + 2)
      .setAlpha(0.3);
    branchGfx.lineStyle(3, 0x4a2040, 1);
    // Left branch
    branchGfx.beginPath();
    branchGfx.moveTo(-20, 80);
    branchGfx.lineTo(200, 120);
    branchGfx.lineTo(350, 100);
    branchGfx.lineTo(400, 130);
    branchGfx.strokePath();
    // Right branch
    branchGfx.beginPath();
    branchGfx.moveTo(w + 20, 60);
    branchGfx.lineTo(w - 180, 90);
    branchGfx.lineTo(w - 300, 70);
    branchGfx.strokePath();

    // Petals
    this.drawStars(80, pinkShades);

    // Falling petal particles
    this.addFallingParticles([0xff69b4, 0xffb6c1, 0xf8c8dc, 0xffc0cb]);
  }

  // ── Neon Grid (80s retrowave) ─────────────────────────────────────
  private drawNeonGrid(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Dark purple gradient
    this.drawGradient('__bg_neon_grad', [
      { stop: 0, color: '#0a0015' },
      { stop: 0.4, color: '#150030' },
      { stop: 0.7, color: '#1a0040' },
      { stop: 1, color: '#0a0015' },
    ]);

    // Perspective grid lines
    const gridGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 1);

    // Horizontal lines (perspective — denser at bottom)
    const horizonY = h * 0.45;
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const y = horizonY + (h - horizonY) * (t * t); // quadratic for perspective
      const alpha = 0.05 + t * 0.2;
      gridGfx.lineStyle(1, 0x9b59b6, alpha);
      gridGfx.lineBetween(0, y, w, y);
    }

    // Vertical lines (converge to center horizon)
    for (let i = -10; i <= 10; i++) {
      const topX = w / 2 + i * 20;
      const bottomX = w / 2 + i * (w / 10);
      const alpha = 0.1 + (1 - Math.abs(i) / 10) * 0.15;
      gridGfx.lineStyle(1, 0x8e44ad, alpha);
      gridGfx.lineBetween(topX, horizonY, Phaser.Math.Clamp(bottomX, -50, w + 50), h);
    }

    // Neon sun
    const sunGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 2);
    sunGfx.fillStyle(0xff00ff, 0.1);
    sunGfx.fillCircle(w / 2, horizonY, 160);
    sunGfx.fillStyle(0xff00ff, 0.2);
    sunGfx.fillCircle(w / 2, horizonY, 100);
    sunGfx.fillStyle(0xff6ec7, 0.5);
    sunGfx.fillCircle(w / 2, horizonY, 50);

    // Horizon glow line
    gridGfx.lineStyle(2, 0xff00ff, 0.4);
    gridGfx.lineBetween(0, horizonY, w, horizonY);

    // Stars above horizon
    const starGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 1);
    for (let i = 0; i < 60; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, horizonY);
      const sr = 0.5 + Math.random() * 1.2;
      starGfx.fillStyle(0xffffff, 0.2 + Math.random() * 0.5);
      starGfx.fillCircle(sx, sy, sr);
    }

    // Neon particles
    this.addFloatingParticles([0xff00ff, 0x00ffff, 0x9b59b6, 0xff6ec7]);
  }

  // ── Deep Ocean ────────────────────────────────────────────────────
  private drawDeepOcean(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // Ocean gradient
    this.drawGradient('__bg_ocean_grad', [
      { stop: 0, color: '#001030' },
      { stop: 0.3, color: '#001845' },
      { stop: 0.6, color: '#002060' },
      { stop: 1, color: '#000a20' },
    ]);

    // Light rays from above
    const rayGfx = this.scene.add
      .graphics()
      .setDepth(DEPTH_BASE + 1)
      .setAlpha(0.06);
    for (let i = 0; i < 5; i++) {
      const rx = Phaser.Math.Between(w * 0.1, w * 0.9);
      const rw = Phaser.Math.Between(40, 100);
      rayGfx.fillStyle(0x74b9ff, 1);
      rayGfx.fillTriangle(rx, 0, rx - rw, h, rx + rw, h);
    }

    // Bubbles
    const bubbleGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 2);
    for (let i = 0; i < 30; i++) {
      const bx = Phaser.Math.Between(0, w);
      const by = Phaser.Math.Between(0, h);
      const br = 2 + Math.random() * 6;
      bubbleGfx.lineStyle(1, 0x74b9ff, 0.15 + Math.random() * 0.2);
      bubbleGfx.strokeCircle(bx, by, br);
      bubbleGfx.fillStyle(0x74b9ff, 0.03);
      bubbleGfx.fillCircle(bx, by, br);
    }

    // Seaweed silhouettes
    const seaweedGfx = this.scene.add
      .graphics()
      .setDepth(DEPTH_BASE + 2)
      .setAlpha(0.15);
    const seaweedColors = [0x00b894, 0x00cec9, 0x006266];
    for (let i = 0; i < 8; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sheight = Phaser.Math.Between(60, 160);
      seaweedGfx.fillStyle(Phaser.Utils.Array.GetRandom(seaweedColors), 1);
      // Simple tapered rectangle
      seaweedGfx.fillRect(sx, h - sheight, 6 + Math.random() * 8, sheight);
    }

    // Floor sand
    const floorGfx = this.scene.add
      .graphics()
      .setDepth(DEPTH_BASE + 1)
      .setAlpha(0.08);
    floorGfx.fillStyle(0xdfe6e9, 1);
    floorGfx.fillRect(0, h - 40, w, 40);

    // Rising bubble particles
    this.addRisingParticles([0x74b9ff, 0x00cec9, 0xdfe6e9, 0x0984e3]);
  }

  // ── Custom background ─────────────────────────────────────────────
  private async drawCustom(): Promise<void> {
    const store = useBackgroundStore.getState();
    const texKey = store.customTextureKey;

    // Try loading if not yet loaded
    if (!this.scene.textures.exists(texKey)) {
      const blob = await store.getCustomBlob();
      if (blob) {
        try {
          await loadBlobAsTexture(this.scene, texKey, blob);
        } catch (err) {
          console.warn('[BackgroundRenderer] Failed to load custom bg:', err);
          // Fallback to night sky
          this.drawNightSky();
          return;
        }
      } else {
        // No blob, fallback
        this.drawNightSky();
        return;
      }
    }

    const img = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, texKey);
    img.setDepth(DEPTH_BASE);

    // Scale to cover the entire game area
    const scaleX = GAME_WIDTH / img.width;
    const scaleY = GAME_HEIGHT / img.height;
    const scale = Math.max(scaleX, scaleY);
    img.setScale(scale);

    // Slight dimming overlay so gameplay elements pop
    const dimGfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 1);
    dimGfx.fillStyle(0x000000, 0.3);
    dimGfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  // ── Shared helpers ────────────────────────────────────────────────

  private drawGradient(key: string, stops: { stop: number; color: string }[]): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    if (!this.scene.textures.exists(key)) {
      const canvas = this.scene.textures.createCanvas(key, w, h)!;
      const ctx = canvas.context;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      for (const s of stops) {
        grad.addColorStop(s.stop, s.color);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      canvas.refresh();
    }
    this.scene.add.image(w / 2, h / 2, key).setDepth(DEPTH_BASE);
  }

  private drawStars(count: number, colors: number[]): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const gfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 2);
    for (let i = 0; i < count; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h);
      const sr = 0.5 + Math.random() * 1.5;
      const alpha = 0.3 + Math.random() * 0.7;
      gfx.fillStyle(Phaser.Utils.Array.GetRandom(colors), alpha);
      gfx.fillCircle(sx, sy, sr);
    }
  }

  private drawGlowStars(count: number): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const gfx = this.scene.add.graphics().setDepth(DEPTH_BASE + 2);
    for (let i = 0; i < count; i++) {
      const gx = Phaser.Math.Between(40, w - 40);
      const gy = Phaser.Math.Between(20, h - 20);
      const gr = Phaser.Math.Between(2, 4);
      gfx.fillStyle(0xffffff, 0.08);
      gfx.fillCircle(gx, gy, gr * 4);
      gfx.fillStyle(0xffffff, 0.2);
      gfx.fillCircle(gx, gy, gr * 2);
      gfx.fillStyle(0xffffff, 0.9);
      gfx.fillCircle(gx, gy, gr);
    }
  }

  private drawVignette(): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const key = '__bg_vignette';
    if (!this.scene.textures.exists(key)) {
      const vc = this.scene.textures.createCanvas(key, w, h)!;
      const vctx = vc.context;
      const vgrad = vctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
      vgrad.addColorStop(0, 'rgba(0,0,0,0)');
      vgrad.addColorStop(1, 'rgba(0,0,0,0.55)');
      vctx.fillStyle = vgrad;
      vctx.fillRect(0, 0, w, h);
      vc.refresh();
    }
    this.scene.add.image(w / 2, h / 2, key).setDepth(DEPTH_BASE + 5);
  }

  private addFloatingParticles(tints: number[]): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const particleKey = '__bg_particle';
    if (!this.scene.textures.exists(particleKey)) {
      const pg = this.scene.add.graphics();
      pg.fillStyle(0xffffff, 1);
      pg.fillCircle(3, 3, 3);
      pg.generateTexture(particleKey, 6, 6);
      pg.destroy();
    }
    this.scene.add
      .particles(0, 0, particleKey, {
        x: { min: 0, max: w },
        y: { min: 0, max: h },
        lifespan: { min: 4000, max: 8000 },
        speed: { min: 3, max: 12 },
        scale: { start: 0.15, end: 0 },
        alpha: { start: 0.4, end: 0 },
        frequency: 600,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
        tint: tints,
      })
      .setDepth(DEPTH_BASE + 4);
  }

  private addFallingParticles(tints: number[]): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const particleKey = '__bg_petal';
    if (!this.scene.textures.exists(particleKey)) {
      const pg = this.scene.add.graphics();
      pg.fillStyle(0xffffff, 1);
      pg.fillEllipse(4, 3, 8, 6);
      pg.generateTexture(particleKey, 8, 6);
      pg.destroy();
    }
    this.scene.add
      .particles(0, 0, particleKey, {
        x: { min: 0, max: w },
        y: -10,
        lifespan: { min: 6000, max: 12000 },
        speedX: { min: -15, max: 15 },
        speedY: { min: 10, max: 30 },
        scale: { start: 0.3, end: 0.1 },
        alpha: { start: 0.5, end: 0 },
        rotate: { min: 0, max: 360 },
        frequency: 400,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
        tint: tints,
        emitZone: {
          source: new Phaser.Geom.Rectangle(0, 0, w, 1),
          type: 'random',
        },
      })
      .setDepth(DEPTH_BASE + 4);
  }

  private addRisingParticles(tints: number[]): void {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const particleKey = '__bg_bubble';
    if (!this.scene.textures.exists(particleKey)) {
      const pg = this.scene.add.graphics();
      pg.lineStyle(1, 0xffffff, 0.8);
      pg.strokeCircle(4, 4, 3);
      pg.generateTexture(particleKey, 8, 8);
      pg.destroy();
    }
    this.scene.add
      .particles(0, 0, particleKey, {
        x: { min: 0, max: w },
        y: h + 10,
        lifespan: { min: 5000, max: 10000 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -20, max: -8 },
        scale: { start: 0.2, end: 0.4 },
        alpha: { start: 0.3, end: 0 },
        frequency: 500,
        quantity: 1,
        blendMode: Phaser.BlendModes.ADD,
        tint: tints,
      })
      .setDepth(DEPTH_BASE + 4);
  }
}
