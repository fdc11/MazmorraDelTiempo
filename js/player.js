/**
 * player.js — Jugador de "La Mazmorra del Tiempo"
 *
 * ════════════════════════════════════════════════════
 * CONTRATO JUGADOR ↔ MUNDO
 * ════════════════════════════════════════════════════
 * El objeto `world` pasado a update(dt, input, world) debe tener:
 *   world.tilemap  — instancia de Tilemap (js/engine/tilemap.js)
 *
 * Lo que expone Player:
 *   player.state          — string: 'idle'|'run'|'jump'|'fall'|'grab'|'climb'|'crouch'
 *   player.facing         — number: 1 (derecha) | -1 (izquierda)
 *   player.x, player.y   — posición del hitbox (esquina superior-izquierda)
 *   player.vx, player.vy — velocidad actual en px/s
 *   player.lastFallDistance — tiles caídas en el último aterrizaje
 *   player.onLand         — callback(distanceTiles) llamado al tocar suelo
 *   player.onHazard       — callback(tileType) llamado al tocar un hazard
 *   player.hitbox         — { x, y, w, h } en coordenadas de mundo (actualizado cada frame)
 *
 * Lo que NO hace player.js:
 *   - No aplica daño ni descuenta vidas (responsabilidad de la rama de vidas)
 *   - No gestiona respawn, Game Over, UI, audio ni niveles
 * ════════════════════════════════════════════════════
 */

import { KEYS, PALETTE, TILE_SIZE } from './config.js';
import { isDown, isPressed, isReleased } from './engine/input.js';
import { getCtx } from './engine/renderer.js';

// ─── Configuración del jugador ────────────────────────────────────────────────

/**
 * Todos los valores numéricos del jugador.
 * Importa y usa PLAYER_CONFIG en los niveles si necesitas ajustar valores.
 */
export const PLAYER_CONFIG = Object.freeze({
  // Hitbox
  HITBOX_W:        10,   // px lógicos, ancho de la caja de colisión
  HITBOX_H:        22,   // px lógicos, alto de la caja de colisión
  SPRITE_W:        12,   // px lógicos, ancho visual (ligeramente mayor)
  SPRITE_H:        24,   // px lógicos, alto visual

  // Movimiento horizontal
  ACCEL_GROUND:   900,   // px/s² — aceleración en suelo
  ACCEL_AIR:      400,   // px/s² — aceleración en aire
  FRICTION_GROUND: 0.70, // factor multiplicativo por frame (mucho frenado)
  FRICTION_AIR:    0.92, // factor multiplicativo por frame (poco frenado)
  MAX_SPEED_X:    100,   // px/s — velocidad máxima horizontal (de PHYSICS)

  // Salto
  JUMP_VY:       -260,   // px/s — impulso (de PHYSICS)
  JUMP_CUT_VY:   -100,   // px/s — velocidad vy al soltar el salto antes de tiempo
  COYOTE_TIME:   0.10,   // s — tiempo de coyote después del borde
  JUMP_BUFFER:   0.10,   // s — ventana de buffer de salto antes de tocar suelo

  // Gravedad
  GRAVITY:        480,   // px/s² — (de PHYSICS)
  MAX_FALL_VY:    320,   // px/s — velocidad terminal de caída

  // Agarre de borde
  GRAB_CHECK_X:     4,   // px — distancia horizontal a la pared para detectar borde
  GRAB_HAND_OFFSET: 4,   // px — offset vertical desde la cabeza hasta las "manos"

  // Trepar
  CLIMB_DURATION: 0.35,  // s — duración de la animación de trepar

  // Caída
  FALL_SAFE_TILES:  3,   // tiles — no cuenta onLand si caída es menor que esto
  FALL_TILE_SIZE:  16,   // px por tile (debe coincidir con TILE_SIZE)

  // Animación
  RUN_FRAME_SPEED:  0.08, // s por frame de carrera
  IDLE_FRAME_SPEED: 0.50, // s por frame de idle
  CLIMB_FRAME_SPEED:0.09, // s por frame de trepar
  DUST_LIFETIME:    0.25, // s — duración de partícula de polvo
  DUST_MAX:           6,  // máximo de partículas simultáneas
});

// ─── Clase Player ─────────────────────────────────────────────────────────────

