"""Pantalla de victoria final con estadísticas y confeti."""
import math
import random


from art import world
from art.backgrounds import Parallax
from core.assets import Assets
from core.game import Scene
from core.particles import ParticleSystem
from settings import GOLD, HEIGHT, TILE, WIDTH
from art.text import blit_text
from ui.widgets import Button, ButtonList, panel


class VictoryScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        st = game.state
        self.bg = Parallax("castillo", world.THEMES["castillo"])
        self.particles = ParticleSystem()
        self.t = 0.0
        self.new_record = st.score >= st.high_score and st.score > 0
        st.save()
        mins, secs = divmod(int(st.total_time), 60)
        self.stats = [
            ("Puntuación", f"{st.score:07d}"),
            ("Relojes de arena", str(st.hourglasses)),
            ("Enemigos derrotados", str(st.enemies_defeated)),
            ("Tiempo total", f"{mins}:{secs:02d}"),
        ]
        self.menu = ButtonList([Button("MENÚ PRINCIPAL", (WIDTH // 2, 640), "menu", width=380)], game.audio)
        self.win = Assets.player()["right"]["win"]
        game.audio.stop_music()
        game.audio.play("victory")

    def handle_event(self, e):
        if self.menu.handle_event(e) == "menu":
            from ui.menu import MenuScene
            self.game.change_scene(MenuScene(self.game))

    def update(self, dt):
        self.t += dt
        self.bg.update(dt)
        self.menu.update(dt)
        self.particles.update(dt)
        if random.random() < dt * 3:
            self.particles.confetti(random.uniform(100, WIDTH - 100), HEIGHT + 10, 30)

    def draw(self, screen):
        self.bg.draw(screen, self.t * 30)
        for x in range(0, WIDTH // TILE + 1):
            screen.blit(world.solid_tile("castillo", False, True, True, True, x % 3, 0), (x * TILE, HEIGHT - TILE))
        self.particles.draw(screen, (0, 0))
        img = self.win[int(self.t * 4) % 2]
        screen.blit(img, (WIDTH / 2 - 420, HEIGHT - TILE - 89 - abs(math.sin(self.t * 5)) * 30))
        s = 1 + math.sin(self.t * 3) * 0.04
        blit_text(screen, "¡VICTORIA!", 104, (WIDTH / 2, 110), GOLD, outline=8, scale=s)
        blit_text(screen, "Has escapado de la Mazmorra del Tiempo", 30, (WIDTH / 2, 190))
        panel(screen, (WIDTH / 2 - 260, 240, 520, 300))
        y = 290
        for label, value in self.stats:
            blit_text(screen, label, 26, (WIDTH / 2 - 220, y), (190, 230, 255), anchor="midleft")
            blit_text(screen, value, 28, (WIDTH / 2 + 220, y), anchor="midright")
            y += 56
        if self.new_record:
            blit_text(screen, "¡NUEVO RÉCORD!", 34, (WIDTH / 2, 572), (255, 120, 140),
                      outline=4, scale=1 + abs(math.sin(self.t * 4)) * 0.1)
        self.menu.draw(screen, self.t)
