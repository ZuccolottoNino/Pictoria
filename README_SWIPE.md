# Swipe por muñeca — TouchDesigner + MediaPipe → Web (WebSocket)

Detecta cuando el punto de la **muñeca** (landmark 0 de la mano de MediaPipe)
se desplaza horizontalmente unos **10 cm** a **velocidad constante y moderada**
y dispara un swipe, enviando `siguiente` / `anterior` por WebSocket a tu
[pagina.html](pagina.html) (puerto **9980**).

El código está en [swipe_detect.py](swipe_detect.py). Reemplaza la lógica de
puntas de dedos: ahora todo depende del landmark **0 (wrist)** del CHOP de
landmarks de tu tox MediaPipe (el mismo `MediaPipe.tox` de GitHub que ya usas,
de dotSimulate/MediaPipeTouchDesigner — no hace falta instalar nada extra).

## Montaje en TouchDesigner (5 pasos)

1. Abre `release/MediaPipe TouchDesigner.9.toe`.
2. En la misma red donde está tu tox **MediaPipe**, crea un **Execute DAT**
   (el de la paleta: *Execute DAT*, no un *DAT Execute*) y llámalo `swipe_detect`.
3. Pega **todo** el contenido de [swipe_detect.py](swipe_detect.py) dentro de ese DAT.
4. En los **parámetros del Execute DAT** activa los toggles **Start** y
   **Frame Start** (sin ellos el callback `onFrameStart` nunca se ejecuta).
5. Guarda. El DAT crea solo dos ops al lado:
   - `swipe_status` (Text DAT): estado del servidor WS, canal detectado,
     valor de x de la muñeca, velocidad instantánea y último swipe.
   - `swipe_log` (Table DAT): historial de los últimos 20 swipes.

Abre [pagina.html](pagina.html) en el navegador: el punto **#estado** debe
ponerse **verde** (se conectó a `ws://localhost:9980`). Luego mueve la muñeca
~10 cm a la derecha → *Pantalla 2* (`siguiente`); a la izquierda → `anterior`.

> Si abriste la página con `file://` funciona igual, el WebSocket no tiene
> restricciones de CORS ahí.

## Configuración (bloque `CONFIG` arriba del script)

| Parámetro | Default | Qué hace |
|---|---|---|
| `LANDMARKS_CHOP` | `''` (auto) | Path del CHOP con los landmarks. Si lo dejas vacío se autodetecta en todo el proyecto (o en `MEDIAPIPE_COMP` si lo completas). |
| `WRIST_X_CHANNEL` | `''` (auto) | Nombre exacto del canal X de la muñeca, p. ej. `h0:l0:x`. Autodetecta patrones `h0:l0:x`, `hand0_l0_x`, `l0:x`, `wrist`, `wristx`. |
| `WRIST_Y_CHANNEL` | `''` (auto) | Igual pero la Y (no se usa en la detección, solo queda cacheado). |
| `HAND_COUNT_CHANNEL` | `''` (auto) | Canal de "manos presentes" (`hands_count`, `hand_presence`...). Si no hay, se infiere porque x deja de estar en (0..1). |
| `HAND_INDEX` | `0` | Qué mano seguir (0 = la primera). |
| `WS_HOST` / `WS_PORT` | `127.0.0.1` / `9980` | Servidor WebSocket. `127.0.0.1` solo acepta conexiones de esta misma PC (más seguro). |
| `SWIPE_DISTANCE` | `0.15` | Δx mínimo del gesto. Ver calibración abajo. |
| `V_MIN` / `V_MAX` | `0.35` / `3.0` | Rango de velocidad aceptado (unidades normalizadas/segundo). Más lento = no es swipe; más rápido = salto de detección/ruido. |
| `CONSISTENCY` | `0.80` | Exige que ≥80 % de los pasos vayan en la misma dirección = movimiento **constante**, sin rebotes. |
| `COOLDOWN` | `0.5 s` | Mínimo entre un swipe y el siguiente. |
| `REARM_DIST` | `0.03` | Para re-armar, la muñeca debe volver ~0.03 **en contra del último swipe** (los rebotes en la misma dirección no re-arman: evita dobles disparos). |
| `MAX_GAP` | `0.3 s` | Tolerancia si MediaPipe pierde la mano a mitad del gesto: si el hueco dura menos, el historial se conserva y el swipe sigue; si dura más, se reinicia todo. |
| `INVERT_X` | `false` | Ponlo en `true` si tu imagen está en modo espejo (el swipe se siente "al revés"). |
| `INVERT_DIR` | `false` | `true` para intercambiar `siguiente` ↔ `anterior`. |

