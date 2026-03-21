import Phaser from 'phaser';
import type { Player, PlayerId } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { EnemyExLover } from '../entities/EnemyExLover';
import type { Tether } from '../entities/Tether';
import { Projectile } from '../entities/Projectile';
import { Coin } from '../entities/Coin';
import type { SpawnSystem } from './SpawnSystem';
import type { DamageNumberSystem } from './DamageNumberSystem';
import type { LoveReloadSystem } from './LoveReloadSystem';
import { useGameStore } from '../state/gameStore';
import { useSettingsStore } from '../../lib/settingsStore';
import { getDifficulty } from '../state/difficultyConfig';

export class CombatSystem {
  public scene: Phaser.Scene;
  public projectiles: Projectile[] = [];
  public coins: Coin[] = [];

  private kitty: Player;
  private doggo: Player;
  private tether: Tether;
  private spawnSystem!: SpawnSystem;
  private damageNumbers: DamageNumberSystem | null = null;
  private loveReloadSystem: LoveReloadSystem | null = null;

  // Projectile pool
  private rangedPool: Projectile[] = [];

  // Coin pool
  private coinPool: Coin[] = [];

  constructor(scene: Phaser.Scene, kitty: Player, doggo: Player, tether: Tether) {
    this.scene = scene;
    this.kitty = kitty;
    this.doggo = doggo;
    this.tether = tether;

    this.preallocatePools();
    this.setupCollisionHandlers();
  }

  setSpawnSystem(spawnSystem: SpawnSystem): void {
    this.spawnSystem = spawnSystem;
  }

  setDamageNumbers(dn: DamageNumberSystem): void {
    this.damageNumbers = dn;
  }

  setLoveReloadSystem(lrs: LoveReloadSystem): void {
    this.loveReloadSystem = lrs;
  }

  private preallocatePools(): void {
    // Projectile pool
    for (let i = 0; i < 20; i++) {
      const proj = new Projectile(this.scene, 'ranged-shot');
      this.rangedPool.push(proj);
      this.projectiles.push(proj);
    }

    // Coin pool
    for (let i = 0; i < 30; i++) {
      const coin = new Coin(this.scene);
      this.coinPool.push(coin);
      this.coins.push(coin);
    }
  }

