/**
 * js/player.js — Jugador cinemático estilo Prince of Persia.
 * Animación esquelética paramétrica, colisiones AABB precisas, agarre de cornisas y física fluida.
 * Issue #2 — Movimiento | Rama: feature/movimiento-jugador
 */

import { PHYSICS, PALETTE, TILE_SIZE, KEYS } from './config.js';
import { isDown, isPressed } from './engine/input.js';

export class Player {
  /**
   * @param {number} x Posición X inicial (px de mundo)
   * @param {number} y Posición Y inicial (px de mundo)
   */
  constructor(x = 100, y = 100) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    // Dimensiones de colisión AABB
    this.width = PHYSICS.HITBOX_WIDTH;   // 26 px
    this.height = PHYSICS.HITBOX_HEIGHT; // 68 px
    this.facing = 1;                     // 1: derecha, -1: izquierda

    // Estados: idle, run, jump, fall, grab, climb, crouch, hurt, dead
    this.state = 'idle';

    // Temporizadores de jugabilidad y game feel
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dropThroughTimer = 0;
    this.isGrounded = false;
    this.wasGrounded = false;

    // Métricas de caída para daño
    this.highestYInAir = y;
    this.lastFallDistance = 0; // en tiles

    // Agarre y escalada de cornisas (ledge grab)
    this.grabLedgeX = 0;
    this.grabLedgeY = 0;
    this.climbTimer = 0;
    this.climbDuration = 0.35;
    this.climbStartX = 0;
    this.climbStartY = 0;
    this.climbTargetX = 0;
    this.climbTargetY = 0;

    // Animación esquelética e interpolación
    this.animTime = 0;
    this.headbandWave = 0;
    this.squashStretchY = 1.0;
    this.squashStretchX = 1.0;
    this.leanAngle = 0; // Inclinación dinámica del torso al correr

    // Callbacks del contrato
    this.onLand = null;       // (distanceTiles) => void
    this.onHazard = null;     // (type) => void
    this.onLedgeGrab = null;  // () => void

    // Hitbox expuesta
    this.hitbox = { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  /**
   * Reinicia la posición física y estado del jugador (p.ej. al respawnear en checkpoint).
   */
  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = 'idle';
    this.facing = 1;
    this.highestYInAir = y;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.dropThroughTimer = 0;
    this.climbTimer = 0;
    this.squashStretchX = 1.0;
    this.squashStretchY = 1.0;
    this.leanAngle = 0;
    this._updateHitbox();
  }

