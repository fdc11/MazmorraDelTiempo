/**
 * js/engine/tileRenderer.js — Renderizado vectorial de bloques persas, 3 capas de parallax, iluminación de antorchas y atmósfera.
 * Issue #5 — Nivel 1 | Rama: feature/nivel-1
 */

import { CANVAS, PALETTE, TILE_SIZE } from '../config.js';
import { drawRadialLight } from './renderer.js';

// Semilla determinista para variación de azulejos y grietas en piedra
function pseudoRandom(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

// Motes de polvo y pavesas doradas flotantes ambientales
const AMBIENT_DUST_COUNT = 55;
const ambientDust = Array.from({ length: AMBIENT_DUST_COUNT }, () => ({
  x: Math.random() * CANVAS.WIDTH,
  y: Math.random() * CANVAS.HEIGHT,
  size: 0.8 + Math.random() * 2.2,
  speedX: (Math.random() - 0.5) * 6,
  speedY: -3 - Math.random() * 8,
  wobbleSpeed: 1 + Math.random() * 2.5,
  alphaBase: 0.18 + Math.random() * 0.45,
  phase: Math.random() * Math.PI * 2,
  isEmber: Math.random() > 0.6, // 40% son pavesas doradas con sutil resplandor
}));

export class TileRenderer {
  constructor() {
    this.animTime = 0;
  }

  update(dt) {
    this.animTime += dt;
    // Mover polvo ambiental y pavesas doradas
    for (let i = 0; i < AMBIENT_DUST_COUNT; i++) {
      const d = ambientDust[i];
      d.x += (d.speedX + Math.sin(this.animTime * d.wobbleSpeed + d.phase) * 4) * dt;
      d.y += d.speedY * dt;
      if (d.y < -10) {
        d.y = CANVAS.HEIGHT + 10;
        d.x = Math.random() * CANVAS.WIDTH;
      }
      if (d.x < -10) d.x = CANVAS.WIDTH + 5;
      if (d.x > CANVAS.WIDTH + 10) d.x = -5;
    }
  }

  /**
   * Dibuja las capas de fondo con parallax (bruma, arcos lejanos con azulejos lapislázuli/turquesa y tapices).
   */
  drawBackground(ctx, cameraPos, theme = null) {
    const camX = cameraPos.x;
    const t = this.animTime;

    // ── CAPA 1: Bruma y gradiente de profundidad de mazmorra ─────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
    const topColor = theme?.skyTop || PALETTE.DEEP_SHADOW;
    const botColor = theme?.skyBottom || PALETTE.NIGHT;
    bgGrad.addColorStop(0, topColor);
    bgGrad.addColorStop(1, botColor);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Rayos de luz volumétricos desde ventanas altas
    this._drawLightBeams(ctx, camX * 0.1);

    // ── CAPA 2: Arcos y columnas lejanas con mosaicos persas (Parallax 0.20) ─────
    const layer2Offset = -(camX * 0.20) % 240;
    ctx.save();
    ctx.fillStyle = theme?.farPillars || '#221b28';
    for (let x = layer2Offset - 240; x < CANVAS.WIDTH + 240; x += 160) {
      // Columnas lejanas
      ctx.fillRect(x, 60, 24, CANVAS.HEIGHT - 60);

      // Arco persa apuntado superior
      ctx.beginPath();
      ctx.moveTo(x - 20, 160);
      ctx.quadraticCurveTo(x + 12, 100, x + 44, 160);
      ctx.strokeStyle = theme?.farPillars || '#2b2233';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Franja de azulejo lapislázuli / turquesa apagado
      ctx.fillStyle = theme?.accentTile || PALETTE.LAPIS;
      ctx.fillRect(x + 2, 160, 20, 8);
      ctx.fillStyle = theme?.subAccentTile || PALETTE.TURQUOISE;
      ctx.fillRect(x + 6, 170, 12, 6);
    }
    ctx.restore();

    // ── CAPA 3: Pilares medios con tapices carmesí y bajorrelieves (Parallax 0.45) ──
    const layer3Offset = -(camX * 0.45) % 360;
    ctx.save();
    for (let x = layer3Offset - 360; x < CANVAS.WIDTH + 360; x += 280) {
      // Gran pilar central
      const pilarGrad = ctx.createLinearGradient(x, 0, x + 40, 0);
      pilarGrad.addColorStop(0, '#2d2429');
      pilarGrad.addColorStop(0.5, '#3b2f2a');
      pilarGrad.addColorStop(1, '#241c22');
      ctx.fillStyle = pilarGrad;
      ctx.fillRect(x, 40, 42, CANVAS.HEIGHT - 40);

      // Capitel con relieve
      ctx.fillStyle = '#483933';
      ctx.fillRect(x - 4, 34, 50, 10);

      // Tapiz carmesí bordado colgado del muro
      const sway = Math.sin(t * 1.5 + x) * 2;
      ctx.fillStyle = PALETTE.CRIMSON_DARK;
      ctx.beginPath();
      ctx.moveTo(x + 55, 120);
      ctx.lineTo(x + 85, 120);
      ctx.lineTo(x + 85 + sway, 230);
      ctx.lineTo(x + 70 + sway, 245); // Punta inferior
      ctx.lineTo(x + 55 + sway, 230);
      ctx.closePath();
      ctx.fill();

      // Ribete dorado del tapiz
      ctx.strokeStyle = PALETTE.TIME_GOLD;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Relieve tallado de engranaje o reloj de arena en el muro
      this._drawHourglassRelief(ctx, x + 160, 140);
    }
    ctx.restore();
  }

  _drawLightBeams(ctx, offset) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createLinearGradient(100, 0, 300, CANVAS.HEIGHT);
    grad.addColorStop(0, 'rgba(255, 210, 122, 0.08)');
    grad.addColorStop(0.7, 'rgba(255, 210, 122, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;

    for (let i = 0; i < 3; i++) {
      const bx = ((220 * i + offset) % (CANVAS.WIDTH + 200)) - 100;
      ctx.beginPath();
      ctx.moveTo(bx + 40, 0);
      ctx.lineTo(bx + 90, 0);
      ctx.lineTo(bx + 260, CANVAS.HEIGHT);
      ctx.lineTo(bx + 140, CANVAS.HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawHourglassRelief(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(140, 106, 79, 0.25)';
    ctx.lineWidth = 2;
    // Triángulo superior
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 14);
    ctx.lineTo(x + 12, y - 14);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.stroke();
    // Triángulo inferior
    ctx.beginPath();
    ctx.moveTo(x - 12, y + 14);
    ctx.lineTo(x + 12, y + 14);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja los tiles visibles de la mazmorra con textura de arenisca, juntas y relieve.
   */
  drawTiles(ctx, tilemap, worldToScreen, bounds) {
    const tileSize = tilemap.tileSize;
    const startCol = Math.max(0, Math.floor(bounds.left / tileSize));
    const endCol   = Math.min(tilemap.cols - 1, Math.ceil(bounds.right / tileSize));
    const startRow = Math.max(0, Math.floor(bounds.top / tileSize));
    const endRow   = Math.min(tilemap.rows - 1, Math.ceil(bounds.bottom / tileSize));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const char = tilemap.tileAt(c, r);
        const wx = c * tileSize;
        const wy = r * tileSize;
        const screen = worldToScreen(wx, wy);

        if (char === '#') {
          this._drawSandstoneBlock(ctx, screen.x, screen.y, tileSize, c, r, tilemap);
        } else if (char === '=') {
          this._drawOneWayPlatform(ctx, screen.x, screen.y, tileSize, c, r);
        }
      }
    }
  }

  _drawSandstoneBlock(ctx, x, y, size, col, row, tilemap) {
    const rnd = pseudoRandom(col, row);

    // Gradiente sillar con piedra gris antigua y arenisca oscura
    const grad = ctx.createLinearGradient(x, y, x, y + size);
    grad.addColorStop(0, PALETTE.STONE_LIGHT);
    grad.addColorStop(0.2, PALETTE.STONE_MID);
    grad.addColorStop(0.85, PALETTE.STONE_DARK);
    grad.addColorStop(1, PALETTE.SANDSTONE_DARK);

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, size, size);

    // Bisel superior iluminado si no hay bloque sólido arriba
    const hasBlockAbove = tilemap.isSolid(col, row - 1);
    if (!hasBlockAbove) {
      ctx.fillStyle = PALETTE.SANDSTONE_LIGHT;
      ctx.fillRect(x, y, size, 2.5);
      // Brillo fino superior
      ctx.fillStyle = PALETTE.BONE_DUST;
      ctx.fillRect(x, y, size, 1);
    }

    // Juntas profundas de argamasa oscura
    ctx.strokeStyle = PALETTE.DEEP_SHADOW;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    // Textura y grietas antiguas deterministas
    if (rnd > 0.60) {
      ctx.strokeStyle = 'rgba(14, 10, 16, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.15, y + size * 0.25);
      ctx.lineTo(x + size * 0.45, y + size * 0.50);
      ctx.lineTo(x + size * 0.40, y + size * 0.80);
      ctx.stroke();
    } else if (rnd < 0.20) {
      // Salitre o musgo turquesa seco de mazmorra
      ctx.fillStyle = 'rgba(40, 163, 151, 0.12)';
      ctx.fillRect(x + 6, y + size - 8, size - 12, 6);
    } else if (rnd > 0.45 && rnd < 0.55) {
      // Relieve tallado de rombo persa en algunos sillares
      ctx.strokeStyle = 'rgba(184, 142, 93, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y + 8);
      ctx.lineTo(x + size - 8, y + size / 2);
      ctx.lineTo(x + size / 2, y + size - 8);
      ctx.lineTo(x + 8, y + size / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }

  _drawOneWayPlatform(ctx, x, y, size, col, row) {
    // Viga tallada de madera/arenisca con borde dorado
    ctx.fillStyle = PALETTE.SANDSTONE_MID;
    ctx.fillRect(x, y, size, 14);

    // Resalte superior
    ctx.fillStyle = PALETTE.TIME_GOLD;
    ctx.fillRect(x, y, size, 2.5);

    // Pequeñas ménsulas o moldura inferior
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.fillRect(x + 4, y + 14, 8, 4);
    ctx.fillRect(x + size - 12, y + 14, 8, 4);

    // Sombra de contacto suave debajo
    ctx.fillStyle = 'rgba(18, 13, 18, 0.35)';
    ctx.fillRect(x, y + 18, size, 6);
  }

  /**
   * Pinta antorchas con lenguas de llama animadas y halos de luz volumétrica.
   */
  drawLighting(ctx, torches, worldToScreen) {
    const t = this.animTime;

    // 1. Dibujar cuerpos de antorchas y llamas
    for (const torch of torches) {
      const screen = worldToScreen(torch.x, torch.y);

      // Aplique de bronce en la pared
      ctx.fillStyle = PALETTE.SANDSTONE_DARK;
      ctx.fillRect(screen.x - 4, screen.y + 12, 8, 14);
      ctx.fillStyle = PALETTE.TIME_GOLD;
      ctx.fillRect(screen.x - 6, screen.y + 10, 12, 3);

      // Llama animada con 3 lenguas mediante curvas Bezier
      this._drawTorchFlame(ctx, screen.x, screen.y + 8, t + torch.x);
    }

    // 2. Halo de luz cálida con mezcla 'lighter'
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const torch of torches) {
      const screen = worldToScreen(torch.x, torch.y);
      const flicker = Math.sin(t * 12 + torch.x) * 6 + Math.cos(t * 7 + torch.y) * 4;
      const radius = 140 + flicker;

      const lightGrad = ctx.createRadialGradient(screen.x, screen.y + 4, 0, screen.x, screen.y + 4, radius);
      lightGrad.addColorStop(0, 'rgba(255, 210, 122, 0.32)');
      lightGrad.addColorStop(0.4, 'rgba(255, 154, 60, 0.16)');
      lightGrad.addColorStop(0.8, 'rgba(255, 154, 60, 0.04)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y + 4, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Polvo flotante iluminado por las antorchas
    this._drawAmbientDust(ctx);

    // 4. Viñeta oscura en las esquinas de la pantalla
    this._drawVignette(ctx);
  }

  _drawTorchFlame(ctx, x, y, time) {
    const flick1 = Math.sin(time * 15) * 3;
    const flick2 = Math.cos(time * 22) * 2;

    ctx.save();
    // Llama exterior naranja
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(x - 6 + flick1, y - 14, x + flick2, y - 22);
    ctx.quadraticCurveTo(x + 6 + flick1, y - 14, x + 5, y);
    ctx.closePath();
    ctx.fillStyle = PALETTE.FIRE;
    ctx.shadowColor = PALETTE.FIRE;
    ctx.shadowBlur = 10;
    ctx.fill();

    // Núcleo amarillo brillante
    ctx.beginPath();
    ctx.moveTo(x - 2.5, y);
    ctx.quadraticCurveTo(x - 3, y - 8, x + flick1 * 0.5, y - 14);
    ctx.quadraticCurveTo(x + 3, y - 8, x + 2.5, y);
    ctx.closePath();
    ctx.fillStyle = PALETTE.FLAME_LIGHT;
    ctx.fill();
    ctx.restore();
  }

  _drawAmbientDust(ctx) {
    ctx.save();
    for (let i = 0; i < AMBIENT_DUST_COUNT; i++) {
      const d = ambientDust[i];
      const pulse = 0.55 + Math.sin(this.animTime * 2.5 + d.phase) * 0.45;
      const alpha = d.alphaBase * pulse;
      ctx.globalAlpha = Math.min(1, Math.max(0, alpha));

      if (d.isEmber) {
        ctx.fillStyle = PALETTE.FLAME_LIGHT;
        ctx.shadowColor = PALETTE.FIRE;
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = PALETTE.SANDSTONE_LIGHT;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawVignette(ctx) {
    ctx.save();
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;
    const grad = ctx.createRadialGradient(cx, cy, CANVAS.WIDTH * 0.32, cx, cy, CANVAS.WIDTH * 0.65);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(18, 13, 18, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    ctx.restore();
  }
}
