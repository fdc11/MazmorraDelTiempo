/**
 * js/engine/traps.js — Trampas palaciegas (RetractableSpikes, CollapsingFloor, PressurePlate, Gate, OscillatingBlade).
 * Issue #6 — Nivel 2 | Rama: feature/nivel-2
 */

import { PALETTE, TILE_SIZE } from '../config.js';

/**
 * Pinchos retráctiles con ciclo legible:
 * Oculto (1.4s) → Aviso con temblor (0.4s) → Fuera y letal (0.8s) → Ocultación (0.3s).
 */
export class RetractableSpikes {
  constructor(x, y, width = TILE_SIZE, height = 28, cycleOffset = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.state = 'hidden'; // 'hidden', 'warning', 'extended', 'retracting'
    this.timer = cycleOffset % 2.9;
    this.vibrateOffset = 0;
  }

  update(dt, ctx) {
    this.timer += dt;
    const cycle = this.timer % 2.9;

    if (cycle < 1.4) {
      this.state = 'hidden';
      this.vibrateOffset = 0;
    } else if (cycle < 1.8) {
      if (this.state !== 'warning') {
        this.state = 'warning';
        ctx.events?.emit('sfx', { name: 'trap-warn' });
      }
      this.vibrateOffset = (Math.random() - 0.5) * 3;
    } else if (cycle < 2.6) {
      if (this.state !== 'extended') {
        this.state = 'extended';
        ctx.events?.emit('sfx', { name: 'spike' });
      }
      this.vibrateOffset = 0;

      // Colisión de daño solo cuando están fuera
      const player = ctx.player;
      if (player && this._intersects(player.hitbox)) {
        ctx.events?.emit('damage', { amount: 1, source: 'retractable-spikes' });
      }
    } else {
      this.state = 'retracting';
      this.vibrateOffset = 0;
    }
  }

  _intersects(hb) {
    return (
      this.x + 4 < hb.x + hb.w &&
      this.x + this.width - 4 > hb.x &&
      this.y + 4 < hb.y + hb.h &&
      this.y + this.height > hb.y
    );
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x + this.vibrateOffset, this.y);

    ctx.save();
    // Base de ranuras en la piedra
    ctx.fillStyle = PALETTE.DEEP_SHADOW;
    ctx.fillRect(screen.x, screen.y + this.height - 6, this.width, 6);

    const count = Math.floor(this.width / 12);

    if (this.state === 'warning') {
      // Las puntas asoman apenas 4px temblando
      ctx.fillStyle = PALETTE.SANDSTONE_LIGHT;
      for (let i = 0; i < count; i++) {
        const sx = screen.x + i * 12;
        ctx.beginPath();
        ctx.moveTo(sx + 2, screen.y + this.height - 6);
        ctx.lineTo(sx + 6, screen.y + this.height - 12);
        ctx.lineTo(sx + 10, screen.y + this.height - 6);
        ctx.closePath();
        ctx.fill();
      }
    } else if (this.state === 'extended') {
      // Pinchos completamente extendidos
      ctx.fillStyle = PALETTE.SANDSTONE_DARK;
      ctx.strokeStyle = PALETTE.TIME_GOLD;
      ctx.lineWidth = 1;

      for (let i = 0; i < count; i++) {
        const sx = screen.x + i * 12;
        ctx.beginPath();
        ctx.moveTo(sx, screen.y + this.height - 6);
        ctx.lineTo(sx + 6, screen.y);
        ctx.lineTo(sx + 12, screen.y + this.height - 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Reflejo metálico afilado y destello periódico
        const shimmer = (Math.sin(this.timer * 8 + i) + 1) * 0.5;
        ctx.fillStyle = shimmer > 0.75 ? '#ffffff' : PALETTE.BONE_DUST;
        ctx.fillRect(sx + 5.5, screen.y + 2, 1, 6);

        // Micro-destello en la punta
        if (shimmer > 0.85) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx + 6, screen.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = PALETTE.SANDSTONE_DARK;
      }
    }
    ctx.restore();
  }
}

/**
 * Piso quebradizo que vibra al ser pisado y se derrumba al vacío.
 */
export class CollapsingFloor {
  constructor(col, row, tileSize = TILE_SIZE) {
    this.col = col;
    this.row = row;
    this.tileSize = tileSize;
    this.x = col * tileSize;
    this.y = row * tileSize;

    this.state = 'idle'; // 'idle', 'shaking', 'falling', 'gone'
    this.shakeTimer = 0;
    this.fallY = 0;
    this.fallVy = 0;
    this.vibrateOffset = 0;
  }