export class Player {
  /**
   * @param {number} x — posición inicial X del hitbox (px lógicos)
   * @param {number} y — posición inicial Y del hitbox (px lógicos)
   */
  constructor(x, y) {
    // Posición del hitbox (esquina superior-izquierda)
    this.x = x;
    this.y = y;

    // Velocidad
    this.vx = 0;
    this.vy = 0;

    // Estado y orientación
    this.state  = 'idle';
    this.facing = 1; // 1 = derecha, -1 = izquierda

    // Hitbox exportado (actualizado en update)
    this.hitbox = {
      x: x,
      y: y,
      w: PLAYER_CONFIG.HITBOX_W,
      h: PLAYER_CONFIG.HITBOX_H,
    };

    // Flags de suelo
    this._onGround   = false;
    this._wasOnGround = false;

    // Plataforma de un solo sentido — flag para poder bajar
    this._dropThrough = false;
    this._dropTimer   = 0; // s

    // Coyote time
    this._coyoteTimer = 0;

    // Jump buffer
    this._jumpBufferTimer = 0;

    // Jump variable height
    this._jumpHeld   = false;
    this._jumping    = false;

    // Agarre de borde
    this._grabDir    = 0;  // -1 izquierda, 1 derecha, 0 sin agarrar
    this._grabCol    = 0;
    this._grabRow    = 0;

    // Trepar
    this._climbTimer = 0;
    this._climbing   = false;
    this._climbStartY = 0;
    this._climbEndY   = 0;

    // Seguimiento de caída
    this._fallStartY      = 0;
    this._isFalling       = false;
    this.lastFallDistance = 0; // en tiles

    // Callbacks opcionales (la rama de vidas los asigna)
    this.onLand   = null; // (distanceTiles: number) => void
    this.onHazard = null; // (tileType: string) => void

    // Animación
    this._animTimer = 0;
    this._animFrame = 0;

    // Partículas de polvo
    this._dust = []; // { x, y, vx, vy, life, maxLife }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * @param {number} dt              — delta time fijo (s)
   * @param {object} _input          — no se usa directamente (se llama a isDown/isPressed)
   * @param {{ tilemap: import('./engine/tilemap.js').Tilemap }} world
   */
  update(dt, _input, world) {
    const tm = world.tilemap;

    // Si está trepando, gestiona la animación de trepa y sale
    if (this._climbing) {
      this._updateClimb(dt, tm);
      this._updateDust(dt);
      return;
    }

    // Leer inputs
    const leftDown  = isDown(KEYS.LEFT);
    const rightDown = isDown(KEYS.RIGHT);
    const downDown  = isDown(KEYS.DOWN);
    const jumpPress = isPressed(KEYS.JUMP);
    const jumpDown  = isDown(KEYS.JUMP);
    const jumpRel   = isReleased(KEYS.JUMP);

    // ── Estado agarre de borde ────────────────────────────────────────────────
    if (this.state === 'grab') {
      this._handleGrabInput(dt, jumpPress, jumpDown, downDown, tm);
      this._updateDust(dt);
      this._animateByState(dt);
      this._syncHitbox();
      return;
    }

    // ── Timer de soltar plataforma ────────────────────────────────────────────
    if (this._dropTimer > 0) {
      this._dropTimer -= dt;
      if (this._dropTimer <= 0) this._dropThrough = false;
    }

    // Pedir bajar de plataforma de un solo sentido
    if (downDown && this._onGround && !this._dropThrough) {
      this._dropThrough = true;
      this._dropTimer   = 0.15; // s que dura la ventana de drop
    }

    // ── Movimiento horizontal ─────────────────────────────────────────────────
    let ax = 0;
    const accel = this._onGround
      ? PLAYER_CONFIG.ACCEL_GROUND
      : PLAYER_CONFIG.ACCEL_AIR;

    if (leftDown)  { ax = -accel; this.facing = -1; }
    if (rightDown) { ax =  accel; this.facing =  1; }

    this.vx += ax * dt;

    // Fricción cuando no hay input horizontal
    if (!leftDown && !rightDown) {
      const friction = this._onGround
        ? PLAYER_CONFIG.FRICTION_GROUND
        : PLAYER_CONFIG.FRICTION_AIR;
      this.vx *= friction;
      if (Math.abs(this.vx) < 1) this.vx = 0;
    }

    // Clamp velocidad horizontal
    this.vx = clamp(this.vx, -PLAYER_CONFIG.MAX_SPEED_X, PLAYER_CONFIG.MAX_SPEED_X);

    // ── Coyote time ───────────────────────────────────────────────────────────
    if (this._onGround) {
      this._coyoteTimer = PLAYER_CONFIG.COYOTE_TIME;
    } else {
      this._coyoteTimer -= dt;
    }

    // ── Jump buffer ───────────────────────────────────────────────────────────
    if (jumpPress) {
      this._jumpBufferTimer = PLAYER_CONFIG.JUMP_BUFFER;
    } else {
      this._jumpBufferTimer -= dt;
    }

    // ── Salto ─────────────────────────────────────────────────────────────────
    const canJump = this._coyoteTimer > 0 && !this._jumping;
    if (this._jumpBufferTimer > 0 && canJump) {
      this._doJump();
    }

    // Salto variable: soltar la tecla corta el impulso
    if (this._jumping && jumpRel && this.vy < PLAYER_CONFIG.JUMP_CUT_VY) {
      this.vy = PLAYER_CONFIG.JUMP_CUT_VY;
    }
    if (this.vy >= 0) this._jumping = false;

    // ── Agacharse ─────────────────────────────────────────────────────────────
    if (this._onGround && downDown && !leftDown && !rightDown) {
      this.state = 'crouch';
    }

    // ── Gravedad ──────────────────────────────────────────────────────────────
    this.vy += PLAYER_CONFIG.GRAVITY * dt;
    this.vy = Math.min(this.vy, PLAYER_CONFIG.MAX_FALL_VY);

    // ── Seguimiento de caída ──────────────────────────────────────────────────
    if (!this._onGround && this.vy > 0) {
      if (!this._isFalling) {
        this._isFalling  = true;
        this._fallStartY = this.y;
      }
    }

    // ── Mover y colisionar ────────────────────────────────────────────────────
    const prevOnGround = this._onGround;
    this._wasOnGround  = prevOnGround;

    this._moveAndCollide(dt, tm);

    // ── Al aterrizar ──────────────────────────────────────────────────────────
    if (!prevOnGround && this._onGround) {
      this._onLand(tm);
    }

    // ── Detectar agarre de borde ──────────────────────────────────────────────
    if (!this._onGround && this.vy >= 0 && this.state !== 'climb') {
      this._tryGrab(tm);
    }

    // ── Detectar hazard ───────────────────────────────────────────────────────
    this._checkHazard(tm);

    // ── Actualizar estado de animación ────────────────────────────────────────
    this._updateState();
    this._animateByState(dt);

    // ── Partículas ────────────────────────────────────────────────────────────
    this._updateDust(dt);

    // ── Actualizar hitbox exportado ───────────────────────────────────────────
    this._syncHitbox();
  }

  // ─── Salto ────────────────────────────────────────────────────────────────

  _doJump() {
    this.vy               = PLAYER_CONFIG.JUMP_VY;
    this._jumping          = true;
    this._coyoteTimer      = 0;
    this._jumpBufferTimer  = 0;
    this._onGround         = false;
  }

  // ─── Mover y colisionar con tilemap ─────────────────────────────────────────

  /**
   * Aplica velocidad y resuelve colisiones AABB en dos pasadas (X luego Y).
   * Guarda la posición previa para comparación en plataformas de un solo sentido.
   */
  _moveAndCollide(dt, tm) {
    const HW = PLAYER_CONFIG.HITBOX_W;
    const HH = PLAYER_CONFIG.HITBOX_H;

    // ── Eje X ──────────────────────────────────────────────────────────────
    this.x += this.vx * dt;
    this._resolveX(tm, HW, HH);

    // ── Eje Y ──────────────────────────────────────────────────────────────
    this._onGround = false;
    const prevFeetY = this.y + HH;   // pies ANTES de mover en Y
    this.y += this.vy * dt;
    this._resolveY(tm, HW, HH, prevFeetY);
  }

  _resolveX(tm, HW, HH) {
    // Margen vertical para no quedar atascado en esquinas inferiores
    const top    = this.y + 2;
    const bottom = this.y + HH - 2;

    const rowTop    = Math.floor(top    / TILE_SIZE);
    const rowBottom = Math.floor(bottom / TILE_SIZE);

    if (this.vx < 0) {
      // Moviendo a la izquierda — comprobar columna del borde izquierdo
      const col = Math.floor(this.x / TILE_SIZE);
      for (let row = rowTop; row <= rowBottom; row++) {
        if (tm.isSolid(col, row)) {
          this.x = (col + 1) * TILE_SIZE;
          this.vx = 0;
          break;
        }
      }
    } else if (this.vx > 0) {
      // Moviendo a la derecha — comprobar columna del borde derecho
      const col = Math.floor((this.x + HW - 1) / TILE_SIZE);
      for (let row = rowTop; row <= rowBottom; row++) {
        if (tm.isSolid(col, row)) {
          this.x = col * TILE_SIZE - HW;
          this.vx = 0;
          break;
        }
      }
    }
  }

  /**
   * @param {number} prevFeetY — posición Y de los pies ANTES de aplicar vy*dt
   */
  _resolveY(tm, HW, HH, prevFeetY) {
    // Margen horizontal para no quedar atascado en esquinas laterales
    const left  = this.x + 2;
    const right = this.x + HW - 2;

    const colLeft  = Math.floor(left  / TILE_SIZE);
    const colRight = Math.floor(right / TILE_SIZE);

    if (this.vy < 0) {
      // ── Subiendo: comprobar techo ──────────────────────────────────────────
      const row = Math.floor(this.y / TILE_SIZE);
      for (let col = colLeft; col <= colRight; col++) {
        if (tm.isSolid(col, row)) {
          this.y  = (row + 1) * TILE_SIZE;
          this.vy = 0;
          break;
        }
      }
    } else {
      // ── Cayendo o estático: comprobar suelo ───────────────────────────────
      const feetY = this.y + HH;

      // Barrer todas las filas entre la posición anterior y la actual
      // para no atravesar tiles a velocidad alta
      const rowStart = Math.floor((prevFeetY)     / TILE_SIZE);
      const rowEnd   = Math.floor((feetY   - 1)   / TILE_SIZE);

      for (let row = rowStart; row <= rowEnd; row++) {
        let hit = false;

        for (let col = colLeft; col <= colRight; col++) {
          if (tm.isSolid(col, row)) {
            // Suelo sólido: empujar encima
            this.y     = row * TILE_SIZE - HH;
            this.vy    = 0;
            this._onGround = true;
            hit = true;
            break;
          }

          if (!this._dropThrough && tm.isOneWay(col, row)) {
            // Plataforma one-way: colisionar solo si los pies bajan
            // a través de la superficie superior del tile
            const surface = row * TILE_SIZE;
            if (prevFeetY <= surface + 1 && feetY >= surface) {
              this.y     = surface - HH;
              this.vy    = 0;
              this._onGround = true;
              hit = true;
              break;
            }
          }
        }

        if (hit) break; // ya resuelto, no seguir barriendo
      }
    }
  }

  // ─── Aterrizaje ──────────────────────────────────────────────────────────────

  _onLand(tm) {
    if (this._isFalling) {
      const distPx    = this.y - this._fallStartY;
      const distTiles = distPx / PLAYER_CONFIG.FALL_TILE_SIZE;
      this.lastFallDistance = Math.max(0, distTiles);
      this._isFalling = false;

      if (distTiles >= PLAYER_CONFIG.FALL_SAFE_TILES) {
        this.onLand?.(distTiles);
      }

      // Polvo al aterrizar
      if (distTiles >= 1) this._spawnDust(this.x + PLAYER_CONFIG.HITBOX_W / 2, this.y + PLAYER_CONFIG.HITBOX_H, 4);
    }

    // Polvo al frenar en movimiento
    if (Math.abs(this.vx) > 50) {
      this._spawnDust(this.x + PLAYER_CONFIG.HITBOX_W / 2, this.y + PLAYER_CONFIG.HITBOX_H, 2);
    }
  }

  // ─── Detección de hazard ──────────────────────────────────────────────────────

  _checkHazard(tm) {
    const { col: cl, row: rt } = tm.worldToTile(this.x + 1, this.y + 1);
    const { col: cr, row: rb } = tm.worldToTile(
      this.x + PLAYER_CONFIG.HITBOX_W - 2,
      this.y + PLAYER_CONFIG.HITBOX_H - 2,
    );

    for (let row = rt; row <= rb; row++) {
      for (let col = cl; col <= cr; col++) {
        if (tm.isHazard(col, row)) {
          this.onHazard?.(tm.tileAt(col, row));
          return;
        }
      }
    }
  }

  // ─── Agarre de borde ─────────────────────────────────────────────────────────

  /**
   * Intenta detectar borde colgable:
   * - Tile sólido a la altura de las manos (cerca de la cabeza) en la dirección de facing
   * - Tile libre encima de ese sólido
   */
  _tryGrab(tm) {
    const dir = this.vx !== 0 ? Math.sign(this.vx) : this.facing;

    const handY   = this.y + PLAYER_CONFIG.GRAB_HAND_OFFSET;
    const handRow = Math.floor(handY / TILE_SIZE);

    // Columna de la pared lateral
    const sideX = dir === 1
      ? this.x + PLAYER_CONFIG.HITBOX_W + PLAYER_CONFIG.GRAB_CHECK_X
      : this.x                           - PLAYER_CONFIG.GRAB_CHECK_X - 1;
    const sideCol = Math.floor(sideX / TILE_SIZE);

    const wallRow  = handRow;
    const aboveRow = wallRow - 1;

    const wallSolid  = tm.isSolid(sideCol, wallRow);
    const aboveEmpty = !tm.isSolid(sideCol, aboveRow) && !tm.isOneWay(sideCol, aboveRow);

    if (wallSolid && aboveEmpty) {
      this._enterGrab(dir, sideCol, wallRow);
    }
  }

  _enterGrab(dir, col, row) {
    this.state    = 'grab';
    this._grabDir = dir;
    this._grabCol = col;
    this._grabRow = row;
    this.vx = 0;
    this.vy = 0;
    this.facing = dir;

    // Alinear posición con el borde
    const tileTop = row * TILE_SIZE;
    this.y = tileTop - PLAYER_CONFIG.GRAB_HAND_OFFSET;

    if (dir === 1) {
      this.x = col * TILE_SIZE - PLAYER_CONFIG.HITBOX_W;
    } else {
      this.x = (col + 1) * TILE_SIZE;
    }
  }

  _handleGrabInput(dt, jumpPress, jumpDown, downDown, tm) {
    const upDown = isDown(KEYS.UP);

    if (downDown) {
      // Soltar borde
      this._exitGrab();
      this.vy = 20; // pequeño impulso hacia abajo para no re-agarrar
      return;
    }

    if ((upDown || jumpPress) && !this._climbing) {
      // Trepar: animar subida al tile superior
      this._startClimb();
    }
  }

  _exitGrab() {
    this.state    = 'fall';
    this._grabDir = 0;
    this._onGround = false;
  }

  _startClimb() {
    this._climbing    = true;
    this._climbTimer  = 0;
    this.state        = 'climb';

    // Destino de la posición (encima del tile sólido agarrado)
    const aboveTop = (this._grabRow - 1) * TILE_SIZE;
    this._climbStartY = this.y;
    this._climbEndY   = aboveTop - PLAYER_CONFIG.HITBOX_H + TILE_SIZE;

    // X del tile superior (para colocarse encima)
    if (this._grabDir === 1) {
      this._climbEndX = this._grabCol * TILE_SIZE - PLAYER_CONFIG.HITBOX_W;
    } else {
      this._climbEndX = (this._grabCol + 1) * TILE_SIZE;
    }
    this._climbStartX = this.x;
  }

  _updateClimb(dt, tm) {
    this._climbTimer += dt;
    const t = Math.min(this._climbTimer / PLAYER_CONFIG.CLIMB_DURATION, 1);

    // Interpolación suave (ease-out)
    const ease = 1 - (1 - t) * (1 - t);
    this.x = lerp(this._climbStartX, this._climbEndX, ease);
    this.y = lerp(this._climbStartY, this._climbEndY, ease);

    if (t >= 1) {
      // Trepar completado
      this._climbing  = false;
      this._grabDir   = 0;
      this.state      = 'idle';
      this._onGround  = true;
      this.vx = 0;
      this.vy = 0;
    }

    this._animateByState(dt);
    this._syncHitbox();
  }

  // ─── Máquina de estados ───────────────────────────────────────────────────────

  _updateState() {
    if (this.state === 'grab' || this.state === 'climb') return;

    const leftDown  = isDown(KEYS.LEFT);
    const rightDown = isDown(KEYS.RIGHT);
    const downDown  = isDown(KEYS.DOWN);
    const moving    = leftDown || rightDown;

    if (this._onGround) {
      if (downDown && !moving) {
        this.state = 'crouch';
      } else if (moving) {
        this.state = 'run';
      } else {
        this.state = 'idle';
      }
    } else {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    }
  }

  // ─── Animación ────────────────────────────────────────────────────────────────

  _animateByState(dt) {
    const frameSpeed = this._frameSpeedForState();
    this._animTimer += dt;
    if (this._animTimer >= frameSpeed) {
      this._animTimer -= frameSpeed;
      this._animFrame = (this._animFrame + 1) % this._frameCountForState();
    }
  }

  _frameSpeedForState() {
    switch (this.state) {
      case 'run':   return PLAYER_CONFIG.RUN_FRAME_SPEED;
      case 'idle':  return PLAYER_CONFIG.IDLE_FRAME_SPEED;
      case 'climb': return PLAYER_CONFIG.CLIMB_FRAME_SPEED;
      default:      return 0.1;
    }
  }

  _frameCountForState() {
    switch (this.state) {
      case 'idle':  return 2;
      case 'run':   return 6;
      case 'jump':  return 1;
      case 'fall':  return 1;
      case 'grab':  return 1;
      case 'climb': return 4;
      case 'crouch':return 1;
      default:      return 1;
    }
  }

  // ─── Partículas de polvo ──────────────────────────────────────────────────────

  _spawnDust(cx, cy, count) {
    for (let i = 0; i < count && this._dust.length < PLAYER_CONFIG.DUST_MAX; i++) {
      this._dust.push({
        x:       cx + randRange(-4, 4),
        y:       cy,
        vx:      randRange(-20, 20),
        vy:      randRange(-15, -5),
        life:    PLAYER_CONFIG.DUST_LIFETIME,
        maxLife: PLAYER_CONFIG.DUST_LIFETIME,
      });
    }
  }

  _updateDust(dt) {
    for (let i = this._dust.length - 1; i >= 0; i--) {
      const p = this._dust[i];
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vy   += 60 * dt; // gravedad ligera
      p.life -= dt;
      if (p.life <= 0) this._dust.splice(i, 1);
    }
  }

  // ─── Sync hitbox ──────────────────────────────────────────────────────────────

  _syncHitbox() {
    this.hitbox.x = this.x;
    this.hitbox.y = this.y;
    this.hitbox.w = PLAYER_CONFIG.HITBOX_W;
    this.hitbox.h = PLAYER_CONFIG.HITBOX_H;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Dibuja el jugador en coordenadas de mundo.
   * El LLAMADOR es responsable de aplicar/restaurar el transform de cámara.
   * @param {object} _r      — no usado (compatibilidad con la firma del engine)
   * @param {object} _camera — no usado (compatibilidad con la firma del engine)
   */
  draw(_r, _camera) {
    const ctx = getCtx();

    // Dibujar partículas de polvo primero (bajo el jugador)
    this._drawDust(ctx);

    // Dibujar sprite del personaje
    this._drawSprite(ctx);
  }

  // ─── Dibujo del sprite por código ────────────────────────────────────────────

  /**
   * Dibuja el personaje con fillRect, estética rotoscopia Prince of Persia.
   * Paleta: HERO_SKIN (piel), HERO_CLOTH (túnica), TIME_GOLD (cinta), STONE_LIGHT (sombra).
   */
  _drawSprite(ctx) {
    const f    = this._animFrame;
    const st   = this.state;
    const dir  = this.facing; // 1 = derecha, -1 = izquierda

    // Inclinación en aire (lean)
    let lean = 0;
    if (st === 'jump') lean = dir * -1;
    if (st === 'fall') lean =  dir *  1;

    // Offset de respiración idle
    const breathY = (st === 'idle' && f === 1) ? 1 : 0;

    // Centro del sprite (para alinear con hitbox)
    const cx = Math.round(this.x + PLAYER_CONFIG.HITBOX_W / 2);
    const cy = Math.round(this.y);

    ctx.save();
    ctx.translate(cx, cy + breathY);
    if (dir === -1) ctx.scale(-1, 1); // voltear horizontalmente
    if (lean !== 0) ctx.transform(1, 0, lean * 0.08, 1, 0, 0); // shear leve

    switch (st) {
      case 'idle':   this._poseIdle(ctx, f);   break;
      case 'run':    this._poseRun(ctx, f);    break;
      case 'jump':   this._poseJump(ctx);      break;
      case 'fall':   this._poseFall(ctx);      break;
      case 'grab':   this._poseGrab(ctx);      break;
      case 'climb':  this._poseClimb(ctx, f);  break;
      case 'crouch': this._poseCrouch(ctx);    break;
      default:       this._poseIdle(ctx, 0);   break;
    }

    ctx.restore();
  }

  // ─── Utilidades de dibujo ─────────────────────────────────────────────────────

  /** Rectángulo centrado en (cx=0) de la pose actual. */
  _r(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), Math.round(h));
  }

