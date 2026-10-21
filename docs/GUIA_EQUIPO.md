# Guía paso a paso para el equipo

Esta guía convierte el código en un **historial de colaboración real** que cumple
todos los requisitos del trabajo: ramas, PRs con capturas, revisión cruzada,
Issues y tablero. Síganla en orden.

> 💡 **Importante:** cada integrante sube **sus propios archivos** desde **su cuenta** y en **varios
> commits pequeños**. Un único commit gigante con todo el juego es lo primero que un profesor nota.
> Y cada uno debe poder explicar su parte: léanla y entiéndanla antes de subirla.

---

## Paso 0 — Todos instalan (15 min)

1. **Python 3.13** → https://www.python.org/downloads/ (marcar *"Add python.exe to PATH"*).
2. **Git** → https://git-scm.com/download/win
3. **VS Code** (opcional, recomendado) con la extensión *Python*.
4. Configurar Git con **el mismo correo de su cuenta de GitHub** (si no, los commits no salen a su nombre):
   ```bash
   git config --global user.name "Tu Nombre"
   git config --global user.email "tu-correo-de-github@ejemplo.com"
   ```

## Paso 1 — Integrante 1 crea el repositorio (10 min)

1. En GitHub: **New repository** → nombre `mazmorra-del-tiempo` → **Public** (ver nota del paso 2) → **sin** README.
2. En la carpeta del proyecto, renombra `_github` a `.github` (contiene las plantillas de PR e Issues):
   ```powershell
   ren _github .github
   ```
3. Crea el commit inicial **solo con la estructura** (esto es lo único que va directo a `main`):
   ```bash
   git init -b main
   git add .gitignore README.md CONTRIBUTING.md requirements.txt .github docs assets
   git commit -m "chore: estructura inicial del proyecto y reglas de colaboración"
   git remote add origin https://github.com/<usuario>/mazmorra-del-tiempo.git
   git push -u origin main
   ```
4. **Settings → Collaborators → Add people** → invitar a los otros dos.

## Paso 2 — Proteger `main` (5 min)

**Settings → Branches → Add branch protection rule** (o *Rules → Rulesets*):
- Branch name pattern: `main`
- ✅ *Require a pull request before merging*
- ✅ *Require approvals* → **1**
- ✅ *Do not allow bypassing the above settings*