  update(dt, ctx) {
    const tilemap = ctx.world?.tilemap || ctx.tilemap;
    const player = ctx.player;

    if (this.state === 'idle') {
      // Detectar si el jugador pisa este piso
      if (player && player.isGrounded) {
        const footX = player.x + player.width / 2;
        const footY = player.y + player.height;
        if (
          footX >= this.x &&
          footX <= this.x + this.tileSize &&
          Math.abs(footY - this.y) < 8
        ) {
          this.state = 'shaking';
          this.shakeTimer = 0.5; // Vibra durante 0.5 s
          ctx.events?.emit('sfx', { name: 'trap-warn' });
        }
      }
    } else if (this.state === 'shaking') {
      this.shakeTimer -= dt;
      this.vibrateOffset = (Math.random() - 0.5) * 4;

      if (this.shakeTimer <= 0) {
        this.state = 'falling';
        ctx.events?.emit('sfx', { name: 'collapse' });

        // Quitar la colisión sólida del mapa
        if (tilemap) {
          tilemap.setTile(this.col, this.row, '.');
        }

        if (ctx.particles) {
          ctx.particles.emitDebris(this.x + this.tileSize / 2, this.y + this.tileSize / 2, 12);
        }
      }
    } else if (this.state === 'falling') {
      this.fallVy += 800 * dt;
      this.fallY += this.fallVy * dt;
      if (this.fallY > 400) {
        this.state = 'gone';
      }
    }
  }

  draw(ctx, worldToScreen) {
    if (this.state === 'gone') return;

    const screen = worldToScreen(this.x + this.vibrateOffset, this.y + this.fallY);
    const size = this.tileSize;

    ctx.save();
    // Bloque agrietado
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.fillRect(screen.x, screen.y, size, size);

    // Resalte superior
    ctx.fillStyle = PALETTE.SANDSTONE_LIGHT;
    ctx.fillRect(screen.x, screen.y, size, 3);

    // Grietas visibles de rotura inminente
    ctx.strokeStyle = PALETTE.DEEP_SHADOW;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screen.x + 8, screen.y + 4);
    ctx.lineTo(screen.x + 22, screen.y + 18);
    ctx.lineTo(screen.x + 16, screen.y + 36);
    ctx.moveTo(screen.x + 22, screen.y + 18);
    ctx.lineTo(screen.x + 38, screen.y + 24);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Placa de presión que se hunde y activa una reja o trampa vinculada.
 */
export class PressurePlate {
  constructor(x, y, id, onActivate = null) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 10;
    this.id = id;
    this.onActivate = onActivate;
    this.isPressed = false;
    this.sinkY = 0;
  }

  update(dt, ctx) {
    const player = ctx.player;
    let stepping = false;

    if (player) {
      const footX = player.x + player.width / 2;
      const footY = player.y + player.height;
      if (
        footX >= this.x &&
        footX <= this.x + this.width &&
        Math.abs(footY - (this.y + this.height)) < 8
      ) {
        stepping = true;
      }
    }

    if (stepping && !this.isPressed) {
      this.isPressed = true;
      ctx.events?.emit('sfx', { name: 'plate' });
      ctx.events?.emit('plate-activate', { id: this.id });
      if (this.onActivate) this.onActivate();
    }

    // Animación de hundimiento
    const targetSink = this.isPressed ? 5 : 0;
    this.sinkY += (targetSink - this.sinkY) * 15 * dt;
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y + this.sinkY);

    ctx.save();
    // Placa de bronce dorada con marco tallado
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.fillRect(screen.x, screen.y + 4, this.width, this.height - 4);

    ctx.fillStyle = this.isPressed ? PALETTE.TIME_GOLD : PALETTE.SANDSTONE_LIGHT;
    ctx.fillRect(screen.x + 4, screen.y, this.width - 8, 4);

    // Estrella persa central
    ctx.fillStyle = PALETTE.DEEP_SHADOW;
    ctx.fillRect(screen.x + this.width / 2 - 3, screen.y + 1, 6, 2);

    ctx.restore();
  }
}

/**
 * Reja levadiza que se eleva al activarse una placa de presión.
 */
export class Gate {
  constructor(col, row, id, tileSize = TILE_SIZE) {
    this.col = col;
    this.row = row;
    this.id = id;
    this.tileSize = tileSize;
    this.x = col * tileSize;
    this.y = row * tileSize;
    this.width = tileSize;
    this.height = tileSize * 2; // Ocupa 2 tiles de alto
    this.isOpen = false;
    this.liftProgress = 0; // 0 = cerrada, 1 = completamente levantada
  }

