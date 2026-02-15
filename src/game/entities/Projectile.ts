import Phaser from 'phaser';
import { CATEGORY, MASK } from './CollisionCategories';

const Matter = Phaser.Physics.Matter.Matter;

export type ProjectileType = 'ranged-shot' | 'emotional-baggage';

export class Projectile {
  public scene: Phaser.Scene;
  public body!: MatterJS.BodyType;
  public sprite!: Phaser.GameObjects.Sprite;
  public active: boolean = false;
  public type: ProjectileType;
  public damage: number = 0;
  public owner: string = '';
  public lifetime: number = 0;
  public spawnTime: number = 0;

  constructor(scene: Phaser.Scene, type: ProjectileType) {
    this.scene = scene;
    this.type = type;

    const textureKey = type === 'ranged-shot' ? 'projectile-ranged' : 'projectile-baggage';
    const radius = type === 'ranged-shot' ? 4 : 6;

    this.sprite = scene.add.sprite(0, 0, textureKey);
    this.sprite.setVisible(false);

    this.body = scene.matter.add.circle(0, 0, radius, {
      isSensor: true,
      isStatic: true,
      label: `projectile-${type}`,
      frictionAir: 0,
      collisionFilter: {
        category: CATEGORY.PROJECTILE,
        mask: MASK.PROJECTILE,
      },
    });
  }

  activate(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    owner: string,
    lifetime: number = 3000,
  ): void {
    this.active = true;
    this.damage = damage;
    this.owner = owner;
    this.lifetime = lifetime;
    this.spawnTime = Date.now();

    Matter.Body.setStatic(this.body, false);
    Matter.Body.setPosition(this.body, { x, y });
    Matter.Body.setVelocity(this.body, { x: vx, y: vy });
    this.body.collisionFilter.mask = MASK.PROJECTILE;

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

  update(): void {
    if (!this.active) return;

    // Sync sprite to body
    this.sprite.setPosition(this.body.position.x, this.body.position.y);

    // Check lifetime
    if (Date.now() - this.spawnTime > this.lifetime) {
      this.deactivate();
      return;
    }

    // Check if out of bounds
    const { x, y } = this.body.position;
    if (x < -50 || x > 1330 || y < -50 || y > 770) {
      this.deactivate();
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.scene.matter.world.remove(this.body);
  }
}
