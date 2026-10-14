/**
 * js/engine/vitals.js — Sistema de salud, vidas, daño por caída y checkpoints (lógica pura sin dependencias).
 * Issue #3 — Vidas | Rama: feature/sistema-vidas
 */

export class Vitals {
  constructor(maxLives = 3, maxHp = 3) {
    this.maxLives = maxLives;
    this.maxHp = maxHp;

    this.lives = maxLives;
    this.hp = maxHp;
    this.invulnerableTimer = 0;
    this.invulnerableDuration = 1.2; // segundos

    this.checkpoint = { x: 0, y: 0 };
    this.isGameOver = false;

    // Callbacks
    this.onDeath = null;     // (source: string) => void
    this.onGameOver = null;  // (source: string) => void — se dispara una sola vez
    this.onDamage = null;    // (amount: number, source: string) => void
  }

  /**
   * Actualiza el temporizador de invulnerabilidad.
   * @param {number} dt Delta time en segundos
   */
  update(dt) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
  }

  /**
   * Aplica daño al jugador si no está en invulnerabilidad.
   * @param {number} amount Corazones de daño
   * @param {string} source Origen del daño ('spikes', 'blade', 'fall', etc.)
   * @returns {boolean} True si se aplicó el daño
   */
  damage(amount = 1, source = 'hazard') {
    if (this.invulnerableTimer > 0 || this.hp <= 0 || this.isGameOver) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableTimer = this.invulnerableDuration;

    if (this.onDamage) {
      this.onDamage(amount, source);
    }

    if (this.hp <= 0) {
      this.kill(source);
    }
    return true;
  }

  /**
   * Mata al jugador instantáneamente (cuesta 1 vida).
   * @param {string} source
   */
  kill(source = 'hazard') {
    if (this.hp <= 0 && this.invulnerableTimer > 0.8) {
      // Evitar doble muerte en el mismo tick
      return;
    }

    this.hp = 0;
    this.lives = Math.max(0, this.lives - 1);
    this.invulnerableTimer = this.invulnerableDuration;

    if (this.onDeath) {
      this.onDeath(source);
    }

    if (this.lives <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      if (this.onGameOver) {
        this.onGameOver(source);
      }
    }
  }

  /**
   * Aplica la regla de daño por caída:
   * - Hasta 2 tiles: 0 daño
   * - 3-4 tiles: 1 de daño por tile extra (3 tiles = 1 daño, 4 tiles = 2 daño)
   * - 5 o más tiles: muerte instantánea
   * @param {number} distanceTiles Distancia de caída en tiles
   */
  applyFall(distanceTiles) {
    if (distanceTiles <= 2.2) {
      return;
    }

    if (distanceTiles >= 4.8) {
      this.kill('fall');
    } else {
      const extraDamage = Math.floor(distanceTiles - 2.0);
      if (extraDamage > 0) {
        this.damage(extraDamage, 'fall');
      }
    }
  }

  /**
   * El tiempo límite se agotó: cuesta una vida y reinicia el intento.
   */
  timeExpired() {
    this.kill('time');
  }

  /**
   * Define la posición del último checkpoint activo.
   */
  setCheckpoint(x, y) {
    this.checkpoint.x = x;
    this.checkpoint.y = y;
  }

  /**
   * Reaparece al jugador en el checkpoint con salud completa e invulnerabilidad temporal.
   */
  respawn() {
    this.hp = this.maxHp;
    this.invulnerableTimer = this.invulnerableDuration;
    return { ...this.checkpoint };
  }

  /**
   * Reinicia la salud para el nivel actual.
   */
  resetLevel() {
    this.hp = this.maxHp;
    this.invulnerableTimer = 0;
  }

  /**
   * Reinicia una partida completa (vidas, salud, estado de game over).
   */
  resetRun() {
    this.lives = this.maxLives;
    this.hp = this.maxHp;
    this.invulnerableTimer = 0;
    this.isGameOver = false;
    this.checkpoint = { x: 0, y: 0 };
  }

  /**
   * Obtiene una copia inmutable del estado vital actual.
   */
  snapshot() {
    return {
      hp:           this.hp,
      maxHp:        this.maxHp,
      lives:        this.lives,
      maxLives:     this.maxLives,
      invulnerable: this.invulnerableTimer > 0,
      isGameOver:   this.isGameOver,
    };
  }
}
