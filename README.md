# Sensado de manos → Web (Python)

Reemplaza a TouchDesigner para el sensado de la infografía. Es un proceso
independiente: **anda aunque la ventana esté en segundo plano**, no depende del
foco de ninguna app y no consume los recursos de TD.

Abre la webcam, detecta las **dos manos** con MediaPipe y manda un mensaje de
texto por WebSocket a `ws://127.0.0.1:9980`. Es el **mismo puerto y el mismo
protocolo** que ya usabas con el Execute DAT de TD, así que tu HTML no cambia:
sigue recibiendo `siguiente` / `anterior`.

| Archivo | Qué hace |
|---|---|
| `sensado_manos.py` | Punto de entrada: cámara + loop + despacho de mensajes |
| `gestos.py` | **Los gestos.** Acá se agregan los nuevos |
| `manos.py` | MediaPipe + historial de cada mano (posición, landmarks) |
| `servidor_ws.py` | Servidor WebSocket (RFC 6455, cero dependencias) |
| `config.py` | Todos los ajustes, en un solo lugar |
| `modelos/hand_landmarker.task` | Modelo de MediaPipe (7,8 MB) |

## Instalar

```bash
python -m pip install mediapipe opencv-python
```

Ya está instalado en esta máquina. El modelo `modelos/hand_landmarker.task`
también está bajado; si falta:

```bash
curl -o modelos/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

## Correr

```bash
# primera vez / calibración: abre la cámara en una ventana con todo el debug
python sensado_manos.py

# para la instalación: corre sin ventana, en segundo plano
python sensado_manos.py --sin-ventana
```

Opciones: `--camara N` (índice de webcam), `--puerto N`, `--host IP`,
`--sin-ventana`. Salir con `ESC` o `Q` en la ventana, o `Ctrl+C`.

**Importante:** la webcam es exclusiva. No podés tener TD y este script
usándola al mismo tiempo — cerrá TouchDesigner (o el `.toe` con la tox de
MediaPipe) antes de levantar este script.

Abrí `infografia/index.html` (o tu `paginaPrueba.html`): el puntito de estado
debe ponerse **verde** = conectado a `ws://localhost:9980`.

## Calibrar (3 pasos, ~2 minutos)

La ventana muestra, arriba a la izquierda, las dos manos con su `x`, su
confianza y, abajo, cada gesto con su `dx` y su último disparo. El recuadro
sobre la muñeca dice **MANO IZQ** (azul) o **MANO DER** (verde).

**1. ¿Izquierda o derecha?** Levantá tu mano **derecha**. Tiene que decir
`MANO DER`. Si dice `IZQ`, abrí `config.py` y poné `INVERTIR_MANOS = True`.

**2. ¿Qué dirección dispara?** Con la mano **derecha**, deslizá de derecha a
izquierda. En la ventana debería aparecer `-> avanzar` y la web tendría que
avanzar. Si hace lo contrario, invertí el signo en `config.py`:

```python
DIR_MENSAJE_ATRAS = -1      # mano izquierda
DIR_MENSAJE_ADELANTE = +1   # mano derecha
```

**3. ¿Se siente corto o largo?** Mirá el `dx` de cada gesto mientras movés la
mano unos 10 cm. Si dispara muy fácil, subí `SWIPE_DISTANCE`; si cuesta,
bajalo. `0.15` ≈ 10 cm con una webcam a ~60 cm.

### Parámetros del swipe (`config.py`)

| Parámetro | Default | Qué hace |
|---|---|---|
| `SWIPE_DISTANCE` | `0.15` | Δx mínimo del gesto (unidades normalizadas, no cm) |
| `V_MIN` / `V_MAX` | `0.35` / `3.00` | Rango de velocidad aceptado. Más lento = no es swipe; más rápido = salto de la detección |
| `CONSISTENCY` | `0.80` | Exige que ≥80 % de los pasos vayan en la misma dirección |
| `COOLDOWN` | `0.50 s` | Mínimo entre un swipe y el siguiente |
| `REARM_DIST` | `0.03` | Vuelta mínima en contra del último swipe para re-armar (evita dobles disparos) |
| `LOOKBACK` | `0.60 s` | Cuánto se recuerdan las muestras |
| `MAX_GAP` | `0.30 s` | Si MediaPipe pierde la mano menos que esto a mitad del gesto, el gesto **se completa** cuando vuelve |
| `INVERTIR_MANOS` | `False` | Invierte la etiqueta izq/der |
| `INVERTIR_X` | `False` | Invierte el eje X (si lo prendés, volvé a leer los `DIR_*`) |
| `MOSTRAR_VENTANA` | `True` | `False` = sin ventana, para la instalación |

## Agregar un gesto nuevo

Todo lo que es "gesto" vive en `gestos.py`. La receta:

1. Subí la clase `Gesto` e implementá `frame(self, manos, t)`.
2. Devolvé el **texto** que querés mandar a la web (o `None`).
3. Registrala abajo, en *LOS GESTOS ACTIVOS*.

```python
class Pinch(Gesto):
    nombre = 'pinch'

    def frame(self, manos, t):
        for lado, h in manos.items():
            if not h.visible:
                continue
            d = h.distancia(4, 8)          # punta del pulgar <-> índice
            if d is not None and d < 0.05:
                return 'pinch:' + lado
        return None

registrar(Pinch())
```

Lo que te da `manos` (dict con clave `'izq'` y `'der'`):

| Atributo | Qué es |
|---|---|
| `.visible` | `True` si la mano está en el cuadro ahora |
| `.x` | x actual de la muñeca (0..1), o `None` |
| `.muestras` | `[(t, x)]` de los últimos 0.6 s |
| `.punto(i)` | landmark `i` → `(x, y)`. 0 muñeca, 4 pulgar, 8 índice, 12 medio, 16 anular, 20 meñique |
| `.distancia(a, b)` | distancia entre dos landmarks |
| `.confianza` | 0..1 |
| `.generacion` | cambia cada vez que se vacía el historial (mano perdida mucho rato) |
| `.perdidas` | cuántas veces se perdió la mano |

Los gestos **no modifican** `.muestras`: `SwipePorMano` mantiene su propia
ventana (`self.desde`), así que varios gestos pueden convivir sobre la misma
mano sin pisarse. Si tu gesto necesita estado "armado / disparado", copiá el
patrón de `SwipePorMano` (`self.armed`, `self.last_trigger`, `self.gen`).

El mensaje puede ser cualquier string: `siguiente`, `anterior`, `pinch:izq`,
`nivel3`… Lo manda tal cual por el WebSocket y lo decides en el HTML.

## Problemas comunes

- **`No pude abrir la cámara 0`** — otra app la tiene agarrada. Cerrá
  TouchDesigner (o la app de cámara) y probá de nuevo. Si sigue, probá
  `--camara 1`.
- **`OSError: solo un uso de cada dirección de socket permitido`** — hay otro
  sensado corriendo en el puerto 9980 (¿el Execute DAT de TD?). Cerralo.
- **El puntito de la web está rojo** — el script no está corriendo, o está en
  otro puerto. La web y `config.py` tienen que coincidir en 9980.
- **Avanza cuando querés retroceder** — pasos 1 y 2 de calibración de arriba.
- **Dispara con movimientos chiquitos** — subí `SWIPE_DISTANCE` y/o `V_MIN`.
