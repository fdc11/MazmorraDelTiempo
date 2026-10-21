"""Personajes: jugador, enemigos y jefe final.

Cada personaje se dibuja a partir de una "pose" (ángulos de brazos, piernas,
rebote...). Las animaciones son listas de poses -> listas de sprites.
Convención de ángulos de extremidades: 0° = hacia abajo; positivo = hacia
adelante (hacia donde mira el personaje).
"""
import math

import pygame

from art.draw import (canvas, capsule, circle, ellipse, finish, outline, poly,
                      rrect, shade, SS)
from settings import INK

# ---------------------------------------------------------------------------
# JUGADOR: "Kai", explorador del tiempo
# ---------------------------------------------------------------------------
SKIN = (255, 206, 164)
HAIR = (88, 52, 34)
BANDANA = (226, 52, 62)
VEST = (150, 88, 50)
SHIRT = (252, 238, 212)
PANTS = (66, 78, 132)
BOOTS = (104, 62, 38)

PW, PH, PPAD = 64, 84, 6     # lienzo lógico del jugador


def _limb_end(x, y, angle_deg, length):
    a = math.radians(angle_deg)
    return x + math.sin(a) * length, y + math.cos(a) * length


def _draw_player(pose):
    s = SS
    surf = canvas(PW + PPAD * 2, PH + PPAD * 2)
    ox, oy = PPAD, PPAD
    bob = pose.get("bob", 0)
    lean = pose.get("lean", 0)
    hip = (ox + 30, oy + 60 + bob)
    sh_b = (ox + 27 + lean * 0.5, oy + 45 + bob)
    sh_f = (ox + 34 + lean * 0.5, oy + 46 + bob)
    head = (ox + 32 + lean, oy + 27 + bob)
    flutter = pose.get("flutter", 0)

    def leg(angle, front):
        col = PANTS if front else shade(PANTS, -0.25)
        bcol = BOOTS if front else shade(BOOTS, -0.25)
        hx = hip[0] + (3 if front else -3)
        ex, ey = _limb_end(hx, hip[1], angle, 13)
        capsule(surf, col, hx, hip[1], ex, ey, 9.5, s, ink=INK, ink_w=1.3)
        # bota: elipse orientada hacia delante
        ellipse(surf, INK, ex + 3, ey + 3, 7.6, 5.4, s)
        ellipse(surf, bcol, ex + 3, ey + 3, 6.4, 4.2, s)
        ellipse(surf, shade(bcol, 0.25), ex + 4.5, ey + 1.6, 2.6, 1.3, s)

    def arm(shoulder, angle, front, reach=12.5):
        col = SHIRT if front else shade(SHIRT, -0.18)
        skin = SKIN if front else shade(SKIN, -0.18)
        ex, ey = _limb_end(shoulder[0], shoulder[1], angle, reach)
        mx, my = _limb_end(shoulder[0], shoulder[1], angle, reach * 0.55)
        capsule(surf, skin, shoulder[0], shoulder[1], ex, ey, 6.6, s, ink=INK, ink_w=1.3)
        capsule(surf, col, shoulder[0], shoulder[1], mx, my, 8.4, s, ink=INK, ink_w=1.3)
        fist = pose.get("fist", 4.6) if front else 4.4
        circle(surf, INK, ex, ey, fist + 1.4, s)
        circle(surf, skin, ex, ey, fist, s)

    # Cintas de la bandana (detrás de todo)
    kx, ky = head[0] - 15, head[1] - 8
    capsule(surf, shade(BANDANA, -0.15), kx, ky, kx - 13, ky + 3 + flutter, 4.5, s, ink=INK, ink_w=1.3)
    capsule(surf, shade(BANDANA, -0.25), kx, ky + 1, kx - 9, ky + 11 - flutter * 0.6, 4.2, s, ink=INK, ink_w=1.3)

    arm(sh_b, pose.get("arm_b", -20), False)
    leg(pose.get("leg_b", 0), False)

    # Torso: camisa + chaleco + cinturón
    tx, ty = ox + 20 + lean * 0.4, oy + 40 + bob
    rrect(surf, INK, tx - 1.5, ty - 1.5, 23, 24, 8, s)
    rrect(surf, SHIRT, tx, ty, 20, 21, 7, s)
    rrect(surf, VEST, tx, ty, 9, 21, 6, s)
    rrect(surf, VEST, tx + 13, ty, 7, 21, 5, s)
    rrect(surf, shade(VEST, 0.18), tx + 1.5, ty + 2, 4, 14, 2, s)
    rrect(surf, INK, tx - 1, ty + 16, 22, 5, 2, s)
    rrect(surf, (190, 140, 60), tx + 9, ty + 16.6, 4.5, 3.8, 1, s)

    leg(pose.get("leg_f", 0), True)

    # Cabeza
    hx, hy = head
    circle(surf, INK, hx, hy, 18.8, s)
    circle(surf, SKIN, hx, hy, 17.2, s)
    ellipse(surf, shade(SKIN, -0.08), hx - 4, hy + 5, 12, 10, s)
    circle(surf, SKIN, hx + 1.5, hy - 1, 15, s)
    # Oreja
    ellipse(surf, INK, hx - 5, hy + 3, 4.6, 5.6, s)
    ellipse(surf, shade(SKIN, -0.06), hx - 5, hy + 3, 3.4, 4.4, s)
    # Pelo: masa trasera + puntas
    poly(surf, INK, [(hx - 20, hy - 3), (hx - 14, hy - 20), (hx + 2, hy - 23), (hx + 17, hy - 14),
                     (hx + 19, hy - 7), (hx + 8, hy - 9), (hx - 4, hy - 7), (hx - 9, hy + 3),
                     (hx - 15, hy + 9), (hx - 22, hy + 6), (hx - 25, hy - 2)])
    poly(surf, HAIR, [(hx - 18.5, hy - 3), (hx - 13, hy - 18.5), (hx + 2, hy - 21.5), (hx + 15.5, hy - 13.5),
                      (hx + 17, hy - 8.4), (hx + 7, hy - 10.4), (hx - 4, hy - 8.6), (hx - 9.6, hy + 1.2),
                      (hx - 15, hy + 7.2), (hx - 20.6, hy + 4.6), (hx - 23, hy - 2)])
    poly(surf, shade(HAIR, 0.22), [(hx - 9, hy - 17), (hx + 3, hy - 19.5), (hx - 2, hy - 15)])
    # Bandana
    capsule(surf, BANDANA, hx - 16.5, hy - 7.5, hx + 16.5, hy - 11.5, 6.2, s, ink=INK, ink_w=1.4)
    capsule(surf, shade(BANDANA, 0.3), hx - 8, hy - 10.4, hx + 8, hy - 12.4, 1.6, s)
    circle(surf, INK, kx, ky, 4.6, s)
    circle(surf, shade(BANDANA, -0.1), kx, ky, 3.4, s)

    # Cara
    eye = pose.get("eye", "open")
    ex, ey = hx + 8.5, hy + 0.5
    if eye == "closed":
        capsule(surf, INK, ex - 3.5, ey, ex + 3.5, ey - 1.5, 1.8, s)
    elif eye == "hurt":
        capsule(surf, INK, ex - 3, ey - 3, ex + 3, ey + 3, 1.8, s)
        capsule(surf, INK, ex - 3, ey + 3, ex + 3, ey - 3, 1.8, s)
    else:
        ellipse(surf, INK, ex, ey, 4.6, 6.0, s)
        ellipse(surf, (255, 255, 255), ex, ey, 3.5, 4.9, s)
        circle(surf, INK, ex + 1.2, ey + 0.8, 2.5, s)
        circle(surf, (255, 255, 255), ex + 2.0, ey - 0.6, 0.9, s)
    # Ceja (determinada)
    capsule(surf, INK, ex - 4, ey - 7.2, ex + 4, ey - 8.6 + (1.4 if eye == "angry" else 0), 1.8, s)
    # Boca
    mouth = pose.get("mouth", "smile")
    mx, my = hx + 9, hy + 9
    if mouth == "open":
        ellipse(surf, INK, mx, my, 3.2, 2.8, s)
        ellipse(surf, (230, 90, 90), mx, my + 0.8, 2, 1.4, s)
    elif mouth == "flat":
        capsule(surf, INK, mx - 3, my, mx + 2.5, my - 0.5, 1.4, s)
    else:
        pygame.draw.arc(surf, INK, pygame.Rect((mx - 4) * s, (my - 4) * s, 8 * s, 6 * s),
                        math.radians(200), math.radians(340), int(1.6 * s))
    # Mejilla
    blush = pygame.Surface((int(8 * s), int(5 * s)), pygame.SRCALPHA)
    pygame.draw.ellipse(blush, (255, 120, 120, 90), blush.get_rect())
    surf.blit(blush, ((hx + 2) * s, (hy + 5) * s))

    arm(sh_f, pose.get("arm_f", 20), True, pose.get("reach", 12.5))

    surf = outline(surf, 1.4 * s)
    pad_px = 1.4
    return finish(surf, PW + PPAD * 2 + pad_px * 2, PH + PPAD * 2 + pad_px * 2)


