import Phaser from 'phaser';
import { AssetManifest, type AssetEntry } from '../assets/AssetManifest';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Nothing to preload — we generate textures in create()
  }

  create(): void {
    // Generate primitive graphic textures from AssetManifest
    for (const entry of Object.values(AssetManifest)) {
      this.generateTexture(entry);
    }

    // Transition to GameScene
    this.scene.start('GameScene');
  }

  private generateTexture(entry: AssetEntry): void {
    // Skip if texture already exists
    if (this.textures.exists(entry.key)) return;

    const graphics = this.add.graphics();
    graphics.fillStyle(entry.color, 1);

    switch (entry.type) {
      case 'circle':
        graphics.fillCircle(entry.width / 2, entry.height / 2, entry.width / 2);
        break;
      case 'rectangle':
        graphics.fillRect(0, 0, entry.width, entry.height);
        break;
      case 'triangle':
        graphics.fillTriangle(entry.width / 2, 0, 0, entry.height, entry.width, entry.height);
        break;
      case 'line':
        graphics.lineStyle(2, entry.color, 1);
        graphics.lineBetween(0, 0, entry.width, 0);
        break;
    }

    graphics.generateTexture(entry.key, entry.width, entry.height);
    graphics.destroy();
  }
}