  // ─── Poses ────────────────────────────────────────────────────────────────────

  _poseIdle(ctx, frame) {
    // Cabeza
    this._r(ctx,  0, 0,  6, 5, PALETTE.HERO_SKIN);
    // Cinta en la cabeza (dorada)
    this._r(ctx,  0, 1,  6, 1, PALETTE.TIME_GOLD);
    // Cuello
    this._r(ctx,  0, 5,  2, 2, PALETTE.HERO_SKIN);
    // Torso (túnica)
    this._r(ctx,  0, 7,  8, 7, PALETTE.HERO_CLOTH);
    // Brazo izquierdo (más alejado)
    this._r(ctx, -5, 8,  2, 5, PALETTE.HERO_CLOTH);
    // Brazo derecho (más cercano, brillo)
    this._r(ctx,  5, 8,  2, 5, PALETTE.HERO_SKIN);
    // Cinturón
    this._r(ctx,  0, 14, 8, 1, PALETTE.TIME_DIM);
    // Faldón túnica
    this._r(ctx,  0, 15, 7, 3, PALETTE.HERO_CLOTH);
    // Pierna izquierda
    this._r(ctx, -2, 18, 2, 4, PALETTE.STONE_LIGHT);
    // Pierna derecha
    this._r(ctx,  2, 18, 2, 4, PALETTE.STONE_LIGHT);
    // Pies
    this._r(ctx, -2, 22, 3, 1, PALETTE.STONE_MID);
    this._r(ctx,  2, 22, 3, 1, PALETTE.STONE_MID);
  }

