"""Traduce teclado (y mando, si hay uno) a acciones del juego.

El resto del código nunca pregunta "¿está pulsada la tecla A?", sino
"¿el jugador quiere ir a la izquierda?". Así cambiar controles es trivial.
"""
import pygame

LEFT_KEYS = (pygame.K_LEFT, pygame.K_a)
RIGHT_KEYS = (pygame.K_RIGHT, pygame.K_d)
DOWN_KEYS = (pygame.K_DOWN, pygame.K_s)
JUMP_KEYS = (pygame.K_SPACE, pygame.K_w, pygame.K_UP, pygame.K_z)
PUNCH_KEYS = (pygame.K_j, pygame.K_x)
REWIND_KEYS = (pygame.K_k, pygame.K_LSHIFT, pygame.K_RSHIFT)
PAUSE_KEYS = (pygame.K_ESCAPE, pygame.K_p)


class InputState:
    def __init__(self):
        self.left = self.right = self.down = False
        self.jump_held = self.jump_pressed = False
        self.punch_pressed = False
        self.rewind = False
        self.pause_pressed = False

    @property
    def axis(self):
        return (1 if self.right else 0) - (1 if self.left else 0)


class InputManager:
    def __init__(self):
        self.state = InputState()
        self.joy = None
        if pygame.joystick.get_count() > 0:
            self.joy = pygame.joystick.Joystick(0)

    def begin_frame(self):
        s = self.state
        s.jump_pressed = s.punch_pressed = s.pause_pressed = False

    def handle_event(self, e):
        s = self.state
        if e.type == pygame.KEYDOWN:
            if e.key in JUMP_KEYS:
                s.jump_pressed = True
            elif e.key in PUNCH_KEYS:
                s.punch_pressed = True
            elif e.key in PAUSE_KEYS:
                s.pause_pressed = True
        elif e.type == pygame.JOYBUTTONDOWN:
            if e.button == 0:
                s.jump_pressed = True
            elif e.button in (1, 2):
                s.punch_pressed = True
            elif e.button == 7:
                s.pause_pressed = True
        elif e.type == pygame.JOYDEVICEADDED and self.joy is None:
            self.joy = pygame.joystick.Joystick(e.device_index)

    def end_events(self):
        keys = pygame.key.get_pressed()
        s = self.state
        s.left = any(keys[k] for k in LEFT_KEYS)
        s.right = any(keys[k] for k in RIGHT_KEYS)
        s.down = any(keys[k] for k in DOWN_KEYS)
        s.jump_held = any(keys[k] for k in JUMP_KEYS)
        s.rewind = any(keys[k] for k in REWIND_KEYS)
        if self.joy is not None:
            try:
                ax = self.joy.get_axis(0)
                hat = self.joy.get_hat(0) if self.joy.get_numhats() else (0, 0)
                s.left = s.left or ax < -0.4 or hat[0] < 0
                s.right = s.right or ax > 0.4 or hat[0] > 0
                s.down = s.down or self.joy.get_axis(1) > 0.5 or hat[1] < 0
                s.jump_held = s.jump_held or self.joy.get_button(0)
                s.rewind = s.rewind or self.joy.get_button(4) or self.joy.get_button(5)
            except pygame.error:
                self.joy = None
        return s
