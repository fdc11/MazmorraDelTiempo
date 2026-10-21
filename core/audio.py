"""Sonido: efectos y música sintetizados por código.

* Si existe un archivo en assets/sounds/<nombre>.(wav|ogg) se usa ese en
  lugar del sintetizado. Igual con assets/music/<pista>.(ogg|mp3|wav).
* Si el equipo no tiene tarjeta de sonido, todo falla en silencio.
"""
import math
import random
import threading
from array import array

import pygame

from settings import BASE_DIR

SOUND_DIR = BASE_DIR / "assets" / "sounds"
MUSIC_DIR = BASE_DIR / "assets" / "music"

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def midi_freq(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Audio:
    def __init__(self):
        self.ok = False
        self.sounds = {}
        self.music = {}
        self.current_track = None
        self.channel = None
        self.sfx_volume = 0.55
        self.music_volume = 0.32
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(22050, -16, 1, 512)
            self.rate, _, self.channels = pygame.mixer.get_init()
            self.ok = True
        except pygame.error:
            return
        self._build_sfx()
        threading.Thread(target=self._build_music, daemon=True).start()

    # ------------------------------------------------------------------ util
    def _to_sound(self, samples, volume=1.0):
        buf = array("h")
        for v in samples:
            v = max(-1.0, min(1.0, v * volume))
            iv = int(v * 32000)
            for _ in range(self.channels):
                buf.append(iv)
        return pygame.mixer.Sound(buffer=buf.tobytes())

    def _synth(self, dur, freq_fn, wave="sine", attack=0.005, decay=None, noise=0.0):
        n = int(self.rate * dur)
        out = []
        phase = 0.0
        for i in range(n):
            t = i / self.rate
            f = freq_fn(t / dur)
            phase += f / self.rate
            p = phase % 1.0
            if wave == "sine":
                v = math.sin(p * math.tau)
            elif wave == "tri":
                v = 4 * abs(p - 0.5) - 1
            elif wave == "square":
                v = 0.6 if p < 0.5 else -0.6
            else:
                v = 0
            if noise:
                v = v * (1 - noise) + random.uniform(-1, 1) * noise
            env = min(1.0, t / attack) if attack else 1.0
            env *= (1 - t / dur) ** (decay if decay else 1.5)
            out.append(v * env)
        return out

    def _load_file(self, folder, name):
        for ext in (".ogg", ".wav", ".mp3"):
            path = folder / f"{name}{ext}"
            if path.exists():
                return path
        return None

    # ------------------------------------------------------------------- sfx
    def _build_sfx(self):
        recipes = {
            "jump": lambda: self._synth(0.16, lambda u: 380 + 520 * u, "tri", decay=1.2),
            "coin": lambda: self._synth(0.08, lambda u: 988, "sine") + self._synth(0.22, lambda u: 1318, "sine", decay=2),
            "punch": lambda: self._synth(0.09, lambda u: 160 - 80 * u, "sine", noise=0.55, decay=2),
            "hit": lambda: self._synth(0.14, lambda u: 220 - 120 * u, "square", noise=0.3, decay=2),
            "stomp": lambda: self._synth(0.12, lambda u: 300 - 220 * u, "sine", decay=1.4),
            "hurt": lambda: self._synth(0.35, lambda u: 520 - 380 * u, "square", decay=1.2),
            "heal": lambda: self._synth(0.3, lambda u: 523 + 523 * (u > 0.33) + 261 * (u > 0.66), "sine"),
            "checkpoint": lambda: self._synth(0.45, lambda u: [523, 659, 784, 1046][min(3, int(u * 4))], "tri", decay=0.8),
            "portal": lambda: self._synth(0.9, lambda u: 200 + 900 * u * u, "sine", decay=0.7),
            "rewind": lambda: self._synth(0.25, lambda u: 700 - 400 * u, "tri", decay=0.6),
            "boss_hit": lambda: self._synth(0.22, lambda u: 120 - 60 * u, "square", noise=0.4, decay=1.6),
            "slam": lambda: self._synth(0.5, lambda u: 80 - 40 * u, "sine", noise=0.6, decay=1.3),
            "explode": lambda: self._synth(1.0, lambda u: 90 - 50 * u, "sine", noise=0.75, decay=1.1),
            "select": lambda: self._synth(0.07, lambda u: 880, "tri"),
            "confirm": lambda: self._synth(0.18, lambda u: 660 + 330 * (u > 0.4), "tri", decay=1),
            "gameover": lambda: self._synth(1.1, lambda u: [392, 330, 262, 196][min(3, int(u * 4))], "tri", decay=0.9),
            "victory": lambda: self._synth(1.2, lambda u: [523, 659, 784, 1046, 784, 1046][min(5, int(u * 6))], "tri", decay=0.5),
        }
        for name, fn in recipes.items():
            path = self._load_file(SOUND_DIR, name)
            try:
                self.sounds[name] = pygame.mixer.Sound(str(path)) if path else self._to_sound(fn(), 0.9)
                self.sounds[name].set_volume(self.sfx_volume)
            except pygame.error:
                pass

    def play(self, name):
        if self.ok and name in self.sounds:
            self.sounds[name].play()

    # ----------------------------------------------------------------- music
    TRACKS = {
        # nombre: (bpm, raíz MIDI, progresión de acordes en grados, escala)
        "menu": (92, 57, [0, 5, 3, 4], "minor"),
        "desierto": (112, 62, [0, 3, 4, 0], "phrygian_dom"),
        "castillo": (120, 55, [0, 5, 3, 4], "major"),
        "reloj": (132, 57, [0, 5, 6, 4], "minor"),
        "jefe": (150, 52, [0, 0, 5, 6], "minor"),
    }
    SCALES = {
        "major": [0, 2, 4, 5, 7, 9, 11],
        "minor": [0, 2, 3, 5, 7, 8, 10],
        "phrygian_dom": [0, 1, 4, 5, 7, 8, 10],
    }

    def _compose(self, name):
        bpm, root, prog, scale_name = self.TRACKS[name]
        scale = self.SCALES[scale_name]
        beat = 60 / bpm
        bars = len(prog) * 2
        total = int(self.rate * beat * 4 * bars)
        mix = [0.0] * total
        rnd = random.Random(sum(map(ord, name)))

        def deg(d, octave=0):
            return root + scale[d % 7] + 12 * (d // 7 + octave)

        def add_note(start_s, dur_s, midi, vol, wave="sine", decay=2.0):
            f = midi_freq(midi)
            start = int(start_s * self.rate)
            n = int(dur_s * self.rate)
            for i in range(n):
                idx = start + i
                if idx >= total:
                    break
                t = i / self.rate
                p = (f * t) % 1.0
                v = math.sin(p * math.tau) if wave == "sine" else 4 * abs(p - 0.5) - 1
                env = min(1, t / 0.01) * (1 - i / n) ** decay
                mix[idx] += v * env * vol

        melody_deg = 4
        for bar in range(bars):
            chord = prog[bar % len(prog)]
            t0 = bar * 4 * beat
            # bajo
            add_note(t0, beat * 1.9, deg(chord, -2), 0.32, "tri", 1.2)
            add_note(t0 + 2 * beat, beat * 1.9, deg(chord, -2), 0.26, "tri", 1.2)
            # arpegio
            for k in range(8):
                d = chord + [0, 2, 4, 7, 4, 2, 0, 4][k]
                add_note(t0 + k * beat / 2, beat * 0.9, deg(d, 0), 0.10, "sine", 2.5)
            # melodía (en la segunda vuelta)
            if bar >= len(prog):
                for k in range(4):
                    if rnd.random() < 0.8:
                        melody_deg = max(chord, min(chord + 9, melody_deg + rnd.choice([-2, -1, 1, 2, 0])))
                        add_note(t0 + k * beat, beat * (1.8 if rnd.random() < 0.3 else 0.9),
                                 deg(melody_deg, 1), 0.12, "tri", 1.4)
        peak = max(1e-6, max(abs(v) for v in mix))
        return self._to_sound([v / peak * 0.8 for v in mix])

    def _build_music(self):
        for name in self.TRACKS:
            try:
                path = self._load_file(MUSIC_DIR, name)
                self.music[name] = pygame.mixer.Sound(str(path)) if path else self._compose(name)
                self.music[name].set_volume(self.music_volume)
                if self.current_track == name and self.channel is None:
                    self._start(name)
            except Exception:  # la música nunca debe tumbar el juego
                pass

    def _start(self, name):
        snd = self.music.get(name)
        if snd:
            self.channel = snd.play(loops=-1, fade_ms=600)

    def play_music(self, name):
        if not self.ok or name == self.current_track:
            return
        if self.channel is not None:
            self.channel.fadeout(400)
            self.channel = None
        self.current_track = name
        self._start(name)

    def stop_music(self):
        if self.channel is not None:
            self.channel.fadeout(300)
        self.channel = None
        self.current_track = None