  /**
   * Actualización de física, lógica de estados y colisiones.
   * @param {number} dt Delta time en segundos
   * @param {any} input Módulo de input
   * @param {any} world Contexto del mundo (debe contener world.tilemap)
   * @param {any} [particles] Sistema de partículas opcional
   */
  update(dt, input, world, particles = null) {
    this.animTime += dt;
    const tilemap = world?.tilemap;

    // Recuperación de squash y stretch
    this.squashStretchX += (1.0 - this.squashStretchX) * 12 * dt;
    this.squashStretchY += (1.0 - this.squashStretchY) * 12 * dt;

    if (this.dropThroughTimer > 0) {
      this.dropThroughTimer -= dt;
    }

    // ── ESTADO: MUERTO ───────────────────────────────────────────
    if (this.state === 'dead') {
      this.vy = Math.min(this.vy + PHYSICS.GRAVITY * dt, PHYSICS.TERMINAL_VELOCITY);
      this._moveY(this.vy * dt, tilemap);
      this._updateHitbox();
      return;
    }

    // ── ESTADO: HERIDO (HURT) ────────────────────────────────────
    if (this.state === 'hurt') {
      this.vy = Math.min(this.vy + PHYSICS.GRAVITY * dt, PHYSICS.TERMINAL_VELOCITY);
      this.vx *= 0.90;
      this._moveX(this.vx * dt, tilemap);
      this._moveY(this.vy * dt, tilemap);
      if (this.isGrounded && Math.abs(this.vx) < 10) {
        this.state = 'idle';
      }
      this._updateHitbox();
      return;
    }

    // ── ESTADO: ESCALANDO CORNISA (CLIMB) ────────────────────────
    if (this.state === 'climb') {
      this.climbTimer += dt;
      const t = Math.min(1.0, this.climbTimer / this.climbDuration);
      // Interpolación suave cúbica
      const ease = t * t * (3 - 2 * t);
      this.x = this.climbStartX + (this.climbTargetX - this.climbStartX) * ease;
      this.y = this.climbStartY + (this.climbTargetY - this.climbStartY) * ease;

      if (t >= 1.0) {
        this.state = 'idle';
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = true;
        this.highestYInAir = this.y;
      }
      this._updateHitbox();
      return;
    }

    // ── ESTADO: AGARRADO A LA CORNISA (GRAB) ─────────────────────
    if (this.state === 'grab') {
      this.vx = 0;
      this.vy = 0;

      // Subir con W / Flecha Arriba / Salto
      if (input.isPressed(KEYS.UP) || input.isPressed(KEYS.JUMP)) {
        this.state = 'climb';
        this.climbTimer = 0;
        this.climbStartX = this.x;
        this.climbStartY = this.y;
        this.climbTargetX = this.grabLedgeX + (this.facing > 0 ? 8 : -8);
        this.climbTargetY = this.grabLedgeY - this.height;
        return;
      }

      // Soltarse con S / Flecha Abajo
      if (input.isPressed(KEYS.DOWN)) {
        this.state = 'fall';
        this.vy = 100;
        this.coyoteTimer = 0;
        return;
      }

      this._updateHitbox();
      return;
    }

    // ── CONTROLES Y ENTRADA NORMAL ───────────────────────────────
    const moveLeft = input.isDown(KEYS.LEFT);
    const moveRight = input.isDown(KEYS.RIGHT);
    const crouchKey = input.isDown(KEYS.DOWN);
    const jumpPressed = input.isPressed(KEYS.JUMP);
    const jumpHeld = input.isDown(KEYS.JUMP);

    if (jumpPressed) {
      this.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= dt;
    }

    // Agacharse
    const wantsCrouch = crouchKey && this.isGrounded;

    if (wantsCrouch) {
      this.state = 'crouch';
      this.height = PHYSICS.CROUCH_HEIGHT;
      // Bajar de plataformas 'oneway' presionando abajo + salto
      if (jumpPressed && this._isOnOneWayPlatform(tilemap)) {
        this.dropThroughTimer = 0.25;
        this.isGrounded = false;
        this.y += 4;
      }
    } else {
      this.height = PHYSICS.HITBOX_HEIGHT;
    }

    // Movimiento horizontal
    let targetVx = 0;
    if (!wantsCrouch) {
      if (moveLeft && !moveRight) {
        targetVx = -PHYSICS.RUN_SPEED;
        this.facing = -1;
      } else if (moveRight && !moveLeft) {
        targetVx = PHYSICS.RUN_SPEED;
        this.facing = 1;
      }
    }

    const accel = this.isGrounded ? PHYSICS.ACCEL_GROUND : PHYSICS.ACCEL_AIR;
    const friction = this.isGrounded ? PHYSICS.FRICTION_GROUND : PHYSICS.FRICTION_AIR;

    if (targetVx !== 0) {
      this.vx += (targetVx - this.vx) * Math.min(1.0, accel * dt / PHYSICS.RUN_SPEED);
      if (this.isGrounded && Math.abs(this.vx) > 180 && Math.random() < 0.25 && particles) {
        particles.emitDust(this.x + this.width / 2, this.y + this.height, 1, -this.facing);
      }
    } else {
      this.vx *= friction;
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // Salto con Coyote Time y Jump Buffering
    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0) && !wantsCrouch) {
      this.vy = PHYSICS.JUMP_IMPULSE;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.state = 'jump';
      this.squashStretchY = 1.35;
      this.squashStretchX = 0.80;
      this.highestYInAir = this.y;

      if (particles) {
        particles.emitDust(this.x + this.width / 2, this.y + this.height, 4, 0);
      }
    }