def build_player_frames():
    """Devuelve {animación: [sprites mirando a la derecha]}."""
    anims = {}
    anims["idle"] = [_draw_player({"bob": math.sin(i / 6 * 2 * math.pi) * 1.2,
                                   "arm_b": -12, "arm_f": 14 + math.sin(i / 6 * 2 * math.pi) * 3,
                                   "flutter": math.sin(i / 6 * 2 * math.pi) * 2})
                     for i in range(6)]
    run = []
    for i in range(8):
        t = i / 8 * 2 * math.pi
        run.append(_draw_player({
            "bob": -abs(math.sin(t)) * 2.4 + 1, "lean": 2.5,
            "leg_f": math.sin(t) * 42, "leg_b": -math.sin(t) * 42,
            "arm_f": -math.sin(t) * 50, "arm_b": math.sin(t) * 50,
            "flutter": math.sin(t * 2) * 3 + 2, "mouth": "smile"}))
    anims["run"] = run
    anims["jump"] = [_draw_player({"leg_f": 40, "leg_b": -25, "arm_f": 150, "arm_b": 120,
                                   "bob": -1, "flutter": 5, "mouth": "open"})]
    anims["fall"] = [_draw_player({"leg_f": 12, "leg_b": -14, "arm_f": 115, "arm_b": 140,
                                   "flutter": -4, "mouth": "open"})]
    anims["punch"] = [
        _draw_player({"arm_f": -40, "arm_b": 30, "leg_f": 18, "leg_b": -18, "lean": -1, "eye": "angry"}),
        _draw_player({"arm_f": 90, "reach": 20, "fist": 6.2, "arm_b": -40, "leg_f": 26, "leg_b": -22,
                      "lean": 4, "eye": "angry", "mouth": "open"}),
        _draw_player({"arm_f": 88, "reach": 18, "fist": 5.8, "arm_b": -35, "leg_f": 22, "leg_b": -20,
                      "lean": 3, "eye": "angry", "mouth": "open"}),
    ]
    anims["hurt"] = [_draw_player({"arm_f": 150, "arm_b": 160, "leg_f": 20, "leg_b": -30,
                                   "eye": "hurt", "mouth": "open", "lean": -3})]
    anims["win"] = [_draw_player({"arm_f": 170, "arm_b": 170, "bob": -2 - i, "eye": "closed",
                                  "mouth": "open", "flutter": 3}) for i in range(2)]
    return anims


