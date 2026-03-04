import Phaser from 'phaser';
import { CATEGORY, MASK } from './CollisionCategories';

const Matter = (Phaser.Physics.Matter as any).Matter as any;

export class Coin {
  public scene: Phaser.Scene;
  public body!: MatterJS.BodyType;
  public sprite!: Phaser.GameObjects.Sprite;
  public active: boolean = false;
  public value: number = 1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.sprite = scene.add.sprite(0, 0, 'coin');
    this.sprite.setVisible(false);

    // Sensor body — detects overlap but doesn't physically block
    this.body = scene.matter.add.circle(0, 0, 8, {
      isSensor: true,
      isStatic: true,
      label: 'coin',
      collisionFilter: {
        category: CATEGORY.COIN,
        mask: MASK.COIN,
      },
    });
  }

  activate(x: number, y: number, value: number): void {
    // Clamp position to 20px margin from edges
    const clampedX = Phaser.Math.Clamp(x, 20, 1260);
    const clampedY = Phaser.Math.Clamp(y, 20, 700);

    this.active = true;
    this.value = value;

    Matter.Body.setPosition(this.body, { x: clampedX, y: clampedY });
    Matter.Body.setStatic(this.body, false);
    this.body.collisionFilter.mask = MASK.COIN;

    this.sprite.setPosition(clampedX, clampedY);
    this.sprite.setVisible(true);
  }

  deactivate(): void {
    this.active = false;
    Matter.Body.setStatic(this.body, true);
    this.body.collisionFilter.mask = 0;
    this.sprite.setVisible(false);
  }

  destroy(): void {
    this.sprite.destroy();
    this.scene.matter.world.remove(this.body);
  }
}
