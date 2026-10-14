/**
 * js/engine/entities.js — Entidades interactivas (Hourglass, ExitDoor, Checkpoint, FixedSpikes, HintSign).
 * Issue #5 — Nivel 1 | Rama: feature/nivel-1
 */

import { PALETTE, TILE_SIZE } from '../config.js';
import { drawText } from './renderer.js';

/**
 * Reloj de arena que suma tiempo y puntuación al ser recogido.
 */
export class Hourglass {
  constructor(x, y, timeBonus = 20, scoreValue = 200) {
    this.x = x;
    this.y = y;
    this.timeBonus = timeBonus;
    this.scoreValue = scoreValue;
    this.collected = false;
    this.animTime = Math.random() * 5;
    this.width = 24;
    this.height = 32;
  }

  update(dt, ctx) {
    if (this.collected) return;
    this.animTime += dt;

    // Colisión AABB con el jugador
    const player = ctx.player;
    if (player && this._intersects(player.hitbox)) {
      this.collected = true;
      ctx.time?.addSeconds(this.timeBonus);
      ctx.score?.add(this.scoreValue);
      ctx.events?.emit('collect', { type: 'hourglass', points: this.scoreValue, time: this.timeBonus });
      ctx.events?.emit('sfx', { name: 'collect' });

      if (ctx.particles) {
        ctx.particles.emitTimeSand(this.x + this.width / 2, this.y + this.height / 2, 16);
      }
    }
  }

  _intersects(hb) {
    return (
      this.x < hb.x + hb.w &&
      this.x + this.width > hb.x &&
      this.y < hb.y + hb.h &&
      this.y + this.height > hb.y
    );
  }