# ---------------------------------------------------------------------------
# ENEMIGO: Cronoblob (slime que camina)
# ---------------------------------------------------------------------------

def _draw_slime(color, squash, look=1, angry=False):
    s = SS
    W, H, P = 46, 38, 5
    surf = canvas(W + P * 2, H + P * 2)
    cx, base = P + W / 2, P + H
    rx, ry = 21 * (1 + squash), 17 * (1 - squash)
    cy = base - ry
    ellipse(surf, color, cx, cy, rx, ry, s)
    rrect(surf, color, cx - rx, cy, rx * 2, ry, 6, s)
    ellipse(surf, shade(color, -0.22), cx, base - 3, rx * 0.95, 4, s)
    ellipse(surf, shade(color, 0.25), cx - rx * 0.25, cy - ry * 0.25, rx * 0.55, ry * 0.45, s)
    ellipse(surf, (255, 255, 255), cx - rx * 0.45, cy - ry * 0.5, rx * 0.16, ry * 0.2, s)
    # Ojos
    for dx in (-7, 7):
        ex, ey = cx + dx + look * 2, cy - 1
        ellipse(surf, INK, ex, ey, 5, 6.2, s)
        ellipse(surf, (255, 255, 255), ex, ey, 3.9, 5.1, s)
        circle(surf, INK, ex + look * 1.6, ey + 1, 2.4, s)
        if angry:
            capsule(surf, INK, ex - 4.5, ey - 7 - dx * 0.12, ex + 4.5, ey - 7 + dx * 0.12, 1.8, s)
    # Boquita con colmillo
    pygame.draw.arc(surf, INK, pygame.Rect((cx - 4 + look * 2) * s, (cy + 4) * s, 8 * s, 5 * s),
                    math.radians(200), math.radians(340), int(1.6 * s))
    poly(surf, (255, 255, 255), [(cx + 1 + look * 2, cy + 8), (cx + 3 + look * 2, cy + 8), (cx + 2 + look * 2, cy + 10.5)])
    surf = outline(surf, 2 * s)
    return finish(surf, W + P * 2 + 4, H + P * 2 + 4)


