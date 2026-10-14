/**
 * js/engine/session.js — Gestión de puntuación acumulada, mejor puntuación (localStorage), tiempo e índice de nivel.
 * Issue #4 — Cambio de niveles | Rama: feature/sistema-niveles
 */

const STORAGE_KEY = 'la_mazmorra_del_tiempo_highscore';

class Session {
  constructor() {
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.currentLevelIndex = 0;
    this.timeLeft = 0;
    this.totalTimeElapsed = 0;
  }

  loadHighScore() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val ? parseInt(val, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(STORAGE_KEY, this.highScore.toString());
      } catch {
        // En modo incógnito o restricciones de iframe
      }
    }
  }

  addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  setTime(seconds) {
    this.timeLeft = Math.max(0, seconds);
  }

  addTime(seconds) {
    this.timeLeft = Math.max(0, this.timeLeft + seconds);
  }

  tickTime(dt) {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.totalTimeElapsed += dt;
    return this.timeLeft;
  }

  resetSession() {
    this.score = 0;
    this.currentLevelIndex = 0;
    this.timeLeft = 0;
    this.totalTimeElapsed = 0;
    this.highScore = this.loadHighScore();
  }

  resetLevelScore(snapshotScore) {
    this.score = snapshotScore;
  }
}

export const session = new Session();
