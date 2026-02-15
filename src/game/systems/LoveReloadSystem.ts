import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { useGameStore } from '../state/gameStore';

export class LoveReloadSystem {
  public scene: Phaser.Scene;
  private kitty: Player;
  private doggo: Player;
  private lastReloadTime: number = 0;
  private reloadCooldown: number = 1000; // 1 second between reloads
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;

    this.setupCollisionHandler();
    this.setupParticles();
  }

  private setupCollisionHandler(): void {
    this.scene.matter.world.on(
      'collisionstart',
      (event: { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] }) => {
        for (const pair of event.pairs) {
          const labelA = pair.bodyA.label ?? '';
          const labelB = pair.bodyB.label ?? '';

          // Check for Player-Player collision
          if (labelA.startsWith('player-') && labelB.startsWith('player-')) {
            this.triggerLoveReload();
          }
        }
      },
    );
  }

  private setupParticles(): void {
    // Create particle texture if not exists
    if (!this.scene.textures.exists('particle-heart')) return;

    this.particles = this.scene.add.particles(0, 0, 'particle-heart', {
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 }, // Float upward
      lifespan: 800,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0, // Manual emission
      emitting: false,
    });
  }

  private triggerLoveReload(): void {
    const now = this.scene.time.now;
    if (now - this.lastReloadTime < this.reloadCooldown) return;
    this.lastReloadTime = now;

    const store = useGameStore.getState();

    // Restore ammo
    this.kitty.ammo = this.kitty.maxAmmo;
    this.doggo.ammo = this.doggo.maxAmmo;
    store.setKittyAmmo(this.kitty.maxAmmo);
    store.setDoggoStamina(this.doggo.maxAmmo);

    // Heal (clamped to max)
    store.setHealth(Math.min(store.health + 5, store.maxHealth));

    // Emit heart particles at midpoint
    this.emitHearts();
  }

  private emitHearts(): void {
    if (!this.particles) return;

    const midX = (this.kitty.x + this.doggo.x) / 2;
    const midY = (this.kitty.y + this.doggo.y) / 2;

    this.particles.setPosition(midX, midY);
    this.particles.explode(10);
  }

  update(): void {
    // Particles are auto-managed by Phaser
  }

  destroy(): void {
    this.particles?.destroy();
  }
}