  _poseRun(ctx, frame) {
    // 6 frames de carrera: piernas alternan posiciones
    const legOffsets = [
      [-4, 0], [-2, -2], [0, -3], [2, -2], [4, 0], [2, -2],
    ];
    const [lx, ly] = legOffsets[frame % 6];

    // Cabeza (ligeramente inclinada por velocidad)
    this._r(ctx,  lx * 0.3, 0, 6, 5, PALETTE.HERO_SKIN);
    this._r(ctx,  lx * 0.3, 1, 6, 1, PALETTE.TIME_GOLD);
    // Cuello
    this._r(ctx,  0, 5, 2, 2, PALETTE.HERO_SKIN);
    // Torso
    this._r(ctx,  0, 7, 7, 6, PALETTE.HERO_CLOTH);
    // Brazo trasero (balance)
    this._r(ctx, -4 - lx * 0.3,  8, 2, 4, PALETTE.HERO_CLOTH);
    // Brazo delantero
    this._r(ctx,  4 + lx * 0.3, 8, 2, 4, PALETTE.HERO_SKIN);
    // Faldón
    this._r(ctx,  lx * 0.2, 13, 6, 3, PALETTE.HERO_CLOTH);
    // Piernas (alternando)
    this._r(ctx, lx  - 1, 16, 2, 4 + ly, PALETTE.STONE_LIGHT);
    this._r(ctx, -lx + 1, 16, 2, 4 - ly, PALETTE.STONE_LIGHT);
    // Pies
    this._r(ctx, lx  - 1, 20 + ly, 3, 1, PALETTE.STONE_MID);
    this._r(ctx, -lx + 1, 20 - ly, 3, 1, PALETTE.STONE_MID);
  }