> ⚠️ En cuentas gratuitas la protección de ramas solo funciona en repos **públicos**.
> Si lo necesitan privado, activen **GitHub Pro gratis** con el
> [GitHub Student Developer Pack](https://education.github.com/pack).

## Paso 3 — Tablero de GitHub Projects (10 min)

1. En el repo: pestaña **Projects → Link a project → New project → Board**.
2. Nombre: `La Mazmorra del Tiempo`.
3. Columnas: renombrar *Todo* → **To Do**, añadir **In Review** entre *In Progress* y *Done*.
   Debe quedar: **To Do · In Progress · In Review · Done**.
4. En *Settings* del proyecto → *Workflows*: activar "Item closed → Done" y "Pull request merged → Done".

## Paso 4 — Crear los Issues (10 min)

Opción rápida con la terminal (requiere [GitHub CLI](https://cli.github.com/)):
```powershell
gh auth login
gh auth refresh -s project
# edita los usuarios al inicio del script y luego:
powershell -ExecutionPolicy Bypass -File docs\crear-issues.ps1
```
O a mano desde **Issues → New issue** con esta lista (asignar a la persona y añadir al proyecto):

| # | Issue | Responsable | Rama |
|---|---|---|---|
| 1 | Movimiento del jugador: correr, saltar, colisiones con tiles | Integrante 1 | `feature/movimiento-jugador` |
| 2 | Salud, vidas, Game Over y reaparición en checkpoints | Integrante 1 | `feature/movimiento-jugador` |
| 3 | Cambio de nivel y puntuación persistente (récord) | Integrante 1 | `feature/movimiento-jugador` |
| 4 | Mecánica especial: rebobinar el tiempo | Integrante 1 | `feature/movimiento-jugador` |
| 5 | Nivel 1: tutorial en las Ruinas del Desierto | Integrante 2 | `feature/nivel-1` |
| 6 | Objetos: relojes de arena, corazones, checkpoints y portal | Integrante 2 | `feature/nivel-1` |
| 7 | Nivel 2: Castillo con pinchos, sierras y bloques que caen | Integrante 2 | `feature/nivel-2` |
| 8 | Enemigos: slime y murciélago | Integrante 2 | `feature/nivel-2` |
| 9 | HUD: vidas, tiempo, puntos y energía | Integrante 3 | `feature/interfaz-menu` |
| 10 | Menú principal, pausa, Game Over y pantalla de victoria | Integrante 3 | `feature/interfaz-menu` |
| 11 | Nivel 3: Torre del Reloj (laberinto) | Integrante 3 | `feature/nivel-3` |
| 12 | Jefe final: Guardián del Tiempo estilo Street Fighter | Integrante 3 | `feature/nivel-3` |

Cuando empiecen una tarea, muevan su tarjeta a **In Progress**.

## Paso 5 — Cada uno trabaja en su rama

Los otros integrantes clonan el repo una vez:
```bash
git clone https://github.com/<usuario>/mazmorra-del-tiempo.git
cd mazmorra-del-tiempo
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Ciclo de trabajo (igual para todos):
```bash
git switch main
git pull                                   # traer lo último
git switch -c feature/nivel-1              # crear tu rama (solo la primera vez)
# ... copiar/editar tus archivos ...
git add levels/nivel_1.json
git commit -m "level: primer tramo del nivel 1 con escalón y pozo"
git push -u origin feature/nivel-1
```

### Orden de los Pull Requests (para que `main` siempre sea jugable)

El código está preparado para que **cada PR funcione aunque falten los de los demás**
(si no existe `ui/`, el juego arranca sin menú; si no existe `entities/boss.py`, se ignora el jefe, etc.).

| Orden | Rama | Quién | Archivos | Sugerencia de commits |
|---|---|---|---|---|
| 1 | `feature/movimiento-jugador` | Int. 1 | `settings.py`, `main.py`, `core/`, `art/`, `entities/__init__.py`, `entities/base.py`, `levels/level_base.py`, `levels/nivel_prueba.json` | 1) settings+main · 2) physics · 3) player · 4) camera+particles · 5) arte · 6) level_base+nivel de prueba · 7) game_state+play_scene · 8) audio |
| 2 | `feature/nivel-1` | Int. 2 | `levels/nivel_1.json`, `entities/items.py` | 1) objetos · 2) primer tramo · 3) segundo tramo · 4) carteles tutorial |
| 3 | `feature/interfaz-menu` | Int. 3 | `ui/` | 1) widgets · 2) HUD · 3) menú principal · 4) pausa · 5) game over + victoria |
| 4 | `feature/nivel-2` | Int. 2 | `levels/nivel_2.json`, `entities/traps.py`, `entities/enemies.py` | 1) trampas · 2) enemigos · 3) nivel 2 |
| 5 | `feature/nivel-3` | Int. 3 | `levels/nivel_3.json`, `entities/boss.py` | 1) laberinto · 2) jefe · 3) arena del jefe |

### Abrir y revisar un PR
1. GitHub → **Compare & pull request** → la plantilla aparece sola.
2. Rellena la descripción, pon `Closes #N` y **arrastra una captura o GIF** (Win + Shift + S, o [ScreenToGif](https://www.screentogif.com/) para GIFs).
3. **Reviewers** → elige a un compañero. **Projects** → mueve la tarjeta a *In Review*.
4. El revisor prueba la rama en su PC, deja al menos un comentario útil y pulsa **Approve**.
5. Merge → borrar la rama → tarjeta a **Done**.

## Paso 6 — Después de los 5 PRs: mejoras

Con todo en `main`, cada uno crea ramas `fix/...` o `feature/...` para pulir su parte
(balance de dificultad, nuevos enemigos, más niveles...). Esto suma historial y revisiones.

### Ideas de mejora por rol
- **Integrante 1:** dash en el aire, doble salto como power-up, soporte para guardar la partida.
- **Integrante 2:** nuevo enemigo (momia que lanza vendas), cofre secreto, palancas que abren puertas.
- **Integrante 3:** menú de opciones (volumen), selector de nivel, animación de créditos.

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `ModuleNotFoundError: No module named 'pygame'` | Activa el entorno: `.venv\Scripts\activate` y `pip install -r requirements.txt` |
| Los commits no aparecen con mi foto en GitHub | Tu `git config user.email` no coincide con tu correo de GitHub |
| `! [rejected] main -> main` | Bien: `main` está protegida. Trabaja en tu rama y abre un PR |
| Conflicto al hacer `git pull origin main` en mi rama | Abre el archivo, elige qué conservar, `git add` y `git commit` |
| El juego va lento | Cierra otros programas; el juego pide 60 FPS a 1280×720 |
