/**
 * js/engine/transition.js — Fundidos y tarjeta cinemática "NIVEL N — NOMBRE" estilo pérsico.
 * Issue #4 — Cambio de niveles | Rama: feature/sistema-niveles
 */

import { CANVAS, PALETTE } from '../config.js';
import { drawText, fadeScreen } from './renderer.js';

class TransitionManager {
  constructor() {
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = 2;
    this.fadeCallback = null;

    // Tarjeta de intro
    this.introActive = false;
    this.introTimer = 0;
    this.introDuration = 2.8; // ligeramente más larga para disfrutar el arte
    this.levelNumber = 1;
    this.levelName = '';
    this.subtitle = '';
    this.onIntroEnd = null;

    // Partículas de arena interna para la tarjeta
    this._sandParticles = [];
  }

  /**
   * Inicia un fundido a negro o aclarado.
   */
  fade(targetAlpha, speed = 2.5, onComplete = null) {
    this.targetAlpha = targetAlpha;
    this.fadeSpeed = speed;
    this.fadeCallback = onComplete;
  }

  /**
   * Inicia la tarjeta de presentación de nivel cinemática.
   */
  showLevelIntro(num, name, subtitle = 'El reloj de arena despierta', onEnd = null) {
    this.introActive = true;
    this.introTimer = 0;
    this.levelNumber = num;
    this.levelName = name;
    this.subtitle = subtitle;
    this.onIntroEnd = onEnd;
    this.fadeAlpha = 1.0;
    this._spawnSandParticles();
  }

  _spawnSandParticles() {
    this._sandParticles = [];
    const cx = CANVAS.WIDTH / 2;
    for (let i = 0; i < 40; i++) {
      this._sandParticles.push({
        x: cx + (Math.random() - 0.5) * 12,
        y: CANVAS.HEIGHT * 0.42 + Math.random() * 8,
        vx: (Math.random() - 0.5) * 20,
        vy: 15 + Math.random() * 35,
        life: 0.8 + Math.random() * 1.2,
        maxLife: 0,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.4 ? PALETTE.TIME_GOLD : PALETTE.FLAME_LIGHT,
        delay: Math.random() * 1.5,
      });
      this._sandParticles[this._sandParticles.length - 1].maxLife =
        this._sandParticles[this._sandParticles.length - 1].life;
    }
  }

