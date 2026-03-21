import Phaser from 'phaser';
import type { Player } from './Player';
import { useGameStore } from '../state/gameStore';

const Matter = (Phaser.Physics.Matter as any).Matter as any;

export class Tether {
  public scene: Phaser.Scene;
  public playerA: Player;
  public playerB: Player;

  // Rope parameters
  public restLength: number = 200;
  public maxDistance: number = 300;

  // Clothesline parameters
  public clotheslineDamage: number = 50;
  public clotheslineKnockback: number = 8.0;
  public minActiveLength: number = 50;

  // Durability
  public durability: number = 100;
  public maxDurability: number = 100;
  public broken: boolean = false;
  private readonly DURABILITY_COST_PER_HIT = 3;

  // Proximity detection
  public readonly TOUCH_DISTANCE = 45;

  // Rendering
  public graphics: Phaser.GameObjects.Graphics;

  // Clothesline timing
  private clotheslineFlashTimer: number = 0;

  constructor(scene: Phaser.Scene, playerA: Player, playerB: Player) {
    this.scene = scene;
    this.playerA = playerA;
    this.playerB = playerB;

    // No Matter.js constraint — we handle all rope physics manually
    // This allows players to freely get close (touch for healing)
    // while enforcing max distance and gentle pull when stretched

    this.graphics = scene.add.graphics();
  }

  get currentLength(): number {
    const posA = this.playerA.body.position;
    const posB = this.playerB.body.position;
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  get isActive(): boolean {
    return !this.broken && this.currentLength > this.minActiveLength;
  }

  /** Are the two players close enough to be "touching"? */
  get playersTouching(): boolean {
    return this.currentLength <= this.TOUCH_DISTANCE;
  }

  /** Reduce durability after a clothesline hit. Returns true if just broke. */
  consumeDurability(): boolean {
    if (this.broken) return false;
    this.durability = Math.max(0, this.durability - this.DURABILITY_COST_PER_HIT);
    const store = useGameStore.getState();
    store.setTetherDurability(this.durability);
    if (this.durability <= 0) {
      this.broken = true;
      store.setTetherBroken(true);
      return true;
    }
    return false;
  }

  /**
   * Enforce rope physics — called every frame after physics step.
   * - Players can freely move between 0 and restLength (no force).
   * - Between restLength and maxDistance: gentle elastic pull inward.
   * - Beyond maxDistance: hard clamp.
   */
  enforceMaxDistance(): void {
    if (this.broken) return;

    const posA = this.playerA.body.position;
    const posB = this.playerB.body.position;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.restLength) return; // Free movement zone

    const nx = dx / dist;
    const ny = dy / dist;

    if (dist > this.maxDistance) {
      // Hard clamp — snap back to maxDistance
      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;
      const halfMax = this.maxDistance / 2;

      Matter.Body.setPosition(this.playerA.body, {
        x: midX - nx * halfMax,
        y: midY - ny * halfMax,
      });
      Matter.Body.setPosition(this.playerB.body, {
        x: midX + nx * halfMax,
        y: midY + ny * halfMax,
      });

      // Kill outward velocity
      const velA = this.playerA.body.velocity;
      const dotA = velA.x * -nx + velA.y * -ny;
      if (dotA > 0) {
        Matter.Body.setVelocity(this.playerA.body, {
          x: velA.x + dotA * nx,
          y: velA.y + dotA * ny,
        });
      }

      const velB = this.playerB.body.velocity;
      const dotB = velB.x * nx + velB.y * ny;
      if (dotB > 0) {
        Matter.Body.setVelocity(this.playerB.body, {
          x: velB.x - dotB * nx,
          y: velB.y - dotB * ny,
        });
      }
    } else {
      // Elastic zone (restLength < dist <= maxDistance)
      // Gentle inward pull that increases with stretch
      const stretch = (dist - this.restLength) / (this.maxDistance - this.restLength);
      const pullStrength = stretch * 0.0015; // Gradual pull force

      Matter.Body.applyForce(this.playerA.body, posA, {
        x: nx * pullStrength,
        y: ny * pullStrength,
      });
      Matter.Body.applyForce(this.playerB.body, posB, {
        x: -nx * pullStrength,
        y: -ny * pullStrength,
      });
    }
  }

  /**
   * Render the tether rope with color shift based on stretch
   */
  render(): void {
    this.graphics.clear();

    // Don't render rope when broken
    if (this.broken) return;

    // Don't render when players touching (tether hidden)
    if (this.playersTouching) return;

    const posA = this.playerA.body.position;
    const posB = this.playerB.body.position;

    const dist = this.currentLength;
    const stretchRatio = Math.min(dist / this.maxDistance, 1.0);

    // Color shifts based on durability and stretch
    const durabilityRatio = this.durability / this.maxDurability;
    let color: number;
    if (durabilityRatio < 0.3) {
      // Low durability: flicker red
      const flicker = Math.sin(Date.now() * 0.01) > 0 ? 0xff0000 : 0xff4444;
      color = flicker;
    } else if (stretchRatio < 0.5) {
      color = 0xffffff; // slack: white
    } else if (stretchRatio < 0.85) {
      const t = (stretchRatio - 0.5) / 0.35;
      const r = 255;
      const g = Math.floor(255 - t * 255);
      const b = 0;
      color = (r << 16) | (g << 8) | b;
    } else {
      color = 0xff0000; // near-max: red
    }

    // Flash on clothesline hit
    if (this.clotheslineFlashTimer > 0) {
      color = 0xffffff;
      this.clotheslineFlashTimer -= 16; // ~1 frame at 60fps
    }

    const thickness = 2 + stretchRatio * 4; // 2px slack → 6px stretched

    // Catenary sag when slack
    if (stretchRatio < 0.3 && dist > this.minActiveLength) {
      const sag = (1 - stretchRatio / 0.3) * 30;
      const controlX = (posA.x + posB.x) / 2;
      const controlY = (posA.y + posB.y) / 2 + sag;

      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(posA.x, posA.y),
        new Phaser.Math.Vector2(controlX, controlY),
        new Phaser.Math.Vector2(posB.x, posB.y),
      );

      this.graphics.lineStyle(thickness, color, 1.0);
      curve.draw(this.graphics, 16);
    } else {
      this.graphics.lineStyle(thickness, color, 1.0);
      this.graphics.lineBetween(posA.x, posA.y, posB.x, posB.y);
    }
  }

  triggerFlash(): void {
    this.clotheslineFlashTimer = 100; // 100ms flash
  }

  getMidpoint(): { x: number; y: number } {
    return {
      x: (this.playerA.x + this.playerB.x) / 2,
      y: (this.playerA.y + this.playerB.y) / 2,
    };
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