  open(tilemap = null) {
    if (!this.isOpen) {
      this.isOpen = true;
      if (tilemap) {
        tilemap.setTile(this.col, this.row, '.');
        tilemap.setTile(this.col, this.row + 1, '.');
      }
    }
  }

  update(dt, ctx) {
    if (this.isOpen && this.liftProgress < 1.0) {
      this.liftProgress = Math.min(1.0, this.liftProgress + dt * 1.5);
    }
  }

  draw(ctx, worldToScreen) {
    const liftOffset = this.liftProgress * (this.height - 4);
    const screen = worldToScreen(this.x, this.y - liftOffset);

    ctx.save();
    // Barrotes verticales de bronce/hierro forjado con puntas
    const barCount = 4;
    const spacing = this.width / barCount;

    ctx.fillStyle = PALETTE.SANDSTONE_MID;
    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 1;

    for (let i = 0; i < barCount; i++) {
      const bx = screen.x + i * spacing + spacing / 2 - 2;
      ctx.fillRect(bx, screen.y, 4, this.height);

      // Puntas afiladas inferiores
      ctx.beginPath();
      ctx.moveTo(bx - 2, screen.y + this.height);
      ctx.lineTo(bx + 2, screen.y + this.height + 8);
      ctx.lineTo(bx + 6, screen.y + this.height);
      ctx.closePath();
      ctx.fillStyle = PALETTE.TIME_GOLD;
      ctx.fill();
    }

    // Travesaño horizontal
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.fillRect(screen.x, screen.y + this.height * 0.4, this.width, 6);
    ctx.fillRect(screen.x, screen.y + this.height * 0.8, this.width, 6);

    ctx.restore();
  }
}

/**
 * Cuchilla oscilante de péndulo estilo cimitarra persa.
 */
export class OscillatingBlade {
  constructor(pivotX, pivotY, chainLength = 140, speed = 2.4, maxAngle = 1.1, phase = 0) {
    this.pivotX = pivotX;
    this.pivotY = pivotY;
    this.chainLength = chainLength;
    this.speed = speed;
    this.maxAngle = maxAngle;
    this.phase = phase;
    this.time = phase;
    this.angle = 0;
    this.bladeX = pivotX;
    this.bladeY = pivotY + chainLength;
    this.hitRadius = 26;
  }

  update(dt, ctx) {
    this.time += dt * this.speed;
    this.angle = Math.sin(this.time) * this.maxAngle;

    this.bladeX = this.pivotX + Math.sin(this.angle) * this.chainLength;
    this.bladeY = this.pivotY + Math.cos(this.angle) * this.chainLength;

    // Colisión circular con el jugador
    const player = ctx.player;
    if (player) {
      const pcx = player.x + player.width / 2;
      const pcy = player.y + player.height / 2;
      const dist = Math.hypot(pcx - this.bladeX, pcy - this.bladeY);

      if (dist < this.hitRadius + player.width / 2) {
        ctx.events?.emit('damage', { amount: 1, source: 'blade' });
      }
    }
  }

