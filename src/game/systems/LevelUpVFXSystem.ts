/**
 * LevelUpVFXSystem — burst particle effects + persistent tier-colored glow on level-up.
 * Uses Phaser 3.60+ particle API and PostFX glow pipeline.
 */

import Phaser from 'phaser';
import { TIER_CONFIG, type LevelTier } from '../state/spriteTypes';

/**
 * Get the tier configuration for a given level.
 */
export function getTierForLevel(level: number): LevelTier {
  for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
    if (level >= TIER_CONFIG[i].minLevel) return TIER_CONFIG[i];
  }
  return TIER_CONFIG[0];
}

export class LevelUpVFXSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Play the full level-up visual effect sequence.
   */
  playLevelUpEffect(x: number, y: number, level: number, sprite: Phaser.GameObjects.Sprite): void {
    const tier = getTierForLevel(level);

    // 1. Ring burst
    this.playRingBurst(x, y, tier);

    // 2. Sparkles
    this.playSparkles(x, y, tier);

    // 3. Fire trail (high tiers only)
    if (tier.hasFireTrail) {
      this.playFireTrail(x, y);
    }

    // 4. Persistent glow
    this.applyTierGlow(sprite, tier);
  }

  /**
   * Clear all PostFX effects from a sprite.
   */
  clearGlow(sprite: Phaser.GameObjects.Sprite): void {
    if (sprite.postFX) {
      sprite.postFX.clear();
    }
  }

  private playRingBurst(x: number, y: number, tier: LevelTier): void {
    if (!this.scene.textures.exists('particle-white')) return;

    const ring = this.scene.add.particles(x, y, 'particle-white', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      quantity: tier.burstCount,
      emitting: false,
      tint: tier.color,
    });
    ring.setDepth(100);
    ring.explode(tier.burstCount);
    this.scene.time.delayedCall(1000, () => ring.destroy());
  }

  private playSparkles(x: number, y: number, tier: LevelTier): void {
    if (!this.scene.textures.exists('particle-white')) return;

    const sparkles = this.scene.add.particles(x, y, 'particle-white', {
      speed: { min: 30, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      quantity: Math.floor(tier.burstCount * 0.7),
      emitting: false,
      tint: [tier.color, 0xffffff, tier.color],
      gravityY: -20,
    });
    sparkles.setDepth(100);
    sparkles.explode(Math.floor(tier.burstCount * 0.7));
    this.scene.time.delayedCall(1500, () => sparkles.destroy());
  }

  private playFireTrail(x: number, y: number): void {
    if (!this.scene.textures.exists('particle-white')) return;

    const fire = this.scene.add.particles(x, y, 'particle-white', {
      speed: { min: 20, max: 60 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      frequency: 30,
      tint: [0xff4400, 0xff8800, 0xffcc00],
      blendMode: Phaser.BlendModes.ADD,
    });
    fire.setDepth(100);

    // Stop emitting after 2 seconds, destroy after particles fade
    this.scene.time.delayedCall(2000, () => {
      fire.stop();
      this.scene.time.delayedCall(1000, () => fire.destroy());
    });
  }

  private applyTierGlow(sprite: Phaser.GameObjects.Sprite, tier: LevelTier): void {
    // PostFX is WebGL only — check existence
    if (!sprite.postFX) return;

    // Clear existing effects to prevent stacking
    sprite.postFX.clear();

    // Add glow effect
    const glow = sprite.postFX.addGlow(tier.color, tier.glowStrength, 0, false, 0.1, 16);

    // Pulsing animation
    this.scene.tweens.add({
      targets: glow,
      outerStrength: tier.glowStrength * 1.5,
      yoyo: true,
      loop: -1,
      duration: 1000,
      ease: 'Sine.easeInOut',
    });
  }
}
