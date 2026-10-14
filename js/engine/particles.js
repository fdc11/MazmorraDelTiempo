/**
 * js/engine/particles.js — Sistema de partículas de alto rendimiento con object pool
 * (polvo, chispas, arena del tiempo, escombros, sangre y humo de muerte).
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

import { PALETTE } from '../config.js';

const MAX_PARTICLES = 400; // Ampliado para efectos de muerte más dramáticos

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.color = PALETTE.BONE_DUST;
    this.gravity = 0;
    this.drag = 0.96;
    this.rotation = 0;
    this.rotSpeed = 0;
    this.type = 'dust'; // 'dust', 'spark', 'time', 'debris', 'blood', 'smoke'
  }

  spawn(x, y, vx, vy, life, size, color, gravity = 0, drag = 0.96, type = 'dust') {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.gravity = gravity;
    this.drag = drag;
    this.type = type;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;
  }
}

// Pool prealocado para cero recolección de basura
const pool = Array.from({ length: MAX_PARTICLES }, () => new Particle());

function getFreeParticle() {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (!pool[i].active) return pool[i];
  }
  // Si se llena, reciclamos la que tenga menor vida restante
  let minLife = Infinity;
  let candidate = pool[0];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    if (pool[i].life < minLife) {
      minLife = pool[i].life;
      candidate = pool[i];
    }
  }
  return candidate;
}

export const particles = {
  /**
   * Genera bocanadas de polvo al aterrizar o frenar.
   */
  emitDust(x, y, count = 5, dirX = 0) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const spreadX = (Math.random() - 0.5) * 80 + dirX * 30;
      const spreadY = -Math.random() * 40 - 10;
      const life = 0.25 + Math.random() * 0.3;
      const size = 3 + Math.random() * 4;
      p.spawn(x + (Math.random() - 0.5) * 16, y, spreadX, spreadY, life, size, PALETTE.BONE_DUST, 80, 0.90, 'dust');
    }
  },

  /**
   * Genera chispas ardientes para antorchas, trampas o impactos metálicos.
   */
  emitSparks(x, y, count = 3, color = PALETTE.FLAME_LIGHT) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const angle = (Math.PI * 1.2) + Math.random() * (Math.PI * 0.6); // Hacia arriba
      const speed = 30 + Math.random() * 60;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.3 + Math.random() * 0.4;
      const size = 1.5 + Math.random() * 2;
      p.spawn(x, y, vx, vy, life, size, color, -40, 0.96, 'spark');
    }
  },

  /**
   * Genera destellos de arena dorada al recoger relojes de arena.
   */
  emitTimeSand(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.4 + Math.random() * 0.4;
      const size = 2 + Math.random() * 3;
      const color = Math.random() > 0.3 ? PALETTE.TIME_GOLD : PALETTE.FLAME_LIGHT;
      p.spawn(x, y, vx, vy, life, size, color, 60, 0.94, 'time');
    }
  },

  /**
   * Genera fragmentos de piedra cuando un piso se derrumba.
   */
  emitDebris(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const vx = (Math.random() - 0.5) * 120;
      const vy = -30 - Math.random() * 80;
      const life = 0.6 + Math.random() * 0.5;
      const size = 3 + Math.random() * 6;
      const color = Math.random() > 0.5 ? PALETTE.SANDSTONE_DARK : PALETTE.SANDSTONE_MID;
      p.spawn(x + (Math.random() - 0.5) * 32, y, vx, vy, life, size, color, 600, 0.98, 'debris');
    }
  },

  /**
   * Gotas de sangre carmesí dramáticas al morir o recibir daño grave.
   */
  emitBlood(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = 40 + Math.random() * 110;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.35 + Math.random() * 0.45;
      const size = 2 + Math.random() * 3.5;
      const color = Math.random() > 0.4 ? PALETTE.CRIMSON : PALETTE.CRIMSON_DARK || '#5e1215';
      p.spawn(x + (Math.random() - 0.5) * 12, y, vx, vy, life, size, color, 500, 0.92, 'blood');
    }
  },

  /**
   * Humo de death: espirales oscuras y grises que suben al morir.
   */
  emitDeathSmoke(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const vx = (Math.random() - 0.5) * 35;
      const vy = -25 - Math.random() * 45;
      const life = 0.7 + Math.random() * 0.8;
      const size = 5 + Math.random() * 10;
      const shade = Math.floor(Math.random() * 3);
      const colors = [PALETTE.STONE_DARK, PALETTE.STONE_MID, PALETTE.NIGHT];
      p.spawn(x + (Math.random() - 0.5) * 20, y - 10, vx, vy, life, size, colors[shade], -20, 0.94, 'smoke');
    }
  },

  /**
   * Chispas de fuego para trampas de llama (emitidas hacia arriba).
   */
  emitFireSparks(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      const p = getFreeParticle();
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 50 + Math.random() * 80;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = 0.25 + Math.random() * 0.35;
      const size = 1.5 + Math.random() * 2;
      const color = Math.random() > 0.5 ? PALETTE.FIRE : PALETTE.FLAME_LIGHT;
      p.spawn(x, y, vx, vy, life, size, color, -30, 0.96, 'spark');
    }
  },

  /**
   * Actualiza todas las partículas activas.
   */
  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (pool[i].active) {
        pool[i].update(dt);
      }
    }
  },

  /**
   * Dibuja las partículas activas en pantalla convirtiendo a coordenadas de cámara.
   */
  draw(ctx, worldToScreen) {
    ctx.save();

    // Agrupar por tipo para reducir cambios de estado de ctx
    let prevType = null;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool[i];
      if (!p.active) continue;

      const screen = worldToScreen(p.x, p.y);
      const t = p.life / p.maxLife; // 1 = nuevo, 0 = muerto
      let alpha = t;

      // Dibujo especializado por tipo
      if (p.type === 'dust' || p.type === 'smoke') {
        // Polvo crece y se desvanece
        const radius = p.size * (p.type === 'dust' ? (1.2 + (1 - t) * 0.8) : (1.5 + (1 - t) * 1.5));
        alpha = t * (p.type === 'smoke' ? 0.45 : 0.65);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'spark' || p.type === 'time') {
        // Chispas con halo luminoso
        alpha = t;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (p.type === 'blood') {
        // Gotas de sangre elípticas
        alpha = Math.min(1, t * 2.5); // aparecen rápido, desaparecen lento
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (p.type === 'debris') {
        // Escombros cuadrados giratorios
        alpha = t;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

      } else {
        // Fallback genérico
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      prevType = p.type;
    }

    ctx.restore();
  },

  /**
   * Reinicia todas las partículas.
   */
  clear() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pool[i].active = false;
    }
  }
};