  update(dt) {
    // Actualizar alpha de fundido general
    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.fadeSpeed * dt);
      if (this.fadeAlpha >= this.targetAlpha && this.fadeCallback) {
        const cb = this.fadeCallback;
        this.fadeCallback = null;
        cb();
      }
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.fadeSpeed * dt);
      if (this.fadeAlpha <= this.targetAlpha && this.fadeCallback) {
        const cb = this.fadeCallback;
        this.fadeCallback = null;
        cb();
      }
    }

    // Actualizar tarjeta de presentación de nivel
    if (this.introActive) {
      this.introTimer += dt;

      // Actualizar partículas de arena
      for (const p of this._sandParticles) {
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt; // gravedad suave
      }

      if (this.introTimer >= this.introDuration) {
        this.introActive = false;
        if (this.onIntroEnd) {
          const cb = this.onIntroEnd;
          this.onIntroEnd = null;
          cb();
        }
      }
    }
  }

  draw(ctx) {
    // Dibujo de tarjeta de intro cinemática
    if (this.introActive) {
      const t = this.introTimer / this.introDuration;
      const cx = CANVAS.WIDTH / 2;
      const cy = CANVAS.HEIGHT / 2;

      // Curva de opacidad: fade-in rápido (0-0.18), estable, fade-out (0.82-1.0)
      let cardAlpha;
      if (t < 0.18) {
        cardAlpha = t / 0.18;
      } else if (t > 0.82) {
        cardAlpha = (1.0 - t) / 0.18;
      } else {
        cardAlpha = 1.0;
      }

      ctx.save();

      // ── Fondo: overlay oscuro con vigneta radial ─────────────
      const bgGrad = ctx.createRadialGradient(cx, cy, 60, cx, cy, CANVAS.WIDTH * 0.75);
      bgGrad.addColorStop(0, `rgba(22, 16, 26, ${0.82 * cardAlpha})`);
      bgGrad.addColorStop(0.5, `rgba(14, 10, 16, ${0.90 * cardAlpha})`);
      bgGrad.addColorStop(1, `rgba(0, 0, 0, ${0.96 * cardAlpha})`);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      ctx.globalAlpha = cardAlpha;

      // ── Reloj de arena central grande ────────────────────────
      this._drawLargeHourglass(ctx, cx, cy - 30, this.introTimer);

      // ── Líneas decorativas horizontales con diamantes ─────────
      const lineY1 = cy - 68;
      const lineY2 = cy + 68;
      const lineLen = 200;

      // Animación de entrada: las líneas se extienden desde el centro
      const lineProgress = Math.min(1.0, t / 0.35);
      const currentLineLen = lineLen * lineProgress;

      ctx.strokeStyle = PALETTE.TIME_GOLD;
      ctx.lineWidth = 1.5;

      // Línea superior
      ctx.beginPath();
      ctx.moveTo(cx - currentLineLen, lineY1);
      ctx.lineTo(cx + currentLineLen, lineY1);
      ctx.stroke();

      // Línea inferior
      ctx.beginPath();
      ctx.moveTo(cx - currentLineLen, lineY2);
      ctx.lineTo(cx + currentLineLen, lineY2);
      ctx.stroke();

      // Diamantes en extremos solo cuando las líneas están completas
      if (lineProgress > 0.85) {
        const dAlpha = (lineProgress - 0.85) / 0.15;
        ctx.globalAlpha = cardAlpha * dAlpha;
        this._drawDiamond(ctx, cx - lineLen, lineY1, 5, PALETTE.TIME_GOLD);
        this._drawDiamond(ctx, cx + lineLen, lineY1, 5, PALETTE.TIME_GOLD);
        this._drawDiamond(ctx, cx - lineLen, lineY2, 5, PALETTE.TIME_GOLD);
        this._drawDiamond(ctx, cx + lineLen, lineY2, 5, PALETTE.TIME_GOLD);
        this._drawDiamond(ctx, cx, lineY1, 7, PALETTE.TIME_GOLD_BRIGHT || '#ffdf7a');
        this._drawDiamond(ctx, cx, lineY2, 7, PALETTE.TIME_GOLD_BRIGHT || '#ffdf7a');
        ctx.globalAlpha = cardAlpha;
      }

      // ── Texto "NIVEL N" con slide desde abajo ─────────────────
      const textSlide = Math.max(0, 1.0 - t / 0.22) * 18;
      const textAlpha = Math.min(1.0, t / 0.28);

      ctx.globalAlpha = cardAlpha * textAlpha;
      drawText(`NIVEL ${this.levelNumber}`, cx, lineY1 + 20 + textSlide, {
        font: 'bold 16px "Cinzel", serif',
        color: PALETTE.TIME_GOLD,
        align: 'center',
        shadow: { color: 'rgba(0,0,0,0.95)', blur: 6 },
      });

      // ── Nombre del nivel en grande con Cinzel 900 ─────────────
      const nameSlide = Math.max(0, 1.0 - t / 0.30) * 14;
      ctx.globalAlpha = cardAlpha * Math.min(1.0, t / 0.32);
      drawText(this.levelName.toUpperCase(), cx, lineY1 + 46 + nameSlide, {
        font: 'bold 34px "Cinzel", serif',
        color: PALETTE.BONE_DUST,
        align: 'center',
        shadow: { color: 'rgba(232, 182, 58, 0.25)', blur: 14 },
      });

      // ── Subtítulo en itálica ──────────────────────────────────
      ctx.globalAlpha = cardAlpha * Math.min(1.0, Math.max(0, (t - 0.20) / 0.22));
      drawText(this.subtitle, cx, lineY1 + 82, {
        font: 'italic 18px "Cormorant Garamond", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'center',
        shadow: { color: 'rgba(0,0,0,0.85)', blur: 6 },
      });

      // ── Partículas de arena ────────────────────────────────────
      ctx.globalAlpha = cardAlpha;
      for (const p of this._sandParticles) {
        if (p.delay > 0 || p.life <= 0) continue;
        const alpha = (p.life / p.maxLife) * 0.7;
        ctx.globalAlpha = cardAlpha * alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Dibujo de fundido negro estándar
    if (this.fadeAlpha > 0.01 && !this.introActive) {
      fadeScreen(this.fadeAlpha, PALETTE.DEEP_SHADOW);
    }
  }

  _drawLargeHourglass(ctx, cx, cy, time) {
    ctx.save();
    const t = time;
    const pulse = Math.sin(t * 4) * 0.04 + 1.0;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = PALETTE.TIME_GOLD;
    ctx.shadowBlur = 14;

    // Marco superior e inferior
    ctx.fillStyle = PALETTE.TIME_GOLD;
    ctx.fillRect(-20, -28, 40, 5);
    ctx.fillRect(-20, 23, 40, 5);

    // Silueta del reloj
    ctx.beginPath();
    ctx.moveTo(-18, -23);
    ctx.lineTo(18, -23);
    ctx.lineTo(3, 0);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(232, 182, 58, 0.18)';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.lineTo(18, 23);
    ctx.lineTo(-18, 23);
    ctx.closePath();
    ctx.fillStyle = 'rgba(232, 182, 58, 0.12)';
    ctx.fill();
    ctx.stroke();

    // Arena cayendo en el centro
    ctx.fillStyle = PALETTE.FLAME_LIGHT;
    ctx.fillRect(-1.5, 1, 3, 16);

    // Duna inferior
    ctx.beginPath();
    const dunaW = 10 * Math.min(1, time * 0.8);
    ctx.ellipse(0, 22, dunaW, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawDiamond(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  get isBusy() {
    return this.introActive || Math.abs(this.fadeAlpha - this.targetAlpha) > 0.05;
  }
}

export const transition = new TransitionManager();
