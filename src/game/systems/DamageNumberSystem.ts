import Phaser from 'phaser';

interface DamageNumber {
  text: Phaser.GameObjects.Text;
  startY: number;
  lifetime: number;
  spawnTime: number;
}

/**
 * Shows floating damage numbers above enemies/players when they take damage.
 */
export class DamageNumberSystem {
  private scene: Phaser.Scene;
  private pool: DamageNumber[] = [];
  private readonly FLOAT_DISTANCE = 40;
  private readonly DURATION = 800;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Pre-allocate text objects
    for (let i = 0; i < 20; i++) {
      const text = scene.add.text(0, 0, '', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'bold',
      });
      text.setOrigin(0.5, 0.5);
      text.setVisible(false);
      text.setDepth(100);
      this.pool.push({
        text,
        startY: 0,
        lifetime: 0,
        spawnTime: 0,
      });
    }
  }

  spawn(x: number, y: number, amount: number, color: string = '#ff4444'): void {
    const entry = this.pool.find((e) => !e.text.visible);
    if (!entry) return;

    entry.text.setText(`-${amount}`);
    entry.text.setColor(color);
    entry.text.setPosition(x + (Math.random() - 0.5) * 20, y - 10);
    entry.text.setAlpha(1);
    entry.text.setVisible(true);
    entry.startY = entry.text.y;
    entry.spawnTime = this.scene.time.now;
    entry.lifetime = this.DURATION;
  }

  spawnHeal(x: number, y: number, amount: number): void {
    const entry = this.pool.find((e) => !e.text.visible);
    if (!entry) return;

    entry.text.setText(`+${amount}`);
    entry.text.setColor('#44ff44');
    entry.text.setPosition(x, y - 10);
    entry.text.setAlpha(1);
    entry.text.setVisible(true);
    entry.startY = entry.text.y;
    entry.spawnTime = this.scene.time.now;
    entry.lifetime = this.DURATION;
  }

  update(): void {
    const now = this.scene.time.now;

    for (const entry of this.pool) {
      if (!entry.text.visible) continue;

      const elapsed = now - entry.spawnTime;
      const progress = elapsed / entry.lifetime;

      if (progress >= 1) {
        entry.text.setVisible(false);
        continue;
      }

      // Float upward
      entry.text.setY(entry.startY - this.FLOAT_DISTANCE * progress);

      // Fade out
      entry.text.setAlpha(1 - progress * progress);
    }
  }

  destroy(): void {
    for (const entry of this.pool) {
      entry.text.destroy();
    }
    this.pool = [];
  }
}