  draw(ctx, worldToScreen) {
    const pivot = worldToScreen(this.pivotX, this.pivotY);
    const blade = worldToScreen(this.bladeX, this.bladeY);

    ctx.save();
    // Eje de fijación en el techo
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.beginPath();
    ctx.arc(pivot.x, pivot.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cadena de eslabones
    ctx.strokeStyle = PALETTE.SANDSTONE_MID;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(blade.x, blade.y);
    ctx.stroke();

    // Hoja curva de cimitarra persa
    ctx.save();
    ctx.translate(blade.x, blade.y);
    ctx.rotate(this.angle);

    // Media luna afilada con brillo metálico
    ctx.beginPath();
    ctx.arc(0, 0, 32, -Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.quadraticCurveTo(0, 10, 0, 0);
    ctx.fillStyle = PALETTE.BONE_DUST;
    ctx.fill();

    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reflejo luminoso en el filo con destello periódico
    const shimmer = (Math.sin(this.time * 6) + 1) * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 0.6, false);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + shimmer * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Destello en la punta de la cuchilla
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.cos(Math.PI * 0.6) * 31, Math.sin(Math.PI * 0.6) * 31, 2.5 * shimmer, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}

/**
 * Plataforma móvil suspendida que se desplaza suavemente entre dos puntos (horizontal o vertical).
 * Transporta al jugador con total precisión cuando está encima.
 */
export class MovingPlatform {
  /**
   * @param {number} startX Coordenada X inicial (px mundo)
   * @param {number} startY Coordenada Y inicial (px mundo)
   * @param {number} endX Coordenada X final (px mundo)
   * @param {number} endY Coordenada Y final (px mundo)
   * @param {number} [width=96] Ancho de la losa
   * @param {number} [height=18] Grosor de la plataforma
   * @param {number} [speed=1.2] Velocidad del ciclo de vaivén
   */
  constructor(startX, startY, endX, endY, width = TILE_SIZE * 2, height = 18, speed = 1.2) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.width = width;
    this.height = height;
    this.speed = speed;

    this.t = 0;
    this.x = startX;
    this.y = startY;
    this.dx = 0;
    this.dy = 0;
    this.animTime = 0;
  }

  update(dt, ctx) {
    this.animTime += dt;
    this.t += dt * this.speed;

    // Suavizado sinusoidal natural (ease in/out)
    const progress = (Math.sin(this.t) + 1) / 2;
    const prevX = this.x;
    const prevY = this.y;

    this.x = this.startX + (this.endX - this.startX) * progress;
    this.y = this.startY + (this.endY - this.startY) * progress;
    this.dx = this.x - prevX;
    this.dy = this.y - prevY;

    // Detección y arrastre suave del jugador cuando reposa sobre la plataforma
    const player = ctx.player;
    if (player && player.state !== 'dead') {
      const footX = player.x + player.width / 2;
      const footY = player.y + player.height;

      // Comprobar si el jugador está pisando la superficie superior
      const onPlatform = (
        footX >= this.x - 2 &&
        footX <= this.x + this.width + 2 &&
        Math.abs(footY - this.y) <= 8 &&
        player.vy >= 0
      );

      if (onPlatform) {
        player.y = this.y - player.height;
        player.x += this.dx;
        player.vy = 0;
        player.isGrounded = true;
        player.coyoteTimer = 0.12;
        player._updateHitbox?.();
      }
    }
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);
    const screenStart = worldToScreen(this.startX + this.width / 2, this.startY);
    const screenEnd = worldToScreen(this.endX + this.width / 2, this.endY);

    ctx.save();

    // 1. Cable / carril guía sutil
    ctx.strokeStyle = 'rgba(140, 106, 79, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(screenStart.x, screenStart.y + this.height / 2);
    ctx.lineTo(screenEnd.x, screenEnd.y + this.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Losa de piedra labrada con molduras
    const grad = ctx.createLinearGradient(screen.x, screen.y, screen.x, screen.y + this.height);
    grad.addColorStop(0, PALETTE.SANDSTONE_LIGHT);
    grad.addColorStop(0.3, PALETTE.SANDSTONE_MID);
    grad.addColorStop(1, PALETTE.SANDSTONE_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(screen.x, screen.y, this.width, this.height);

    // Borde superior iluminado (bronce pulido)
    ctx.fillStyle = PALETTE.TIME_GOLD;
    ctx.fillRect(screen.x, screen.y, this.width, 2.5);

    // Juntas y remaches de bronce
    ctx.strokeStyle = PALETTE.DEEP_SHADOW;
    ctx.lineWidth = 1;
    ctx.strokeRect(screen.x + 0.5, screen.y + 0.5, this.width - 1, this.height - 1);

    // Glifos decorativos persas en la base
    ctx.fillStyle = PALETTE.TURQUOISE;
    const numGems = 3;
    const spacing = this.width / (numGems + 1);
    for (let i = 1; i <= numGems; i++) {
      ctx.beginPath();
      ctx.arc(screen.x + i * spacing, screen.y + this.height / 2 + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Trampa de fuego periódica con temporizador visual evidente:
 * Reposo (1.4s) → Aviso con chispas y brillo rojo creciente (0.6s) → Llamarada letal (0.8s) → Enfriamiento (0.4s).
 */
export class FireTrap {
  /**
   * @param {number} x Posición X de la tobera (px mundo)
   * @param {number} y Posición Y de la tobera (px mundo)
   * @param {'up'|'down'|'left'|'right'} direction Dirección de la llamarada
   * @param {number} [range=80] Alcance de la lengua de fuego
   * @param {number} [cycleOffset=0] Desfase en segundos para sincronización rítmica
   */
  constructor(x, y, direction = 'up', range = 84, cycleOffset = 0) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.range = range;
    this.width = (direction === 'up' || direction === 'down') ? 36 : range;
    this.height = (direction === 'up' || direction === 'down') ? range : 36;
    this.cycleDuration = 3.2;
    this.timer = cycleOffset % this.cycleDuration;
    this.state = 'dormant'; // 'dormant', 'warning', 'fire', 'cooldown'
    this.animTime = 0;
  }

  update(dt, ctx) {
    this.animTime += dt;
    this.timer = (this.timer + dt) % this.cycleDuration;

    if (this.timer < 1.4) {
      this.state = 'dormant';
    } else if (this.timer < 2.0) {
      if (this.state !== 'warning') {
        this.state = 'warning';
        ctx.events?.emit('sfx', { name: 'trap-warn' });
      }
      // Emitir pequeñas chispas de advertencia
      if (ctx.particles && Math.random() < 0.3) {
        ctx.particles.emitSparks(this.x + 18, this.y, 2, PALETTE.FIRE);
      }
    } else if (this.timer < 2.8) {
      if (this.state !== 'fire') {
        this.state = 'fire';
        ctx.events?.emit('sfx', { name: 'flame' });
      }

      // Colisión letal cuando el fuego está activo
      const player = ctx.player;
      if (player && this._intersects(player.hitbox)) {
        ctx.events?.emit('damage', { amount: 1, source: 'fire' });
      }
    } else {
      this.state = 'cooldown';
    }
  }

  _intersects(hb) {
    // Caja de daño de la llamarada activa
    let fx = this.x;
    let fy = this.y - this.range;
    let fw = 36;
    let fh = this.range;

    if (this.direction === 'down') {
      fy = this.y;
    } else if (this.direction === 'right') {
      fx = this.x;
      fy = this.y;
      fw = this.range;
      fh = 36;
    } else if (this.direction === 'left') {
      fx = this.x - this.range;
      fy = this.y;
      fw = this.range;
      fh = 36;
    }

    return (
      fx + 4 < hb.x + hb.w &&
      fx + fw - 4 > hb.x &&
      fy + 4 < hb.y + hb.h &&
      fy + fh - 4 > hb.y
    );
  }

  draw(ctx, worldToScreen) {
    const screen = worldToScreen(this.x, this.y);
    const t = this.animTime;

    ctx.save();

    // 1. Tobera o rejilla de bronce en la pared/suelo
    ctx.fillStyle = PALETTE.SANDSTONE_DARK;
    ctx.fillRect(screen.x, screen.y - 4, 36, 10);
    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 1;
    ctx.strokeRect(screen.x, screen.y - 4, 36, 10);

    // Orificios de la tobera
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = this.state === 'warning' ? PALETTE.FIRE : PALETTE.DEEP_SHADOW;
      ctx.fillRect(screen.x + 6 + i * 10, screen.y - 2, 6, 6);
    }

    // 2. Estado de Advertencia: brillo pulsante y brasas
    if (this.state === 'warning') {
      const pulse = Math.sin(t * 20) * 0.2 + 0.4;
      ctx.fillStyle = `rgba(255, 131, 38, ${pulse})`;
      ctx.beginPath();
      ctx.arc(screen.x + 18, screen.y - 2, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Estado de Fuego: llamarada imponente con núcleo brillante
    if (this.state === 'fire') {
      const flick = Math.sin(t * 25) * 5;
      const flameLen = this.range + flick;

      // Resplandor cálido volumétrico
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowGrad = ctx.createRadialGradient(screen.x + 18, screen.y - flameLen * 0.5, 10, screen.x + 18, screen.y - flameLen * 0.5, flameLen * 0.7);
      glowGrad.addColorStop(0, 'rgba(255, 131, 38, 0.35)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(screen.x + 18, screen.y - flameLen * 0.5, flameLen * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Lengua exterior de fuego
      ctx.beginPath();
      ctx.moveTo(screen.x + 4, screen.y - 4);
      ctx.quadraticCurveTo(screen.x + 2 + flick, screen.y - flameLen * 0.6, screen.x + 18 + flick * 0.5, screen.y - flameLen);
      ctx.quadraticCurveTo(screen.x + 34 - flick, screen.y - flameLen * 0.6, screen.x + 32, screen.y - 4);
      ctx.closePath();
      ctx.fillStyle = PALETTE.FIRE;
      ctx.shadowColor = PALETTE.FIRE_DARK;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Núcleo amarillo brillante
      ctx.beginPath();
      ctx.moveTo(screen.x + 10, screen.y - 4);
      ctx.quadraticCurveTo(screen.x + 12, screen.y - flameLen * 0.5, screen.x + 18, screen.y - flameLen * 0.85);
      ctx.quadraticCurveTo(screen.x + 24, screen.y - flameLen * 0.5, screen.x + 26, screen.y - 4);
      ctx.closePath();
      ctx.fillStyle = PALETTE.FLAME_LIGHT;
      ctx.fill();
    }

    ctx.restore();
  }
}
