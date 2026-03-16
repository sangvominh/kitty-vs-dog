import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

const Matter = (Phaser.Physics.Matter as any).Matter as any;

export type BossState = 'SPAWN' | 'CHASE' | 'ATTACK' | 'COOLDOWN' | 'STUNNED';

/**
 * "The Ex-Lover" — boss enemy type.
 * 500 HP, speed 1.5, 15 contact damage, drops 10 coins.
 * 4-state FSM: SPAWN → CHASE → ATTACK → COOLDOWN → CHASE ...
 * Fires 3 fan-spread "Emotional Baggage" projectiles during ATTACK.
 */
export class EnemyExLover extends Enemy {
  public fsmState: BossState = 'SPAWN';
  private stateTimer: number = 0;
  private projectiles: Projectile[] = [];
  private targetMidX: number = 0;
  private targetMidY: number = 0;

  // FSM timing
  private readonly SPAWN_DURATION = 1000;
  private readonly ATTACK_COOLDOWN = 2000;
  private readonly STUN_DURATION = 500;
  private readonly CHASE_MIN_DIST = 200;

  constructor(scene: Phaser.Scene) {
    super(scene, {
      type: 'ex-lover',
      health: 500,
      maxHealth: 500,
      movementSpeed: 1.5,
      contactDamage: 15,
      coinDropValue: 10,
      bodyRadius: 24,
      textureKey: 'enemy-ex-lover',
    });

    // Pre-allocate projectile pool for emotional baggage
    for (let i = 0; i < 9; i++) {
      const proj = new Projectile(scene, 'emotional-baggage');
      this.projectiles.push(proj);
    }
  }

  activate(x: number, y: number, healthMultiplier: number = 1, speedMultiplier: number = 1): void {
    super.activate(x, y, healthMultiplier, speedMultiplier);
    this.fsmState = 'SPAWN';
    this.stateTimer = this.scene.time.now;
  }

  setTarget(midX: number, midY: number): void {
    this.targetMidX = midX;
    this.targetMidY = midY;
  }

  stun(): void {
    this.fsmState = 'STUNNED';
    this.stateTimer = this.scene.time.now;
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
  }

  updateFSM(time: number): void {
    if (!this.active) return;

    const elapsed = time - this.stateTimer;

    switch (this.fsmState) {
      case 'SPAWN':
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        if (elapsed >= this.SPAWN_DURATION) {
          this.fsmState = 'CHASE';
          this.stateTimer = time;
        }
        break;

      case 'CHASE':
        this.seekTarget(this.targetMidX, this.targetMidY);
        {
          const distToTarget = Phaser.Math.Distance.Between(
            this.x,
            this.y,
            this.targetMidX,
            this.targetMidY,
          );
          if (distToTarget <= this.CHASE_MIN_DIST) {
            this.fsmState = 'ATTACK';
            this.stateTimer = time;
            this.fireEmotionalBaggage();
          }
        }
        break;

      case 'ATTACK':
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        // Transition to cooldown immediately after firing
        this.fsmState = 'COOLDOWN';
        this.stateTimer = time;
        break;

      case 'COOLDOWN':
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        if (elapsed >= this.ATTACK_COOLDOWN) {
          this.fsmState = 'CHASE';
          this.stateTimer = time;
        }
        break;

      case 'STUNNED':
        Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        if (elapsed >= this.STUN_DURATION) {
          this.fsmState = 'CHASE';
          this.stateTimer = time;
        }
        break;
    }

    // Update projectiles
    for (const proj of this.projectiles) {
      proj.update();
    }

    // Sync sprite
    this.sprite.setPosition(this.body.position.x, this.body.position.y);
  }

  private fireEmotionalBaggage(): void {
    const dx = this.targetMidX - this.x;
    const dy = this.targetMidY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const baseAngle = Math.atan2(dy, dx);
    const fanSpread = Math.PI / 6; // 30 degrees
    const speed = 4.0;

    // Fire 3 fan-spread projectiles
    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + i * fanSpread;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const proj = this.projectiles.find((p) => !p.active);
      if (proj) {
        proj.activate(this.x, this.y, vx, vy, 0, 'ex-lover', 5000);
      }
    }
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  deactivate(): void {
    super.deactivate();
    if (this.projectiles) {
      for (const proj of this.projectiles) {
        proj.deactivate();
      }
    }
  }

  destroy(): void {
    if (this.projectiles) {
      for (const proj of this.projectiles) {
        proj.destroy();
      }
    }
    this.projectiles = [];
    super.destroy();
  }
}