  private setupCollisionHandlers(): void {
    this.scene.matter.world.on(
      'collisionstart',
      (event: { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] }) => {
        for (const pair of event.pairs) {
          this.handleCollision(pair.bodyA, pair.bodyB);
        }
      },
    );
  }

  private handleCollision(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType): void {
    const labelA = bodyA.label ?? '';
    const labelB = bodyB.label ?? '';

    // Player-Enemy contact damage
    if (this.isPlayerBody(labelA) && this.isEnemyBody(labelB)) {
      this.handlePlayerEnemyContact(labelA, bodyB);
    } else if (this.isEnemyBody(labelA) && this.isPlayerBody(labelB)) {
      this.handlePlayerEnemyContact(labelB, bodyA);
    }

    // Projectile-Enemy collision
    if (this.isProjectileBody(labelA) && this.isEnemyBody(labelB)) {
      this.handleProjectileEnemyHit(bodyA, bodyB);
    } else if (this.isEnemyBody(labelA) && this.isProjectileBody(labelB)) {
      this.handleProjectileEnemyHit(bodyB, bodyA);
    }

    // Projectile-Player collision (emotional baggage)
    if (this.isProjectileBody(labelA) && this.isPlayerBody(labelB)) {
      this.handleProjectilePlayerHit(bodyA, labelB);
    } else if (this.isPlayerBody(labelA) && this.isProjectileBody(labelB)) {
      this.handleProjectilePlayerHit(bodyB, labelA);
    }

    // Player-Coin pickup
    if (this.isPlayerBody(labelA) && labelB === 'coin') {
      this.handleCoinPickup(bodyB);
    } else if (labelA === 'coin' && this.isPlayerBody(labelB)) {
      this.handleCoinPickup(bodyA);
    }
  }

  private isPlayerBody(label: string): boolean {
    return label.startsWith('player-');
  }

  private isEnemyBody(label: string): boolean {
    return label.startsWith('enemy-');
  }

  private isProjectileBody(label: string): boolean {
    return label.startsWith('projectile-');
  }

  private handlePlayerEnemyContact(playerLabel: string, enemyBody: MatterJS.BodyType): void {
    const playerId = playerLabel.replace('player-', '') as PlayerId;
    const enemy = this.findEnemyByBody(enemyBody);
    if (!enemy || !enemy.active) return;

    const now = this.scene.time.now;
    if (!enemy.canHitPlayer(playerId, now, 1000)) return;

    enemy.recordHit(playerId, now);

    const store = useGameStore.getState();
    store.setHealth(store.health - enemy.contactDamage);

    // Show damage number on player
    const player = playerId === 'kitty' ? this.kitty : this.doggo;
    this.damageNumbers?.spawn(player.x, player.y, enemy.contactDamage, '#ff4444');

    // Trigger hurt action for sprite swap
    player.setTemporaryAction('hurt', now);

    // Check game over
    if (store.health <= 0) {
      store.setGameState('game-over');
    }
  }

  private handleProjectileEnemyHit(
    projBody: MatterJS.BodyType,
    enemyBody: MatterJS.BodyType,
  ): void {
    const projectile = this.findProjectileByBody(projBody);
    const enemy = this.findEnemyByBody(enemyBody);
    if (!projectile || !enemy || !projectile.active || !enemy.active) return;

    // Only ranged-shot damages enemies
    if (projectile.type !== 'ranged-shot') return;

    const isDead = enemy.takeDamage(projectile.damage);
    projectile.deactivate();

    // Show damage number on enemy
    this.damageNumbers?.spawn(enemy.x, enemy.y, projectile.damage, '#00ffff');

    if (isDead) {
      this.onEnemyDeath(enemy);
    }
  }

  private handleProjectilePlayerHit(projBody: MatterJS.BodyType, playerLabel: string): void {
    const projectile = this.findProjectileByBody(projBody);
    if (!projectile || !projectile.active) return;

    // Only emotional-baggage applies slow to players
    if (projectile.type !== 'emotional-baggage') return;

    const playerId = playerLabel.replace('player-', '') as PlayerId;
    const player = playerId === 'kitty' ? this.kitty : this.doggo;

    player.isSlowed = true;
    player.slowExpiry = this.scene.time.now + 3000;

    projectile.deactivate();
  }

  private handleCoinPickup(coinBody: MatterJS.BodyType): void {
    const coin = this.coins.find((c) => c.body === coinBody && c.active);
    if (!coin) return;

    const store = useGameStore.getState();
    store.setCoins(store.coins + coin.value);
    coin.deactivate();
  }

  onEnemyDeath(enemy: Enemy): void {
    // Apply difficulty coin multiplier
    const diffConfig = getDifficulty(useSettingsStore.getState().difficultyId);
    const coinValue = Math.max(1, Math.round(enemy.coinDropValue * diffConfig.coinDropMultiplier));

    // Spawn coin at enemy position
    this.spawnCoin(enemy.x, enemy.y, coinValue);

    // Deactivate enemy
    enemy.deactivate();
  }

  private spawnCoin(x: number, y: number, value: number): void {
    const coin = this.coinPool.find((c) => !c.active);
    if (coin) {
      coin.activate(x, y, value);
    }
  }

  update(time: number): void {
    // Auto-attack: Kitty (ranged)
    this.processAutoAttack(this.kitty, time);

    // Auto-attack: Doggo (melee)
    this.processAutoAttack(this.doggo, time);

    // Clothesline detection
    this.checkClotheslineHits(time);

    // Update projectiles
    for (const proj of this.projectiles) {
      proj.update();
    }
  }

  /**
   * Point-to-line-segment distance formula for clothesline detection.
   */
  private pointToSegmentDistance(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) return Math.sqrt(apx * apx + apy * apy);
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
    const projX = ax + t * abx;
    const projY = ay + t * aby;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  /**
   * Clothesline hit detection — sweep rope through enemies each frame.
   */
  private checkClotheslineHits(time: number): void {
    // Clothesline disabled when tether broken or players touching
    if (!this.tether.isActive) return;
    if (this.tether.broken) return;
    if (this.tether.playersTouching) return;
    if (!this.spawnSystem) return;

    const posA = this.kitty.body.position;
    const posB = this.doggo.body.position;
    const ROPE_HIT_RADIUS = 8;
    const CLOTHESLINE_COOLDOWN = 500; // ms

    const activeEnemies = this.spawnSystem.getActiveEnemies();

    for (const enemy of activeEnemies) {
      // Check cooldown
      if (time - enemy.lastClotheslineHit < CLOTHESLINE_COOLDOWN) continue;

      const d = this.pointToSegmentDistance(enemy.x, enemy.y, posA.x, posA.y, posB.x, posB.y);

      if (d <= ROPE_HIT_RADIUS + enemy.bodyRadius) {
        enemy.lastClotheslineHit = time;

        // Deal clothesline damage
        const isDead = enemy.takeDamage(this.tether.clotheslineDamage);

        // Consume tether durability
        this.tether.consumeDurability();

        // Show clothesline damage number
        this.damageNumbers?.spawn(enemy.x, enemy.y, this.tether.clotheslineDamage, '#ffffff');

        // Compute knockback perpendicular to rope
        const ropeNx = posB.x - posA.x;
        const ropeNy = posB.y - posA.y;
        const ropeLen = Math.sqrt(ropeNx * ropeNx + ropeNy * ropeNy);
        // Perpendicular direction (pointing away from rope toward enemy)
        const perpX = -(ropeNy / ropeLen);
        const perpY = ropeNx / ropeLen;
        // Make sure knockback pushes away from rope
        const enemyToRopeX = enemy.x - (posA.x + posB.x) / 2;
        const enemyToRopeY = enemy.y - (posA.y + posB.y) / 2;
        const dot = enemyToRopeX * perpX + enemyToRopeY * perpY;
        const sign = dot >= 0 ? 1 : -1;

        ((Phaser.Physics.Matter as any).Matter as any).Body.applyForce(
          enemy.body,
          enemy.body.position,
          {
            x: perpX * sign * this.tether.clotheslineKnockback * 0.01,
            y: perpY * sign * this.tether.clotheslineKnockback * 0.01,
          },
        );

        // Stun boss on clothesline hit
        if (enemy instanceof EnemyExLover) {
          enemy.stun();
        }

        // Trigger visual flash
        this.tether.triggerFlash();

        if (isDead) {
          this.onEnemyDeath(enemy);
        }
      }
    }
  }

  private processAutoAttack(player: Player, time: number): void {
    if (player.ammo <= 0) return;
    if (time - player.lastAttackTime < player.attackCooldown) return;

    if (!this.spawnSystem) return;
    const activeEnemies = this.spawnSystem.getActiveEnemies();
    if (activeEnemies.length === 0) return;

    // Find nearest enemy within range
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of activeEnemies) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist <= player.attackRange && dist < nearestDist) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    if (!nearest) return;

    player.lastAttackTime = time;
    player.ammo--;

    // Trigger attack action for sprite swap
    player.setTemporaryAction('attack', time);

    // Damage reduction when players are touching (hugging)
    let damageMultiplier = 1.0;
    if (this.loveReloadSystem?.isDamageReduced) {
      damageMultiplier = this.loveReloadSystem.TOUCH_DAMAGE_MULTIPLIER;
    }

    // Update store
    const store = useGameStore.getState();
    if (player.id === 'kitty') {
      store.setKittyAmmo(player.ammo);
      this.fireRangedShot(player, nearest, damageMultiplier);
    } else {
      store.setDoggoStamina(player.ammo);
      this.performMeleeSwing(player, activeEnemies, damageMultiplier);
    }
  }

  private fireRangedShot(player: Player, target: Enemy, damageMultiplier: number = 1): void {
    const proj = this.rangedPool.find((p) => !p.active);
    if (!proj) return;

    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 6.0;
    const damage = Math.floor(player.attackDamage * damageMultiplier);

    proj.activate(player.x, player.y, (dx / dist) * speed, (dy / dist) * speed, damage, player.id);
  }

  private performMeleeSwing(player: Player, enemies: Enemy[], damageMultiplier: number = 1): void {
    const damage = Math.floor(player.attackDamage * damageMultiplier);
    // Virtual melee attack — distance query, no projectile body
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist <= player.attackRange) {
        const isDead = enemy.takeDamage(damage);

        // Show melee damage number
        this.damageNumbers?.spawn(enemy.x, enemy.y, damage, '#ff8844');

        if (isDead) {
          this.onEnemyDeath(enemy);
        }
      }
    }
  }

  private findEnemyByBody(body: MatterJS.BodyType): Enemy | null {
    if (!this.spawnSystem) return null;
    return this.spawnSystem.enemies.find((e) => e.body === body) ?? null;
  }

  private findProjectileByBody(body: MatterJS.BodyType): Projectile | null {
    return this.projectiles.find((p) => p.body === body) ?? null;
  }

  destroy(): void {
    for (const proj of this.projectiles) {
      proj.destroy();
    }
    for (const coin of this.coins) {
      coin.destroy();
    }
    this.projectiles = [];
    this.coins = [];
    this.rangedPool = [];
    this.coinPool = [];
  }
}