    // Salto de altura variable (al soltar el botón se trunca el impulso hacia arriba)
    if (!jumpHeld && this.vy < PHYSICS.JUMP_CUT_VY) {
      this.vy = PHYSICS.JUMP_CUT_VY;
    }

    // Gravedad asimétrica: mayor peso en descenso para saltos ágiles y responsivos (evita salto flotante)
    const gravityMult = this.vy > 0 ? (PHYSICS.FALL_GRAVITY_MULT || 1.35) : 1.0;
    this.vy = Math.min(this.vy + PHYSICS.GRAVITY * gravityMult * dt, PHYSICS.TERMINAL_VELOCITY);

    // Inclinación suave del cuerpo (lean) al correr
    const targetLean = (this.state === 'run' ? (this.vx / PHYSICS.RUN_SPEED) * 0.12 : 0);
    this.leanAngle += (targetLean - this.leanAngle) * 14 * dt;

    // Registro de altura máxima alcanzada durante el salto para cálculo de daño de caída
    if (!this.isGrounded && this.y < this.highestYInAir) {
      this.highestYInAir = this.y;
    }

    // ── INTEGRACIÓN Y RESOLUCIÓN DE COLISIONES ───────────────────
    this._moveX(this.vx * dt, tilemap);
    this._moveY(this.vy * dt, tilemap);

    // ── DETECCIÓN DE AGARRE DE CORNISA (LEDGE GRAB) ──────────────
    if (!this.isGrounded && this.vy > -180 && this.vy < 350) {
      this._checkLedgeGrab(tilemap);
    }

    // Actualización de estado en suelo / aire
    if (this.isGrounded) {
      if (wantsCrouch) {
        this.state = 'crouch';
      } else if (Math.abs(this.vx) > 20) {
        this.state = 'run';
      } else {
        this.state = 'idle';
      }
      this.coyoteTimer = PHYSICS.COYOTE_TIME;
    } else {
      if (this.state !== 'grab' && this.state !== 'climb') {
        this.state = this.vy < 0 ? 'jump' : 'fall';
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }
    }

    // ── DETECCIÓN DE HAZARDS (PINCHOS ESTÁTICOS) ─────────────────
    if (tilemap) {
      this._checkHazards(tilemap);
    }

