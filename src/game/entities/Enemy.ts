import Phaser from 'phaser';
import { CATEGORY, MASK } from './CollisionCategories';
import type { PlayerId } from './Player';

const Matter = (Phaser.Physics.Matter as any).Matter as any;

export type EnemyType = 'bill' | 'deadline' | 'ex-lover';

export interface EnemyStats {
  type: EnemyType;
  health: number;
  maxHealth: number;
  movementSpeed: number;
  contactDamage: number;
  coinDropValue: number;
  bodyRadius: number;
  textureKey: string;
}

export class Enemy {
  public scene: Phaser.Scene;
  public body!: MatterJS.BodyType;
  public sprite!: Phaser.GameObjects.Sprite;
  public active: boolean = false;

  public type: EnemyType;
  public health: number;
  public maxHealth: number;
  public movementSpeed: number;
  public baseMovementSpeed: number;
  public contactDamage: number;
  public coinDropValue: number;
  public bodyRadius: number;

  // Per-player hit cooldown timestamps for contact damage
  public lastHitTimestamps: Map<PlayerId, number> = new Map();

  // Clothesline cooldown
  public lastClotheslineHit: number = 0;

  private textureKey: string;

  constructor(scene: Phaser.Scene, stats: EnemyStats) {
    this.scene = scene;
    this.type = stats.type;
    this.health = stats.health;
    this.maxHealth = stats.maxHealth;
    this.movementSpeed = stats.movementSpeed;
    this.baseMovementSpeed = stats.movementSpeed;
    this.contactDamage = stats.contactDamage;
    this.coinDropValue = stats.coinDropValue;
    this.bodyRadius = stats.bodyRadius;
    this.textureKey = stats.textureKey;

    this.createBody(0, 0);
    this.deactivate();
  }

  private createBody(x: number, y: number): void {
    this.sprite = this.scene.add.sprite(x, y, this.textureKey);
    this.sprite.setVisible(false);

    this.body = this.scene.matter.add.circle(x, y, this.bodyRadius, {
      label: `enemy-${this.type}`,
      frictionAir: 0.05,
      friction: 0,
      restitution: 0.2,
      collisionFilter: {
        category: CATEGORY.ENEMY,
        mask: MASK.ENEMY,
      },
    });
  }

  activate(x: number, y: number, healthMultiplier: number = 1, speedMultiplier: number = 1): void {
    this.active = true;
    this.health = Math.floor(this.maxHealth * healthMultiplier);
    this.movementSpeed = this.baseMovementSpeed * speedMultiplier;
    this.lastHitTimestamps.clear();
    this.lastClotheslineHit = 0;

    Matter.Body.setPosition(this.body, { x, y });
    Matter.Body.setStatic(this.body, false);
    this.body.collisionFilter.mask = MASK.ENEMY;

    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
  }

  deactivate(): void {
    this.active = false;
    Matter.Body.setStatic(this.body, true);
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    this.body.collisionFilter.mask = 0;
    this.sprite.setVisible(false);
  }

  get x(): number {
    return this.body.position.x;
  }

  get y(): number {
    return this.body.position.y;
  }

  seekTarget(targetX: number, targetY: number): void {
    if (!this.active) return;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const vx = (dx / dist) * this.movementSpeed;
      const vy = (dy / dist) * this.movementSpeed;
      Matter.Body.setVelocity(this.body, { x: vx, y: vy });
    }
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    return this.health <= 0;
  }

  canHitPlayer(playerId: PlayerId, currentTime: number, cooldown: number = 1000): boolean {
    const lastHit = this.lastHitTimestamps.get(playerId) ?? 0;
    return currentTime - lastHit >= cooldown;
  }

  recordHit(playerId: PlayerId, currentTime: number): void {
    this.lastHitTimestamps.set(playerId, currentTime);
  }

  update(): void {
    if (!this.active) return;
    this.sprite.setPosition(this.body.position.x, this.body.position.y);
  }

  destroy(): void {
    this.sprite.destroy();
    this.scene.matter.world.remove(this.body);
  }
}
