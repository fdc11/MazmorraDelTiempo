"""Bucle principal y gestor de escenas (menú, juego, game over, victoria).

Cada pantalla del juego es una "escena" con tres métodos:
    handle_event(evento) · update(dt) · draw(pantalla)
Cambiar de pantalla = game.change_scene(NuevaEscena(game)).
"""
import sys

import pygame

from core.assets import Assets
from core.audio import Audio
from core.game_state import GameState
from core.input import InputManager
from settings import FPS, HEIGHT, LEVELS_DIR, TITLE, WIDTH

# Orden de los niveles. Si un archivo aún no existe (porque su rama no se ha
# fusionado), simplemente se salta. Sin ninguno, se usa el nivel de prueba.
LEVEL_ORDER = ["nivel_1.json", "nivel_2.json", "nivel_3.json"]
LEVEL_FILES = [f for f in LEVEL_ORDER if (LEVELS_DIR / f).exists()] or ["nivel_prueba.json"]


class Scene:
    def __init__(self, game):
        self.game = game

    def handle_event(self, e):
        pass

    def update(self, dt):
        pass

    def draw(self, screen):
        pass


class Game:
    def __init__(self):
        pygame.mixer.pre_init(22050, -16, 1, 512)
        pygame.init()
        pygame.display.set_caption(TITLE)
        flags = pygame.SCALED | pygame.RESIZABLE
        try:
            self.screen = pygame.display.set_mode((WIDTH, HEIGHT), flags, vsync=1)
        except pygame.error:
            self.screen = pygame.display.set_mode((WIDTH, HEIGHT), flags)
        self.clock = pygame.time.Clock()
        self._loading_screen()
        self.audio = Audio()
        self.state = GameState()
        self.input = InputManager()
        Assets.preload()
        self.scene = None
        self.next_scene = None
        self.fade = 0.0
        self.fade_dir = 0
        self.running = True
        try:
            from ui.menu import MenuScene
            self.scene = MenuScene(self)
        except ImportError:          # aún no existe la interfaz: arrancamos directo
            from core.play_scene import PlayScene
            self.scene = PlayScene(self, LEVEL_FILES[0])

    def _loading_screen(self):
        self.screen.fill((26, 20, 54))
        from art.text import blit_text
        blit_text(self.screen, "Cargando la Mazmorra del Tiempo...", 36, (WIDTH / 2, HEIGHT / 2))
        pygame.display.flip()

    # ------------------------------------------------------------- escenas
    def change_scene(self, scene, fade=True):
        if not fade:
            self.scene = scene
            return
        self.next_scene = scene
        self.fade_dir = 1

    def start_new_game(self):
        self.state.reset()
        self.start_level(0)

    def start_level(self, index):
        from core.play_scene import PlayScene
        self.state.level_index = index
        self.change_scene(PlayScene(self, LEVEL_FILES[index]))

    def go_to_menu(self):
        try:
            from ui.menu import MenuScene
            self.audio.play_music("menu")
            self.change_scene(MenuScene(self))
        except ImportError:
            self.start_new_game()

    def quit(self):
        self.running = False

    # ---------------------------------------------------------------- loop
    def run(self):
        while self.running:
            dt = min(self.clock.tick(FPS) / 1000, 1 / 30)
            self.input.begin_frame()
            for e in pygame.event.get():
                if e.type == pygame.QUIT:
                    self.running = False
                elif e.type == pygame.KEYDOWN and e.key == pygame.K_F11:
                    pygame.display.toggle_fullscreen()
                self.input.handle_event(e)
                if self.fade_dir == 0:
                    self.scene.handle_event(e)
            self.input.end_events()
            if self.fade_dir == 0:
                self.scene.update(dt)
            self._update_fade(dt)
            self.scene.draw(self.screen)
            if self.fade > 0:
                veil = pygame.Surface((WIDTH, HEIGHT))
                veil.fill((14, 8, 30))
                veil.set_alpha(int(255 * self.fade))
                self.screen.blit(veil, (0, 0))
            pygame.display.flip()
        self.state.save()
        pygame.quit()
        sys.exit()

    def _update_fade(self, dt):
        if self.fade_dir > 0:
            self.fade = min(1.0, self.fade + dt * 4)
            if self.fade >= 1.0:
                self.scene = self.next_scene
                self.next_scene = None
                self.fade_dir = -1
        elif self.fade_dir < 0:
            self.fade = max(0.0, self.fade - dt * 3)
            if self.fade <= 0:
                self.fade_dir = 0