  draw(ctx, worldToScreen) {
    if (this.collected) return;

    const floatY = Math.sin(this.animTime * 3) * 4;
    const screen = worldToScreen(this.x, this.y + floatY);

    ctx.save();
    ctx.translate(screen.x + this.width / 2, screen.y + this.height / 2);

    // Halo dorado místico pulsante
    const glow = Math.sin(this.animTime * 4) * 0.2 + 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(242, 193, 78, ${glow})`;
    ctx.fill();

    // Marco exterior de bronce
    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 2;

    // Bulbo superior
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(10, -14);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(233, 217, 184, 0.25)';
    ctx.fill();
    ctx.stroke();

    // Bulbo inferior
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(2, 0);
    ctx.lineTo(10, 14);
    ctx.lineTo(-10, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Arena cayendo
    ctx.fillStyle = PALETTE.TIME_GOLD;
    // Arena en bulbo superior
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(6, -4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Hilo de arena
    ctx.strokeStyle = PALETTE.FLAME_LIGHT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // Montículo inferior
    ctx.beginPath();
    ctx.ellipse(0, 11, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Puerta de salida del nivel (arco persa con puerta de madera reforzada y engranaje).
 */
export class ExitDoor {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 44;
    this.height = 70;
    this.isOpen = false;
    this.openProgress = 0;
  }

  update(dt, ctx) {
    const player = ctx.player;
    if (!player) return;

    const dist = Math.abs(player.x + player.width / 2 - (this.x + this.width / 2));
    if (dist < 48 && Math.abs(player.y - this.y) < 60) {
      this.isOpen = true;
    }

    if (this.isOpen && this.openProgress < 1.0) {
      this.openProgress = Math.min(1.0, this.openProgress + dt * 2.5);
    }
  }

  isPlayerAtExit(player) {
    const dist = Math.abs(player.x + player.width / 2 - (this.x + this.width / 2));
    const vertDist = Math.abs(player.y + player.height - (this.y + this.height));
    return dist < 24 && vertDist < 20;
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);

    ctx.save();
    // Marco de piedra con arco apuntado persa
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.beginPath();
    ctx.moveTo(screen.x - 6, screen.y + this.height);
    ctx.lineTo(screen.x - 6, screen.y + 20);
    ctx.quadraticCurveTo(screen.x + this.width / 2, screen.y - 12, screen.x + this.width + 6, screen.y + 20);
    ctx.lineTo(screen.x + this.width + 6, screen.y + this.height);
    ctx.closePath();
    ctx.fill();

    // Borde de mosaico turquesa
    ctx.strokeStyle = PALETTE.TURQUOISE;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Interior de la puerta (luz del más allá)
    ctx.fillStyle = PALETTE.DEEP_SHADOW;
    ctx.fillRect(screen.x, screen.y + 14, this.width, this.height - 14);

    // Hojas de la puerta abriéndose
    const doorSlide = this.openProgress * (this.width / 2);
    ctx.fillStyle = PALETTE.SANDSTONE_MID;
    // Hoja izquierda
    ctx.fillRect(screen.x, screen.y + 16, this.width / 2 - doorSlide, this.height - 16);
    // Hoja derecha
    ctx.fillRect(screen.x + this.width / 2 + doorSlide, screen.y + 16, this.width / 2 - doorSlide, this.height - 16);

    // Resplandor de escape dorado
    if (this.openProgress > 0) {
      ctx.fillStyle = `rgba(242, 193, 78, ${this.openProgress * 0.4})`;
      ctx.fillRect(screen.x + 4, screen.y + 14, this.width - 8, this.height - 14);
    }

    ctx.restore();
  }
}

/**
 * Checkpoint: pedestal con brasero que enciende fuego turquesa al activarse.
 */
export class Checkpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 42;
    this.active = false;
    this.animTime = 0;
  }

  update(dt, ctx) {
    this.animTime += dt;
    if (this.active) return;

    const player = ctx.player;
    if (player && this._intersects(player.hitbox)) {
      this.active = true;
      ctx.events?.emit('checkpoint', { x: this.x, y: this.y - 20 });
      ctx.events?.emit('sfx', { name: 'checkpoint' });

      if (ctx.particles) {
        ctx.particles.emitSparks(this.x + this.width / 2, this.y + 10, 10, PALETTE.TURQUOISE);
      }
    }
  }

  _intersects(hb) {
    return (
      this.x < hb.x + hb.w &&
      this.x + this.width > hb.x &&
      this.y < hb.y + hb.h &&
      this.y + this.height > hb.y
    );
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);

    ctx.save();
    // Pedestal de piedra tallada
    ctx.fillStyle = PALETTE.SANDSTONE_MID;
    ctx.fillRect(screen.x + 6, screen.y + 18, 20, 24);

    // Copa de bronce del brasero
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.beginPath();
    ctx.moveTo(screen.x + 2, screen.y + 18);
    ctx.lineTo(screen.x + 30, screen.y + 18);
    ctx.lineTo(screen.x + 24, screen.y + 26);
    ctx.lineTo(screen.x + 8, screen.y + 26);
    ctx.closePath();
    ctx.fill();

    // Borde dorado
    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Llama turquesa si está activo
    if (this.active) {
      const flick = Math.sin(this.animTime * 14) * 3;
      ctx.beginPath();
      ctx.moveTo(screen.x + 10, screen.y + 18);
      ctx.quadraticCurveTo(screen.x + 16 + flick, screen.y - 2, screen.x + 22, screen.y + 18);
      ctx.fillStyle = PALETTE.TURQUOISE;
      ctx.shadowColor = PALETTE.TURQUOISE;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Núcleo claro
      ctx.beginPath();
      ctx.moveTo(screen.x + 13, screen.y + 18);
      ctx.quadraticCurveTo(screen.x + 16, screen.y + 4, screen.x + 19, screen.y + 18);
      ctx.fillStyle = PALETTE.BONE_DUST;
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Pinchos fijos de suelo o pared.
 */
export class FixedSpikes {
  constructor(x, y, width = TILE_SIZE, height = 24) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  update(dt, ctx) {
    const player = ctx.player;
    if (player && this._intersects(player.hitbox)) {
      ctx.events?.emit('damage', { amount: 1, source: 'spikes' });
    }
  }

  _intersects(hb) {
    // Caja de daño ligeramente reducida para no frustrar saltos justos
    return (
      this.x + 4 < hb.x + hb.w &&
      this.x + this.width - 4 > hb.x &&
      this.y + 6 < hb.y + hb.h &&
      this.y + this.height > hb.y
    );
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);
    const count = Math.floor(this.width / 12);

    ctx.save();
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.strokeStyle = PALETTE.SANDSTONE_LIGHT;
    ctx.lineWidth = 1;

    this.animTime = (this.animTime || 0) + 0.016;
    for (let i = 0; i < count; i++) {
      const sx = screen.x + i * 12;
      ctx.beginPath();
      ctx.moveTo(sx, screen.y + this.height);
      ctx.lineTo(sx + 6, screen.y);
      ctx.lineTo(sx + 12, screen.y + this.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Brillo y destello metálico sutil
      const shimmer = (Math.sin(this.animTime * 4 + i * 1.5) + 1) * 0.5;
      ctx.fillStyle = shimmer > 0.8 ? '#ffffff' : PALETTE.BONE_DUST;
      ctx.fillRect(sx + 5.5, screen.y + 1, 1, 4);

      if (shimmer > 0.9) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx + 6, screen.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    }
    ctx.restore();
  }
}

/**
 * Cartel con tablilla de arenisca y mensaje breve en español.
 */
export class HintSign {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.width = 32;
    this.height = 36;
    this.isNear = false;
  }

  update(dt, ctx) {
    const player = ctx.player;
    if (!player) return;

    const dist = Math.hypot(
      player.x + player.width / 2 - (this.x + this.width / 2),
      player.y + player.height / 2 - (this.y + this.height / 2)
    );
    this.isNear = dist < 70;
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);

    ctx.save();
    // Tablilla de piedra
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.fillRect(screen.x, screen.y, this.width, this.height);
    ctx.strokeStyle = PALETTE.SANDSTONE_LIGHT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screen.x, screen.y, this.width, this.height);

    // Glifo tallado en oro
    ctx.fillStyle = PALETTE.TIME_GOLD;
    ctx.font = '14px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', screen.x + this.width / 2, screen.y + this.height / 2);

    // Bocadillo tooltip estilizado si el jugador está cerca
    if (this.isNear) {
      const text = this.text;
      ctx.font = '15px "Cormorant Garamond", serif';
      const textMetrics = ctx.measureText(text);
      const padX = 14;
      const boxW = Math.max(120, textMetrics.width + padX * 2);
      const boxH = 26;
      const boxX = screen.x + this.width / 2 - boxW / 2;
      const boxY = screen.y - 38;

      // Caja de pergamino oscuro / piedra
      ctx.fillStyle = 'rgba(18, 14, 22, 0.92)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = PALETTE.TIME_GOLD;
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Puntero triangular hacia el cartel
      ctx.fillStyle = PALETTE.TIME_GOLD;
      ctx.beginPath();
      ctx.moveTo(screen.x + this.width / 2 - 5, boxY + boxH);
      ctx.lineTo(screen.x + this.width / 2 + 5, boxY + boxH);
      ctx.lineTo(screen.x + this.width / 2, boxY + boxH + 5);
      ctx.closePath();
      ctx.fill();

      // Texto nítido con sombra
      drawText(text, screen.x + this.width / 2, boxY + 16, {
        font: '15px "Cormorant Garamond", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'center',
        shadow: { color: 'rgba(0,0,0,0.95)', blur: 4 },
      });
    }

    ctx.restore();
  }
}
