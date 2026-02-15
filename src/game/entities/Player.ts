import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { CATEGORY, MASK } from './CollisionCategories';

export type PlayerId = 'kitty' | 'doggo';
export type PlayerRole = 'ranged' | 'melee';

export interface PlayerConfig {
  id: PlayerId;
  role: PlayerRole;
  x: number;
  y: number;
  textureKey: string;
}

export class Player {
  public readonly id: PlayerId;
  public readonly role: PlayerRole;
  public body: MatterJS.BodyType;
  public sprite: Phaser.GameObjects.Sprite;
  public scene: Phaser.Scene;

  // Combat stats
  public ammo: number;
  public maxAmmo: number;
  public movementSpeed: number;
  public attackRange: number;
  public attackDamage: number;
  public attackCooldown: number;
  public lastAttackTime: number = 0;

  // Slow debuff
  public isSlowed: boolean = false;
  public slowExpiry: number = 0;

  // Passive regen
  private lastRegenTime: number = 0;
  private readonly REGEN_INTERVAL = 3000; // 1 ammo/stamina every 3 seconds

  // Visual indicator for empty weapon
  public emptyIndicator: Phaser.GameObjects.Graphics | null = null;

  // Attack range visual indicator
  private rangeIndicator: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.scene = scene;
    this.id = config.id;
    this.role = config.role;

    // Role-specific stats
    if (config.role === 'ranged') {
      this.ammo = 10;
      this.maxAmmo = 10;
      this.movementSpeed = 3.0;
      this.attackRange = 250;
      this.attackDamage = 10;
      this.attackCooldown = 1000;
    } else {
      this.ammo = 8;
      this.maxAmmo = 8;
      this.movementSpeed = 3.0;
      this.attackRange = 60;
      this.attackDamage = 15;
      this.attackCooldown = 800;
    }

    // Create sprite
    this.sprite = scene.add.sprite(config.x, config.y, config.textureKey);

    // Create Matter.js body
    const bodyRadius = config.role === 'ranged' ? 16 : 16;
    this.body = scene.matter.add.circle(config.x, config.y, bodyRadius, {
      label: `player-${config.id}`,
      frictionAir: 0.15,
      friction: 0.1,
      restitution: 0.3,
      collisionFilter: {
        category: CATEGORY.PLAYER,
        mask: MASK.PLAYER,
      },
    });
    // Create empty indicator graphics
    this.emptyIndicator = scene.add.graphics();
    this.emptyIndicator.setVisible(false);

    // Create attack range indicator
    this.rangeIndicator = scene.add.graphics();
  }

  get x(): number {
    return this.body.position.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  getEffectiveSpeed(): number {
    return this.isSlowed ? this.movementSpeed * 0.5 : this.movementSpeed;
  }

  update(time: number): void {
    // Clear slow debuff
    if (this.isSlowed && time > this.slowExpiry) {
      this.isSlowed = false;
      this.slowExpiry = 0;
    }

    // Passive ammo/stamina regen
    if (this.ammo < this.maxAmmo && time - this.lastRegenTime >= this.REGEN_INTERVAL) {
      this.ammo++;
      this.lastRegenTime = time;
    }

    // Sync sprite to physics body position
    this.sprite.setPosition(this.body.position.x, this.body.position.y);

    // Clamp position to arena bounds
    const x = Phaser.Math.Clamp(this.body.position.x, 16, GAME_WIDTH - 16);
    const y = Phaser.Math.Clamp(this.body.position.y, 16, GAME_HEIGHT - 16);
    if (x !== this.body.position.x || y !== this.body.position.y) {
      Phaser.Physics.Matter.Matter.Body.setPosition(this.body, { x, y });
    }

    // Show empty weapon indicator
    this.updateEmptyIndicator(time);

    // Draw attack range circle
    this.updateRangeIndicator();
  }

  private updateRangeIndicator(): void {
    if (!this.rangeIndicator) return;
    this.rangeIndicator.clear();

    // Different color per role
    const color = this.role === 'ranged' ? 0x00ffff : 0xff8844;
    const alpha = this.ammo > 0 ? 0.15 : 0.05;

    // Filled circle showing attack range
    this.rangeIndicator.fillStyle(color, alpha);
    this.rangeIndicator.fillCircle(this.x, this.y, this.attackRange);

    // Border ring
    this.rangeIndicator.lineStyle(1, color, this.ammo > 0 ? 0.4 : 0.1);
    this.rangeIndicator.strokeCircle(this.x, this.y, this.attackRange);
  }

  private updateEmptyIndicator(time: number): void {
    if (!this.emptyIndicator) return;

    if (this.ammo <= 0) {
      this.emptyIndicator.setVisible(true);
      this.emptyIndicator.clear();

      // Pulsing red ring above player
      const pulse = Math.sin(time * 0.008) * 0.3 + 0.7;
      this.emptyIndicator.lineStyle(2, 0xff4444, pulse);
      this.emptyIndicator.strokeCircle(this.x, this.y - 24, 8);

      // Exclamation mark
      this.emptyIndicator.fillStyle(0xff4444, pulse);
      this.emptyIndicator.fillRect(this.x - 1, this.y - 28, 2, 8);
      this.emptyIndicator.fillRect(this.x - 1, this.y - 18, 2, 2);
    } else {
      this.emptyIndicator.setVisible(false);
      this.emptyIndicator.clear();
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.emptyIndicator?.destroy();
    this.rangeIndicator?.destroy();
    this.scene.matter.world.remove(this.body);
  }
}
