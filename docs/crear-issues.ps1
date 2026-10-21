# Crea los Issues del proyecto con GitHub CLI.
# Uso: edita los usuarios y luego ejecuta en la carpeta del repo:
#   powershell -ExecutionPolicy Bypass -File docs\crear-issues.ps1

$INT1 = "usuario-integrante-1"
$INT2 = "usuario-integrante-2"
$INT3 = "usuario-integrante-3"
$PROYECTO = "La Mazmorra del Tiempo"   # nombre exacto del tablero en GitHub Projects

gh label create "mecanica" --color "1D76DB" --force
gh label create "nivel"    --color "0E8A16" --force
gh label create "ui"       --color "D93F0B" --force

$issues = @(
  @("Movimiento del jugador: correr, saltar, colisiones", "Física de plataformas con coyote time, buffer de salto y salto variable. Rama: feature/movimiento-jugador", "mecanica", $INT1),
  @("Salud, vidas, Game Over y reaparición", "3 corazones por vida, 3 vidas, reaparecer en el último checkpoint. Rama: feature/movimiento-jugador", "mecanica", $INT1),
  @("Cambio de nivel y puntuación persistente", "Pasar al siguiente nivel con bonus de tiempo y guardar el récord en save.json. Rama: feature/movimiento-jugador", "mecanica", $INT1),
  @("Mecánica especial: rebobinar el tiempo", "Mantener K/Shift para volver hasta 3 s atrás con energía limitada. Rama: feature/movimiento-jugador", "mecanica", $INT1),
  @("Nivel 1: Ruinas del Desierto (tutorial)", "Nivel introductorio con carteles que enseñan cada mecánica. Rama: feature/nivel-1", "nivel", $INT2),
  @("Objetos: relojes, corazones, checkpoints y portal", "Coleccionables y salida del nivel. Rama: feature/nivel-1", "nivel", $INT2),
  @("Nivel 2: Castillo Olvidado (trampas)", "Pinchos, sierras en rieles, bloques que caen y plataformas móviles. Rama: feature/nivel-2", "nivel", $INT2),
  @("Enemigos: slime y murciélago", "Se derrotan pisándolos o golpeándolos. Rama: feature/nivel-2", "nivel", $INT2),
  @("HUD: vidas, tiempo, puntos y energía", "Interfaz durante el juego. Rama: feature/interfaz-menu", "ui", $INT3),
  @("Menú principal, pausa, Game Over y victoria", "Pantallas navegables con teclado, ratón y mando. Rama: feature/interfaz-menu", "ui", $INT3),
  @("Nivel 3: Torre del Reloj (laberinto)", "Nivel final con dos caminos, sierras y plataformas. Rama: feature/nivel-3", "nivel", $INT3),
  @("Jefe final: Guardián del Tiempo", "Pelea 1 vs 1 estilo Street Fighter con barras de vida y 3 ataques. Rama: feature/nivel-3", "nivel", $INT3)
)

foreach ($i in $issues) {
  gh issue create --title $i[0] --body $i[1] --label $i[2] --assignee $i[3] --project $PROYECTO
}
Write-Host "Listo: issues creados y añadidos al tablero."