  _poseJump(ctx) {
    // Cuerpo contraído hacia arriba, brazos abiertos
    this._r(ctx,  0, 0,  6, 5, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 1,  6, 1, PALETTE.TIME_GOLD);
    this._r(ctx,  0, 5,  2, 2, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 7,  8, 6, PALETTE.HERO_CLOTH);
    // Brazos extendidos
    this._r(ctx, -6,  6, 2, 4, PALETTE.HERO_CLOTH);
    this._r(ctx,  6,  6, 2, 4, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 13, 6, 2, PALETTE.HERO_CLOTH);
    // Piernas dobladas hacia arriba
    this._r(ctx, -2, 15, 2, 3, PALETTE.STONE_LIGHT);
    this._r(ctx,  2, 15, 2, 3, PALETTE.STONE_LIGHT);
    this._r(ctx, -3, 18, 3, 2, PALETTE.STONE_MID);
    this._r(ctx,  3, 18, 3, 2, PALETTE.STONE_MID);
  }

  _poseFall(ctx) {
    // Cuerpo extendido, piernas hacia abajo
    this._r(ctx,  0, 0,  6, 5, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 1,  6, 1, PALETTE.TIME_GOLD);
    this._r(ctx,  0, 5,  2, 2, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 7,  8, 6, PALETTE.HERO_CLOTH);
    // Brazos hacia arriba (dramático)
    this._r(ctx, -6,  4, 2, 5, PALETTE.HERO_CLOTH);
    this._r(ctx,  6,  4, 2, 5, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 13, 6, 2, PALETTE.HERO_CLOTH);
    // Piernas extendidas
    this._r(ctx, -2, 15, 2, 6, PALETTE.STONE_LIGHT);
    this._r(ctx,  2, 15, 2, 6, PALETTE.STONE_LIGHT);
    this._r(ctx, -2, 21, 3, 1, PALETTE.STONE_MID);
    this._r(ctx,  2, 21, 3, 1, PALETTE.STONE_MID);
  }