def build_slime_frames(color):
    frames = []
    for i in range(6):
        sq = math.sin(i / 6 * 2 * math.pi) * 0.12
        frames.append(_draw_slime(color, sq, 1, angry=True))
    return frames


# ---------------------------------------------------------------------------
# ENEMIGO: Murciélago del eco
# ---------------------------------------------------------------------------

def _draw_bat(flap, body=(92, 62, 140)):
    s = SS
    W, H, P = 64, 40, 5
    surf = canvas(W + P * 2, H + P * 2)
    cx, cy = P + W / 2, P + H / 2 + 2
    wing = shade(body, -0.15)
    for side in (-1, 1):
        tipy = cy - 14 + flap * 22
        pts = [(cx + side * 6, cy - 4), (cx + side * 20, tipy - 4), (cx + side * 31, tipy + 2),
               (cx + side * 26, cy + 4 + flap * 6), (cx + side * 20, cy + 1 + flap * 5),
               (cx + side * 14, cy + 6 + flap * 3), (cx + side * 7, cy + 4)]
        poly(surf, wing, pts, s)
        capsule(surf, shade(wing, 0.2), cx + side * 6, cy - 3, cx + side * 20, tipy - 3, 2, s)
    circle(surf, body, cx, cy, 11, s)
    poly(surf, body, [(cx - 9, cy - 6), (cx - 7, cy - 18), (cx - 2, cy - 9)], s)
    poly(surf, body, [(cx + 9, cy - 6), (cx + 7, cy - 18), (cx + 2, cy - 9)], s)
    ellipse(surf, shade(body, 0.3), cx - 3, cy - 4, 5, 3.5, s)
    for dx in (-4.2, 4.2):
        ellipse(surf, (255, 220, 70), cx + dx, cy - 1, 3.2, 3.8, s)
        circle(surf, INK, cx + dx, cy - 0.5, 1.6, s)
    poly(surf, (255, 255, 255), [(cx - 3, cy + 5), (cx - 1, cy + 5), (cx - 2, cy + 8)], s)
    poly(surf, (255, 255, 255), [(cx + 1, cy + 5), (cx + 3, cy + 5), (cx + 2, cy + 8)], s)
    surf = outline(surf, 2 * s)
    return finish(surf, W + P * 2 + 4, H + P * 2 + 4)


