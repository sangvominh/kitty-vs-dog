import Phaser from 'phaser';
import { AssetManifest, type AssetEntry } from '../assets/AssetManifest';
import { useSpriteStore } from '../state/spriteStore';
import { loadImageBlob } from '../../lib/spriteStorage';
import type { SpriteConfig } from '../state/spriteTypes';
import { ENTITY_IDS, type EntityId } from '../state/spriteTypes';
import { useBackgroundStore } from '../state/backgroundStore';

/**
 * Load an image blob as a Phaser texture at runtime.
 * Creates a temporary Object URL → HTMLImageElement → textures.addImage.
 */
export function loadBlobAsTexture(scene: Phaser.Scene, key: string, blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      // Remove old texture if key already exists (for re-upload)
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
      scene.textures.addImage(key, img);
      URL.revokeObjectURL(url);
      resolve(key);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image for texture: ${key}`));
    };
    img.src = url;
  });
}

/**
 * Restore all custom textures from IndexedDB on game boot.
 */
async function restoreAllCustomTextures(scene: Phaser.Scene, config: SpriteConfig): Promise<void> {
  const loadPromises: Promise<void>[] = [];

  for (const entityId of ENTITY_IDS) {
    const slot = config.slots[entityId as EntityId];
    if (!slot) continue;

    for (const image of slot.images) {
      const promise = (async () => {
        try {
          const blob = await loadImageBlob(image.id);
          if (!blob) {
            console.warn(`[BootScene] Missing blob for ${image.id} — sprite may have been evicted`);
            return;
          }
          await loadBlobAsTexture(scene, image.textureKey, blob);
        } catch (err) {
          console.warn(`[BootScene] Failed to restore texture ${image.textureKey}:`, err);
        }
      })();
      loadPromises.push(promise);
    }
  }

  await Promise.all(loadPromises);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Nothing to preload — we generate textures in create()
  }

  async create(): Promise<void> {
    // Generate primitive graphic textures from AssetManifest
    for (const entry of Object.values(AssetManifest)) {
      this.generateTexture(entry);
    }

    // Generate particle-white texture (8×8 white circle for VFX)
    this.generateParticleTexture();

    // Load sprite config from IndexedDB and restore custom textures
    try {
      const spriteStore = useSpriteStore.getState();
      await spriteStore.loadConfig();
      await restoreAllCustomTextures(this, spriteStore.config);
      console.log('[BootScene] Custom textures restored from IndexedDB');
    } catch (err) {
      console.warn('[BootScene] Failed to restore custom textures:', err);
    }

    // Load background settings
    try {
      await useBackgroundStore.getState().loadFromStorage();
      console.log('[BootScene] Background settings loaded');
    } catch (err) {
      console.warn('[BootScene] Failed to load background settings:', err);
    }

    // Transition to GameScene
    this.scene.start('GameScene');
  }

  private generateParticleTexture(): void {
    if (this.textures.exists('particle-white')) return;
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture('particle-white', 8, 8);
    pg.destroy();
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
