# Reglas de colaboración

## 1. Ramas

| Rama | Responsable | Archivos que toca |
|---|---|---|
| `main` | Nadie directamente | Solo recibe merges de PR aprobados |
| `feature/movimiento-jugador` | Integrante 1 | `settings.py`, `main.py`, `core/`, `art/`, `entities/base.py`, `levels/level_base.py`, `levels/nivel_prueba.json` |
| `feature/nivel-1` | Integrante 2 | `levels/nivel_1.json`, `entities/items.py` |
| `feature/nivel-2` | Integrante 2 | `levels/nivel_2.json`, `entities/traps.py`, `entities/enemies.py` |
| `feature/interfaz-menu` | Integrante 3 | `ui/` |
| `feature/nivel-3` | Integrante 3 | `levels/nivel_3.json`, `entities/boss.py` |

**Regla de oro:** si necesitas cambiar un archivo que no es tuyo, avisa al dueño en el Issue o pídeselo en tu PR.
Así casi no habrá conflictos de merge.

Para correcciones después de los PR principales: `fix/<descripcion-corta>` (ej. `fix/colision-sierra`).

## 2. Commits

Formato: `tipo: descripción en presente`

| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | Funcionalidad nueva | `feat: añadir coyote time al salto` |
| `fix` | Corrección de bug | `fix: el slime ya no cae por los bordes` |
| `level` | Cambios en un nivel | `level: nivel 2 con sierras en el pasillo` |
| `ui` | Interfaz | `ui: barra de vida del jefe estilo Street Fighter` |
| `art` | Arte / sonido | `art: nuevo tema de tiles castillo` |
| `docs` | Documentación | `docs: controles en el README` |
| `chore` | Configuración | `chore: .gitignore para Python` |

Commits pequeños y frecuentes (mejor 10 commits claros que 1 gigante). Añade `Closes #N` en el PR para cerrar el Issue.

## 3. Pull Requests

1. Sube tu rama: `git push -u origin feature/mi-rama`
2. Abre el PR hacia `main` usando la plantilla (se carga sola).
3. **Obligatorio:** descripción + captura o GIF del nivel/mecánica funcionando.
4. Asigna a un compañero como **Reviewer**. Mueve la tarjeta del tablero a *In Review*.
5. El revisor prueba la rama en su PC (`git fetch` → `git switch feature/...` → `python main.py`), deja comentarios y aprueba.
6. Solo con **1 aprobación** se hace *Merge* (preferible *Squash and merge* o *Merge commit*, pero el mismo en todo el proyecto).
7. Borra la rama remota después del merge y mueve la tarjeta a *Done*.

## 4. Antes de abrir un PR — checklist

- [ ] `python main.py` arranca sin errores.
- [ ] Probé mi parte de principio a fin.
- [ ] No subí `save.json`, `__pycache__/`, `.venv/` ni archivos pesados.
- [ ] Hice `git pull origin main` y resolví conflictos en mi rama (no en `main`).