## Calibrar los ~10 cm

Las coordenadas de MediaPipe son normalizadas (0..1 del ancho del cuadro), no
centímetros. `SWIPE_DISTANCE = 0.15` ≈ **10 cm** con una webcam típica a
~60 cm de distancia (el cuadro mide ~70 cm de ancho ahí). Para afinarlo:

1. Mira `swipe_status` mientras mueves la muñeca exactamente 10 cm a un lado.
2. Apunta la x inicial y la x final (o mira la columna `x` de `swipe_log`).
3. Pon la diferencia como `SWIPE_DISTANCE`. Si a 60 cm te da 0.12, usa 0.12.
4. Si detecta swipe al mover la mano muy despacio, sube `V_MIN`; si se salta
   gestos rápidos, sube `V_MAX`.

## Si no encuentra el CHOP o el canal

1. Pégalo en un Text DAT temporal y ejecutalo para volcar los canales:
   ```python
   for c in op('/project1').findChildren(type=CHOP):  # ajusta la red
       print(c.path, [ch.name for ch in c.chans()][:12])
   ```
2. Copia el nombre del CHOP de landmarks a `LANDMARKS_CHOP` y el del canal de
   la muñeca (landmark 0, la X) a `WRIST_X_CHANNEL`.
3. Mira también `swipe_status`: dice exactamente qué encontró y qué no.

## Cómo funciona la detección (resumen)

Cada frame guarda la x de la muñeca con su hora (últimos 0.6 s). Cuando el
Δx acumulado llega a `SWIPE_DISTANCE`:

- calcula la velocidad media = Δx / Δt;
- la exige dentro de `[V_MIN, V_MAX]` (ni arrastre lento ni salto brusco);
- comprueba que ≥80 % de los pasos vayan en la misma dirección
  (movimiento continuo/constante, no temblor);
- si pasa todo: envía `siguiente` (x creciente) o `anterior` (x decreciente)
  a los navegadores conectados, se "desarma" y espera a que la muñeca vuelva.

Dos detalles importantes:

- **Pérdida breve de la mano:** si los landmarks de MediaPipe desaparecen
  menos de `MAX_GAP` (0.3 s) a mitad del gesto, el historial **no se borra** y
  el swipe se completa cuando la mano vuelve. Solo se reinicia ante una
  pérdida larga (o si la x queda fuera del cuadro / en NaN).
- **Re-armado con dirección:** después de un swipe hay que mover la muñeca
  ~0.03 **hacia atrás** (en contra del swipe) para re-armar, y ahí solo cuentan
  las muestras posteriores al disparo. Así el primer intento de retroceso ya
  dispara y un rebote no genera un doble disparo.

## ¿Cómo ver si está funcionando?

- **`swipe_status`** (Text DAT): hacé click con la rueda del medio para verlo
  en vivo y mirá mientras hacés el gesto:
  - `mano : visible / PERDIDA` → si se pone en PERDIDA a mitad del gesto,
    MediaPipe perdió la mano; `perdidas` cuenta cuántas veces pasó.
  - `x muñeca` → debe seguir tu mano; el delta al mover 10 cm te sirve para
    calibrar `SWIPE_DISTANCE`.
  - `armado : si/no` → `no` = espera la vuelta de la muñeca en contra del
    último swipe.
  - `ultimo swipe` y `total` → lo último enviado y cuántos en total.
- **`swipe_log`** (Table DAT): una fila por swipe disparado (hora, mensaje,
  velocidad, x final). Si hacés el gesto y no se agrega fila, no se detectó.
- **Consola del navegador (F12)**: cada mensaje WebSocket aparece como
  `mensaje: anterior` o `mensaje: siguiente`. Es la prueba definitiva de qué
  le llegó a la página.
- **Ojo con los scripts viejos de puntas de dedos** (`script1`, `lag1`,
  `swipedetector`…): son la detección anterior. Desactivalos (o borralos) para
  que solo hable el Execute DAT `swipe_detect` y no compitan dos detectores.

## Notas

- El servidor solo acepta clientes WebSocket que envían el handshake correcto
  y sólo escucha en `127.0.0.1`; si quieres controlar desde otro equipo, pon
  `WS_HOST = '0.0.0.0'` y en la página `ws://TU_IP:9980`.
- Si editas el script mientras corre, el Execute DAT se recarga: el servidor se
  reutiliza solo (queda guardado con `me.store`), no se duplica.
- TouchDesigner ≥ 2022 con Python 3.9+ (cualquier build actual sirve).
