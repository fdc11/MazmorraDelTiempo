"""Escena de juego: une nivel + jugador + cámara + HUD.

Gestiona: muerte y reaparición, Game Over, tiempo límite, pausa,
paso al siguiente nivel y efecto visual de rebobinado.
"""
import math

import pygame

from core.camera import Camera
from core.game import LEVEL_FILES, Scene
from core.input import InputState
from core.particles import ParticleSystem
from core.player import Player
from levels.level_base import Level
from settings import HEIGHT, SCORE_TIME_BONUS, WIDTH

# La interfaz es de otro integrante: si su rama aún no está fusionada,
# el juego sigue funcionando sin HUD ni menús.
try:
    from ui import level_cards
    from ui.hud import HUD
    from ui.pause import PauseMenu
except ImportError:
    level_cards = HUD = PauseMenu = None


class PlayScene(Scene):
    INTRO_TIME = 2.4

    def __init__(self, game, level_file):
        super().__init__(game)
        self.level_file = level_file
        if level_file in LEVEL_FILES:
            game.state.level_index = LEVEL_FILES.index(level_file)
        self.particles = ParticleSystem()
        self.level = Level(level_file, game.state, game.audio, self.particles)
        self.player = Player(*self.level.start)
        self.camera = Camera(self.level.tilemap.px_w, self.level.tilemap.px_h)
        self.level.attach(self.player, self.camera)
        self.camera.snap(self.player.centerx, self.player.y)
        self.hud = HUD() if HUD else None
        self.time_left = self.level.time_limit
        self.intro = self.INTRO_TIME
        self.complete_timer = 0.0
        self.bonus_counted = 0
        self.pause = None
        self.time_up = False
        self.rewind_fx = 0.0
        self.game.audio.play_music(self.level.music)

    # ------------------------------------------------------------- eventos
    def handle_event(self, e):
        if self.pause:
            action = self.pause.handle_event(e)
            if action == "resume":
                self.pause = None
            elif action == "restart":
                self.game.state.lives = max(1, self.game.state.lives)
                self.game.start_level(self.game.state.level_index)
            elif action == "menu":
                self.game.go_to_menu()
            return
        if self.game.input.state.pause_pressed and not self.level.completed and PauseMenu:
            self.pause = PauseMenu(self.game.audio, self.level.name)
            self.game.audio.play("select")

    # -------------------------------------------------------------- update
    def update(self, dt):
        if self.pause:
            self.pause.update(dt)
            return
        state = self.game.state
        inp = self.game.input.state
        if self.intro > 0:
            self.intro -= dt
            if self.intro > self.INTRO_TIME - 1.0:
                inp = InputState()     # congelado mientras aparece el título

        self.level.update(dt, inp)
        self.particles.update(dt)
        self.camera.update(dt, self.player.centerx, self.player.y, self.player.facing)
        if self.hud:
            self.hud.update(dt, state, self.player)
        self.rewind_fx += ((1.0 if self.player.rewinding else 0.0) - self.rewind_fx) * min(1, dt * 10)

        if not self.player.dead and not self.level.completed and self.intro <= 0:
            if not self.player.rewinding:
                self.time_left -= dt
                state.total_time += dt
            if self.time_left <= 0:
                self.time_left = 0
                self.time_up = True
                self.player.die(self.level)

        if self.player.dead and self.player.dead_timer > 1.8:
            self._on_death()
        if self.level.completed:
            self._on_complete(dt)

    def _on_death(self):
        state = self.game.state
        state.lives -= 1
        if state.lives <= 0:
            self.game.audio.play("gameover")
            self.game.audio.stop_music()
            state.save()
            self.player.dead_timer = -999   # evita repetir mientras hace el fundido
            try:
                from ui.game_over import GameOverScene
                self.game.change_scene(GameOverScene(self.game))
            except ImportError:
                self.game.start_new_game()
            return
        # Reaparecer en el último punto de control
        x, y = self.level.respawn_point or self.level.start
        self.player.respawn(x, y)
        self.level.projectiles.clear()
        self.time_left = self.level.time_limit
        self.time_up = False
        if self.level.boss_started:
            self._reset_boss()
        self.camera.snap(self.player.centerx, self.player.y)
        self.level.announce("¡OTRA VEZ!", 1.2, f"Vidas: {state.lives}")

    def _reset_boss(self):
        from entities.boss import TimeGuardian
        lvl = self.level
        lvl.boss_started = False
        self.camera.bounds = None
        for ty, row in enumerate(lvl.tilemap.rows):
            tx = row.find("B")
            if tx >= 0:
                lvl.boss = TimeGuardian(tx, ty)
                break
        self.game.audio.play_music(lvl.music)

    def _on_complete(self, dt):
        state = self.game.state
        self.complete_timer += dt
        if self.complete_timer > 1.2 and self.time_left > 0:
            step = min(self.time_left, max(1, dt * 90))
            self.time_left -= step
            pts = int(step * SCORE_TIME_BONUS)
            self.bonus_counted += pts
            state.add_score(pts)
            if int(self.complete_timer * 20) % 2 == 0:
                self.game.audio.play("select")
        if self.complete_timer > 1.2 and self.time_left <= 0 and self.complete_timer > 4.2:
            self.complete_timer = -999
            nxt = state.level_index + 1
            state.level_index = nxt
            state.save()
            if nxt < len(LEVEL_FILES):
                self.game.start_level(nxt)
            else:
                try:
                    from ui.victory import VictoryScene
                    self.game.change_scene(VictoryScene(self.game))
                except ImportError:
                    self.game.go_to_menu()

    # ---------------------------------------------------------------- draw
    def draw(self, screen):
        cam = self.camera.offset
        self.level.draw(screen, cam)
        self.particles.draw(screen, cam)
        self.player.draw(screen, cam)
        self.level.draw_front(screen, cam)
        if self.rewind_fx > 0.02:
            self._draw_rewind_fx(screen)
        if self.hud:
            self.hud.draw(screen, self.game.state, self.player, self.level, self.time_left)
        if not level_cards:
            return
        if self.intro > 0:
            level_cards.draw_intro(screen, self.level, self.game.state.level_index, self.INTRO_TIME - self.intro)
        if self.level.completed and self.complete_timer > 0.6:
            level_cards.draw_complete(screen, self.complete_timer - 0.6, self.bonus_counted)
        if self.time_up and self.player.dead:
            level_cards.draw_banner(screen, "¡SE ACABÓ EL TIEMPO!")
        if self.pause:
            self.pause.draw(screen)

    def _draw_rewind_fx(self, screen):
        a = self.rewind_fx
        tint = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        tint.fill((60, 120, 200, int(70 * a)))
        t = pygame.time.get_ticks() / 1000
        for i in range(0, HEIGHT, 6):
            y = (i + t * 240) % HEIGHT
            pygame.draw.line(tint, (180, 230, 255, int(26 * a)), (0, y), (WIDTH, y), 2)
        screen.blit(tint, (0, 0))
        # viñeta de "VHS"
        r = int(14 + 6 * math.sin(t * 20))
        pygame.draw.rect(screen, (160, 220, 255), (r, r, WIDTH - 2 * r, HEIGHT - 2 * r), 3, border_radius=24)