    this._updateHitbox();
  }

  _updateHitbox() {
    this.hitbox.x = this.x;
    this.hitbox.y = this.y;
    this.hitbox.w = this.width;
    this.hitbox.h = this.height;
  }

  // ── RESOLUCIÓN DE COLISIÓN EJE X ─────────────────────────────
  _moveX(amount, tilemap) {
    if (!tilemap || amount === 0) return;
    this.x += amount;

    const topRow    = Math.floor(this.y / TILE_SIZE);
    const bottomRow = Math.floor((this.y + this.height - 1) / TILE_SIZE);

    if (amount > 0) {
      const rightCol = Math.floor((this.x + this.width) / TILE_SIZE);
      for (let r = topRow; r <= bottomRow; r++) {
        if (tilemap.isSolid(rightCol, r)) {
          this.x = rightCol * TILE_SIZE - this.width;
          this.vx = 0;
          break;
        }
      }
    } else if (amount < 0) {
      const leftCol = Math.floor(this.x / TILE_SIZE);
      for (let r = topRow; r <= bottomRow; r++) {
        if (tilemap.isSolid(leftCol, r)) {
          this.x = (leftCol + 1) * TILE_SIZE;
          this.vx = 0;
          break;
        }
      }
    }
  }

  // ── RESOLUCIÓN DE COLISIÓN EJE Y ─────────────────────────────
  _moveY(amount, tilemap) {
    if (!tilemap) {
      this.y += amount;
      return;
    }

    this.wasGrounded = this.isGrounded;
    this.isGrounded = false;
    this.y += amount;

    const leftCol  = Math.floor((this.x + 2) / TILE_SIZE);
    const rightCol = Math.floor((this.x + this.width - 3) / TILE_SIZE);

    if (amount > 0) {
      // Cayendo hacia abajo
      const bottomRow = Math.floor((this.y + this.height) / TILE_SIZE);
      const prevBottomRow = Math.floor((this.y + this.height - amount) / TILE_SIZE);

      for (let c = leftCol; c <= rightCol; c++) {
        const isSolidBlock = tilemap.isSolid(c, bottomRow);
        const isOneWay = tilemap.isOneWay(c, bottomRow) && this.dropThroughTimer <= 0;

        // Las plataformas oneway solo colisionan si los pies venían por encima
        if (isSolidBlock || (isOneWay && prevBottomRow < bottomRow)) {
          this.y = bottomRow * TILE_SIZE - this.height;
          this.vy = 0;
          this.isGrounded = true;

          // Evento de aterrizaje y cálculo de tiles caídas
          if (!this.wasGrounded) {
            const fallenPx = Math.max(0, this.y - this.highestYInAir);
            this.lastFallDistance = fallenPx / TILE_SIZE;

            // Squash visual al aterrizar
            this.squashStretchY = Math.max(0.65, 1.0 - (this.lastFallDistance * 0.08));
            this.squashStretchX = Math.min(1.40, 1.0 + (this.lastFallDistance * 0.08));

            if (this.onLand) {
              this.onLand(this.lastFallDistance);
            }
          }
          this.highestYInAir = this.y;
          break;
        }
      }
    } else if (amount < 0) {
      // Ascendiendo hacia arriba
      const topRow = Math.floor(this.y / TILE_SIZE);
      const isLeftSolid = tilemap.isSolid(leftCol, topRow);
      const isRightSolid = tilemap.isSolid(rightCol, topRow);

      if (isLeftSolid || isRightSolid) {
        // Corner Nudge: si el jugador solo roza la esquina por pocos píxeles, se desliza al hueco
        const nudgePx = PHYSICS.CORNER_NUDGE_PX || 5;

        if (isLeftSolid && !isRightSolid) {
          const overlap = (leftCol + 1) * TILE_SIZE - (this.x + 2);
          if (overlap > 0 && overlap <= nudgePx) {
            this.x += overlap;
            return;
          }
        } else if (isRightSolid && !isLeftSolid) {
          const overlap = (this.x + this.width - 3) - rightCol * TILE_SIZE;
          if (overlap > 0 && overlap <= nudgePx) {
            this.x -= overlap;
            return;
          }
        }

        // Colisión frontal normal con techo
        this.y = (topRow + 1) * TILE_SIZE;
        this.vy = 0;
      }
    }
  }

  // ── DETECCIÓN DE CORNISAS (LEDGE GRAB) ────────────────────────
  _checkLedgeGrab(tilemap) {
    const handWorldY = this.y + 12; // Altura aproximada de los brazos extendidos
    const handRow = Math.floor(handWorldY / TILE_SIZE);
    const spaceAboveRow = handRow - 1;

    const checkCol = this.facing > 0
      ? Math.floor((this.x + this.width + 10) / TILE_SIZE)
      : Math.floor((this.x - 10) / TILE_SIZE);

    // Debe haber un bloque sólido donde van las manos y aire encima
    if (tilemap.isSolid(checkCol, handRow) && !tilemap.isSolid(checkCol, spaceAboveRow)) {
      // Comprobar cercanía a la cornisa
      const cornerX = this.facing > 0 ? checkCol * TILE_SIZE : (checkCol + 1) * TILE_SIZE;
      const cornerY = handRow * TILE_SIZE;

      const dist = Math.abs(this.x + (this.facing > 0 ? this.width : 0) - cornerX);
      if (dist < 18) {
        this.state = 'grab';
        this.x = this.facing > 0 ? cornerX - this.width - 2 : cornerX + 2;
        this.y = cornerY - 8;
        this.vx = 0;
        this.vy = 0;
        this.grabLedgeX = cornerX;
        this.grabLedgeY = cornerY;
        if (this.onLedgeGrab) this.onLedgeGrab();
      }
    }
  }

  _isOnOneWayPlatform(tilemap) {
    const checkRow = Math.floor((this.y + this.height + 2) / TILE_SIZE);
    const leftCol  = Math.floor((this.x + 4) / TILE_SIZE);
    const rightCol = Math.floor((this.x + this.width - 4) / TILE_SIZE);
    return tilemap.isOneWay(leftCol, checkRow) || tilemap.isOneWay(rightCol, checkRow);
  }

  _checkHazards(tilemap) {
    const leftCol   = Math.floor(this.x / TILE_SIZE);
    const rightCol  = Math.floor((this.x + this.width) / TILE_SIZE);
    const topRow    = Math.floor(this.y / TILE_SIZE);
    const bottomRow = Math.floor((this.y + this.height) / TILE_SIZE);

    for (let r = topRow; r <= bottomRow; r++) {
      for (let c = leftCol; c <= rightCol; c++) {
        if (tilemap.isHazard(c, r)) {
          if (this.onHazard) {
            this.onHazard('spikes');
            return;
          }
        }
      }
    }
  }

  // ── DIBUJO VECTORIAL ESQUELÉTICO TIPO ROTOSCOPIA ───────────────
  /**
   * Dibuja al personaje con proporciones estilizadas, túnica clara, faja carmesí y cinta al viento.
   * @param {CanvasRenderingContext2D} ctx
   * @param {(wx: number, wy: number) => {x: number, y: number}} worldToScreen
   * @param {boolean} invulnerable Si está en periodo de invulnerabilidad
   */
  draw(ctx, worldToScreen, invulnerable = false) {
    if (invulnerable && Math.floor(this.animTime * 18) % 2 === 0) {
      return; // Parpadeo estético al recibir daño
    }

    const screenPos = worldToScreen(this.x + this.width / 2, this.y + this.height);
    const px = screenPos.x;
    const py = screenPos.y;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(this.facing * this.squashStretchX, this.squashStretchY);

    // Parámetros de animación según estado
    const t = this.animTime;
    let breath = Math.sin(t * 3.5) * 1.5;
    let legL = 0, legR = 0, armL = 0, armR = 0;
    let kneeL = 0, kneeR = 0, elbowL = 0, elbowR = 0;
    let bodyY = -62 + breath;

    if (this.state === 'run') {
      const cycle = t * 14;
      legL = Math.sin(cycle) * 0.75;
      legR = Math.sin(cycle + Math.PI) * 0.75;
      kneeL = Math.max(0, -Math.sin(cycle) * 0.85);
      kneeR = Math.max(0, -Math.sin(cycle + Math.PI) * 0.85);

      armL = -Math.sin(cycle) * 0.65;
      armR = -Math.sin(cycle + Math.PI) * 0.65;
      elbowL = 0.4;
      elbowR = 0.4;
      bodyY = -62 + Math.abs(Math.sin(cycle * 2)) * 3;
    } else if (this.state === 'jump') {
      bodyY = -66;
      legL = -0.3;
      legR = 0.4;
      kneeL = 0.7;
      kneeR = 0.3;
      armL = -1.2;
      armR = -1.0;
    } else if (this.state === 'fall') {
      bodyY = -64;
      legL = 0.2;
      legR = -0.2;
      kneeL = 0.2;
      kneeR = 0.2;
      armL = -0.7;
      armR = -0.5;
    } else if (this.state === 'grab') {
      bodyY = -48;
      armL = -2.1;
      armR = -2.0;
      legL = 0.2 + Math.sin(t * 3) * 0.1;
      legR = 0.1 - Math.sin(t * 3) * 0.1;
    } else if (this.state === 'crouch') {
      bodyY = -38;
      legL = 0.8;
      legR = 0.8;
      kneeL = 1.2;
      kneeR = 1.2;
      armL = 0.4;
      armR = 0.4;
    } else if (this.state === 'dead') {
      // Caída dramática clásica sobre las losas
      bodyY = -8;
      legL = 1.6;
      legR = 1.4;
      armL = 1.5;
      armR = 1.3;
    }

    // Sombra suave en el piso
    if (this.isGrounded && this.state !== 'dead') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(18, 13, 18, 0.45)';
      ctx.fill();
    } else if (this.state === 'dead') {
      // Mancha fúnebre oscura
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(18, 13, 18, 0.70)';
      ctx.fill();
    }

    // 1. Brazo trasero
    this._drawLimb(ctx, 2, bodyY + 16, armR, elbowR, 12, 12, PALETTE.SANDSTONE_LIGHT, PALETTE.BONE_DUST);

    // 2. Pierna trasera
    this._drawLeg(ctx, 4, bodyY + 32, legR, kneeR, 14, 15, PALETTE.NIGHT, PALETTE.SANDSTONE_DARK);

    // 3. Pierna delantera
    this._drawLeg(ctx, -4, bodyY + 32, legL, kneeL, 14, 15, PALETTE.NIGHT, PALETTE.SANDSTONE);

    // 4. Torso y Túnica fluida clara
    ctx.save();
    ctx.translate(0, bodyY + 14);
    ctx.rotate(this.leanAngle);

    // Túnica clara con gradiente suave
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(8, -2);
    ctx.lineTo(11, 22);
    ctx.lineTo(-9, 22);
    ctx.closePath();
    ctx.fillStyle = PALETTE.BONE_DUST;
    ctx.fill();

    // Cinturón / Faja carmesí (Sash)
    ctx.fillStyle = PALETTE.CRIMSON;
    ctx.fillRect(-8, 18, 18, 5);

    // Cola del lazo del cinturón
    ctx.beginPath();
    ctx.moveTo(3, 23);
    ctx.bezierCurveTo(6 + Math.sin(t * 6) * 4, 30, -2, 34, 4 + Math.sin(t * 6 + 1) * 3, 40);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = PALETTE.CRIMSON;
    ctx.stroke();

    ctx.restore();

    // 5. Brazo delantero
    this._drawLimb(ctx, -3, bodyY + 16, armL, elbowL, 12, 12, PALETTE.SANDSTONE_LIGHT, PALETTE.BONE_DUST);

    // 6. Cabeza y Pelo
    ctx.save();
    ctx.translate(2, bodyY + 6);
    ctx.rotate(this.leanAngle * 0.6);

    // Cuello
    ctx.fillStyle = PALETTE.SANDSTONE_LIGHT;
    ctx.fillRect(-2, 0, 4, 5);

    // Rostro estilizado
    ctx.beginPath();
    ctx.ellipse(1, -6, 6, 7.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.BONE_DUST;
    ctx.fill();

    // Pelo negro azabache
    ctx.beginPath();
    ctx.ellipse(-1, -9, 7, 5, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.DEEP_SHADOW;
    ctx.fill();

    // Cinta roja en la frente
    ctx.fillStyle = PALETTE.CRIMSON;
    ctx.fillRect(-5, -8, 11, 2.5);

    // Cola de la cinta ondeando al viento con física de seguimiento
    const windSpeed = (this.state === 'run' ? -8 : -3) + Math.sin(t * 8) * 3;
    ctx.beginPath();
    ctx.moveTo(-5, -7);
    ctx.bezierCurveTo(-12, -7 + windSpeed * 0.2, -18, -6 + windSpeed * 0.5, -24, -8 + windSpeed);
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.CRIMSON;
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }

  _drawLeg(ctx, hipX, hipY, thighAngle, calfAngle, thighLen, calfLen, pantsColor, bootColor) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(thighAngle);

    // Muslo
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = pantsColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, thighLen);
    ctx.stroke();

    // Pantorrilla y bota
    ctx.translate(0, thighLen);
    ctx.rotate(calfAngle);

    ctx.lineWidth = 4.5;
    ctx.strokeStyle = bootColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, calfLen);
    ctx.lineTo(4, calfLen); // Pie hacia adelante
    ctx.stroke();

    ctx.restore();
  }

  _drawLimb(ctx, shoulderX, shoulderY, armAngle, forearmAngle, armLen, forearmLen, skinColor, sleeveColor) {
    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(armAngle);

    // Manga / Brazo superior
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = sleeveColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, armLen);
    ctx.stroke();

    // Antebrazo / Muñequera
    ctx.translate(0, armLen);
    ctx.rotate(forearmAngle);

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, forearmLen);
    ctx.stroke();

    ctx.restore();
  }
}
