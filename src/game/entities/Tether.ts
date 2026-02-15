import Phaser from 'phaser';
import type { Player } from './Player';

const Matter = Phaser.Physics.Matter.Matter;

export class Tether {
  public scene: Phaser.Scene;
  public playerA: Player;
  public playerB: Player;

  // Spring parameters
  public restLength: number = 200;
  public maxDistance: number = 300;
  public stiffness: number = 0.02;
  public damping: number = 0.05;

  // Clothesline parameters
  public clotheslineDamage: number = 50;
  public clotheslineKnockback: number = 8.0;
  public minActiveLength: number = 50;

  // Rendering
  public graphics: Phaser.GameObjects.Graphics;

  // Clothesline timing
  private clotheslineFlashTimer: number = 0;

  private constraint: MatterJS.ConstraintType;

  constructor(scene: Phaser.Scene, playerA: Player, playerB: Player) {
    this.scene = scene;
    this.playerA = playerA;
    this.playerB = playerB;

    // Create Matter.js spring constraint
    this.constraint = Matter.Constraint.create({
      bodyA: playerA.body,
      bodyB: playerB.body,
      length: this.restLength,
      stiffness: this.stiffness,
      damping: this.damping,
      pointA: { x: 0, y: 0 },
      pointB: { x: 0, y: 0 },
    });

    scene.matter.world.add(this.constraint);

    // Create graphics for rope rendering
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
    return this.currentLength > this.minActiveLength;
  }

  /**
   * Enforce hard max distance — called in update() after physics step
   */
  enforceMaxDistance(): void {
    const posA = this.playerA.body.position;
    const posB = this.playerB.body.position;

    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.maxDistance) {
      const nx = dx / dist;
      const ny = dy / dist;

      // Center on midpoint
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

      // Dampen outward velocity
      const velA = this.playerA.body.velocity;
      const dotA = velA.x * nx + velA.y * ny;
      if (dotA < 0) {
        Matter.Body.setVelocity(this.playerA.body, {
          x: velA.x - dotA * nx * 0.8,
          y: velA.y - dotA * ny * 0.8,
        });
      }

      const velB = this.playerB.body.velocity;
      const dotB = velB.x * -nx + velB.y * -ny;
      if (dotB < 0) {
        Matter.Body.setVelocity(this.playerB.body, {
          x: velB.x - dotB * -nx * 0.8,
          y: velB.y - dotB * -ny * 0.8,
        });
      }
    }
  }

  /**
   * Render the tether rope with color shift based on stretch
   */
  render(): void {
    this.graphics.clear();

    const posA = this.playerA.body.position;
    const posB = this.playerB.body.position;

    const dist = this.currentLength;
    const stretchRatio = Math.min(dist / this.maxDistance, 1.0);

    // Color shifts: white → yellow → red
    let color: number;
    if (stretchRatio < 0.5) {
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
    this.scene.matter.world.removeConstraint(this.constraint);
    this.graphics.destroy();
  }
}