def build_bat_frames():
    return [_draw_bat(math.sin(i / 6 * 2 * math.pi) * 0.5 + 0.1) for i in range(6)]


# ---------------------------------------------------------------------------
# JEFE FINAL: El Guardián del Tiempo (golem de relojería)
# ---------------------------------------------------------------------------
BRONZE = (196, 132, 62)
STEEL = (92, 98, 128)
GLOW = (90, 240, 255)


def _draw_boss(pose):
    s = SS
    W, H, P = 170, 190, 8
    surf = canvas(W + P * 2, H + P * 2)
    bob = pose.get("bob", 0)
    lean = pose.get("lean", 0)
    cx = P + 85 + lean
    ground = P + H
    hip_y = ground - 46 + bob
    tick = pose.get("tick", 0)
    eye_col = pose.get("eye", GLOW)

    # Engranaje trasero
    gx, gy = cx - 40, hip_y - 70
    teeth = 10
    for i in range(teeth):
        a = tick * 0.4 + i / teeth * 2 * math.pi
        capsule(surf, shade(BRONZE, -0.35), gx, gy, gx + math.cos(a) * 34, gy + math.sin(a) * 34, 9, s)
    circle(surf, shade(BRONZE, -0.3), gx, gy, 28, s)
    circle(surf, shade(BRONZE, -0.5), gx, gy, 9, s)

    def leg(dx, angle, front):
        col = STEEL if front else shade(STEEL, -0.3)
        hx = cx + dx
        ex, ey = _limb_end(hx, hip_y, angle, 30)
        capsule(surf, col, hx, hip_y, ex, ey, 22, s, ink=INK, ink_w=2)
        rrect(surf, INK, ex - 16, ey + 2, 36, 16, 6, s)
        rrect(surf, shade(BRONZE, 0 if front else -0.3), ex - 14, ey + 4, 32, 12, 5, s)

    def arm(dx, dy, angle, front):
        col = BRONZE if front else shade(BRONZE, -0.3)
        sx, sy = cx + dx, hip_y - 62 + dy
        ex, ey = _limb_end(sx, sy, angle, 40)
        capsule(surf, shade(STEEL, 0 if front else -0.3), sx, sy, ex, ey, 18, s, ink=INK, ink_w=2)
        circle(surf, INK, ex, ey, 17, s)
        circle(surf, col, ex, ey, 15, s)
        circle(surf, shade(col, 0.3), ex - 4, ey - 5, 5, s)
        circle(surf, INK, sx, sy, 19, s)
        circle(surf, col, sx, sy, 17, s)
        circle(surf, shade(col, 0.25), sx - 5, sy - 6, 6, s)

    arm(-36, 0, pose.get("arm_b", -15), False)
    leg(-16, pose.get("leg_b", 0), False)

    # Torso
    tx, ty = cx - 44, hip_y - 86
    rrect(surf, INK, tx - 3, ty - 3, 94, 96, 28, s)
    rrect(surf, BRONZE, tx, ty, 88, 90, 26, s)
    rrect(surf, shade(BRONZE, 0.22), tx + 8, ty + 6, 30, 14, 7, s)
    rrect(surf, shade(BRONZE, -0.25), tx, ty + 70, 88, 20, 10, s)
    for bx in (tx + 10, tx + 78):
        for by in (ty + 30, ty + 64):
            circle(surf, shade(BRONZE, -0.45), bx, by, 3, s)
    # Esfera de reloj en el pecho
    ccx, ccy = cx, ty + 44
    circle(surf, INK, ccx, ccy, 25, s)
    circle(surf, (250, 240, 214), ccx, ccy, 22, s)
    for i in range(12):
        a = i / 12 * 2 * math.pi
        r1 = 16 if i % 3 else 13
        capsule(surf, INK, ccx + math.cos(a) * r1, ccy + math.sin(a) * r1,
                ccx + math.cos(a) * 19, ccy + math.sin(a) * 19, 1.6 if i % 3 else 2.6, s)
    a1 = tick * 0.5 - math.pi / 2
    a2 = tick * 0.08 - math.pi / 2
    capsule(surf, (200, 40, 50), ccx, ccy, ccx + math.cos(a1) * 17, ccy + math.sin(a1) * 17, 2.4, s)
    capsule(surf, INK, ccx, ccy, ccx + math.cos(a2) * 11, ccy + math.sin(a2) * 11, 3.6, s)
    circle(surf, INK, ccx, ccy, 3.2, s)

    # Cabeza / yelmo
    hx, hy = cx + 6, ty - 8
    rrect(surf, INK, hx - 31, hy - 33, 62, 52, 20, s)
    rrect(surf, STEEL, hx - 28, hy - 30, 56, 46, 18, s)
    rrect(surf, shade(STEEL, 0.25), hx - 22, hy - 26, 22, 9, 4, s)
    rrect(surf, INK, hx - 22, hy - 8, 48, 14, 6, s)
    for ex in (hx - 8, hx + 12):
        ellipse(surf, eye_col, ex, hy - 1, 7, 4.2, s)
        ellipse(surf, (255, 255, 255), ex + 1, hy - 1.5, 3, 1.6, s)
    poly(surf, (230, 60, 70), [(hx - 6, hy - 33), (hx + 2, hy - 52), (hx + 10, hy - 33)], s)

    leg(18, pose.get("leg_f", 0), True)
    arm(40, 2, pose.get("arm_f", 15), True)

    surf = outline(surf, 2.4 * s)
    return finish(surf, W + P * 2 + 4.8, H + P * 2 + 4.8)


