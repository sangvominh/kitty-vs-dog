import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Tether } from '../entities/Tether';
import type { DamageNumberSystem } from './DamageNumberSystem';
import { useGameStore } from '../state/gameStore';

/**
 * Proximity-based healing system:
 * - When two players are touching (within TOUCH_DISTANCE), they heal over time
 * - Attack power is reduced while touching (for balance)
 * - When they separate, tether rope appears and full attack returns
 * - If tether is broken, NO healing even when touching
 */
export class LoveReloadSystem {
  public scene: Phaser.Scene;
  private kitty: Player;
  private doggo: Player;
  private tether: Tether;
  private damageNumbers: DamageNumberSystem | null = null;

  // Heal while touching
  private readonly HEAL_INTERVAL = 800; // heal every 0.8s while touching
  private readonly HEAL_AMOUNT = 2;
  private readonly AMMO_REGEN_INTERVAL = 1500; // ammo regen every 1.5s while touching
  private lastHealTime: number = 0;
  private lastAmmoRegenTime: number = 0;

  // Attack debuff while touching
  public readonly TOUCH_DAMAGE_MULTIPLIER = 0.4; // 40% damage while hugging

  // Heart particles
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private lastParticleTime: number = 0;

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player, tether: Tether) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
    this.tether = tether;

    this.setupParticles();
  }

  setDamageNumbers(dn: DamageNumberSystem): void {
    this.damageNumbers = dn;
  }

  private setupParticles(): void {
    if (!this.scene.textures.exists('particle-heart')) return;
    this.particles = this.scene.add.particles(0, 0, 'particle-heart', {
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 },
      lifespan: 800,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
    });
  }

  update(time: number): void {
    const store = useGameStore.getState();
    const touching = this.tether.playersTouching;
    store.setPlayersTouching(touching);

    if (touching && !this.tether.broken) {
      // Heal over time while touching
      if (store.health < store.maxHealth && time - this.lastHealTime >= this.HEAL_INTERVAL) {
        this.lastHealTime = time;
        const newHP = Math.min(store.health + this.HEAL_AMOUNT, store.maxHealth);
        store.setHealth(newHP);
        const midX = (this.kitty.x + this.doggo.x) / 2;
        const midY = (this.kitty.y + this.doggo.y) / 2;
        this.damageNumbers?.spawnHeal(midX, midY, this.HEAL_AMOUNT);
      }

      // Ammo regen while touching
      if (time - this.lastAmmoRegenTime >= this.AMMO_REGEN_INTERVAL) {
        this.lastAmmoRegenTime = time;
        if (this.kitty.ammo < this.kitty.maxAmmo) {
          this.kitty.ammo++;
          store.setKittyAmmo(this.kitty.ammo);
        }
        if (this.doggo.ammo < this.doggo.maxAmmo) {
          this.doggo.ammo++;
          store.setDoggoStamina(this.doggo.ammo);
        }
      }

      // Heart particles periodically
      if (time - this.lastParticleTime > 500) {
        this.lastParticleTime = time;
        this.emitHearts();
      }
    }
  }

  /** Whether the damage debuff is active (players touching & tether intact) */
  get isDamageReduced(): boolean {
    return this.tether.playersTouching && !this.tether.broken;
  }

  private emitHearts(): void {
    if (!this.particles) return;
    const midX = (this.kitty.x + this.doggo.x) / 2;
    const midY = (this.kitty.y + this.doggo.y) / 2;
    this.particles.setPosition(midX, midY);
    this.particles.explode(5);
  }

  destroy(): void {
    this.particles?.destroy();
  }
}