  _poseGrab(ctx) {
    // Brazos arriba agarrando el borde, cuerpo colgado
    this._r(ctx,  0, 0, 6, 5, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 1, 6, 1, PALETTE.TIME_GOLD);
    this._r(ctx,  0, 5, 2, 2, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 7, 7, 6, PALETTE.HERO_CLOTH);
    // Brazos extendidos hacia arriba-adelante
    this._r(ctx,  3, -3, 2, 6, PALETTE.HERO_SKIN);
    this._r(ctx,  5, -5, 2, 3, PALETTE.HERO_SKIN);
    this._r(ctx, -4,  5, 2, 4, PALETTE.HERO_CLOTH);
    this._r(ctx,  0, 13, 5, 2, PALETTE.HERO_CLOTH);
    // Piernas colgando
    this._r(ctx, -2, 15, 2, 5, PALETTE.STONE_LIGHT);
    this._r(ctx,  2, 15, 2, 5, PALETTE.STONE_LIGHT);
    this._r(ctx, -2, 20, 3, 2, PALETTE.STONE_MID);
    this._r(ctx,  2, 20, 3, 2, PALETTE.STONE_MID);
  }

  _poseClimb(ctx, frame) {
    // 4 frames de trepa
    const yOffsets = [0, -3, -6, -9];
    const armX     = [4, 3, 2, 1];
    const oy = yOffsets[frame % 4];
    const ax = armX[frame % 4];

    this._r(ctx,  0, oy,     6, 5, PALETTE.HERO_SKIN);
    this._r(ctx,  0, oy + 1, 6, 1, PALETTE.TIME_GOLD);
    this._r(ctx,  0, oy + 5, 2, 2, PALETTE.HERO_SKIN);
    this._r(ctx,  0, oy + 7, 7, 6, PALETTE.HERO_CLOTH);
    this._r(ctx, ax, oy - 2, 2, 6, PALETTE.HERO_SKIN);
    this._r(ctx, -4, oy + 6, 2, 4, PALETTE.HERO_CLOTH);
    this._r(ctx,  0, oy + 13, 5, 2, PALETTE.HERO_CLOTH);
    this._r(ctx, -2, oy + 15, 2, 4, PALETTE.STONE_LIGHT);
    this._r(ctx,  2, oy + 15, 2, 4, PALETTE.STONE_LIGHT);
  }

  _poseCrouch(ctx) {
    // Agachado: cuerpo comprimido
    this._r(ctx,  0, 5,  6, 4, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 6,  6, 1, PALETTE.TIME_GOLD);
    this._r(ctx,  0, 9,  8, 5, PALETTE.HERO_CLOTH);
    this._r(ctx, -5, 9,  2, 3, PALETTE.HERO_CLOTH);
    this._r(ctx,  5, 9,  2, 3, PALETTE.HERO_SKIN);
    this._r(ctx,  0, 14, 7, 2, PALETTE.HERO_CLOTH);
    // Piernas dobladas
    this._r(ctx, -3, 16, 3, 3, PALETTE.STONE_LIGHT);
    this._r(ctx,  3, 16, 3, 3, PALETTE.STONE_LIGHT);
    this._r(ctx, -4, 19, 4, 1, PALETTE.STONE_MID);
    this._r(ctx,  4, 19, 4, 1, PALETTE.STONE_MID);
  }

  // ─── Dibujo de partículas de polvo ───────────────────────────────────────────

  _drawDust(ctx) {
    for (const p of this._dust) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle   = PALETTE.STONE_LIGHT;
      ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Utilidades internas ──────────────────────────────────────────────────────

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}