def build_boss_frames():
    anims = {}
    anims["idle"] = [_draw_boss({"bob": math.sin(i / 6 * 2 * math.pi) * 2.5, "tick": i,
                                 "arm_b": -10, "arm_f": 12}) for i in range(6)]
    walk = []
    for i in range(6):
        t = i / 6 * 2 * math.pi
        walk.append(_draw_boss({"bob": -abs(math.sin(t)) * 4, "tick": i * 2, "leg_f": math.sin(t) * 26,
                                "leg_b": -math.sin(t) * 26, "arm_f": -math.sin(t) * 26,
                                "arm_b": math.sin(t) * 26, "lean": 3}))
    anims["walk"] = walk
    anims["windup"] = [_draw_boss({"arm_f": -60, "arm_b": -40, "lean": -6, "tick": 3, "eye": (255, 90, 90)})]
    anims["dash"] = [_draw_boss({"arm_f": 95, "arm_b": 60, "lean": 10, "leg_f": 35, "leg_b": -35,
                                 "tick": 5, "eye": (255, 90, 90)})]
    anims["slam_up"] = [_draw_boss({"arm_f": 170, "arm_b": 160, "bob": -6, "tick": 7, "eye": (255, 200, 80)})]
    anims["slam_down"] = [_draw_boss({"arm_f": 5, "arm_b": -5, "bob": 6, "tick": 8, "leg_f": 20,
                                      "leg_b": -20, "eye": (255, 200, 80)})]
    anims["throw"] = [_draw_boss({"arm_f": 120, "arm_b": -30, "tick": 9, "lean": 4})]
    anims["dead"] = [_draw_boss({"arm_f": 40, "arm_b": -40, "bob": 10, "tick": 0, "eye": (60, 60, 70)})]
    return anims
