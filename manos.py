# =============================================================================
# manos.py — detección de manos con MediaPipe (Tasks API) + historial por mano.
#
# Acá no hay lógica de gestos: solo responde "qué manos hay ahora, de qué lado
# están y cómo se movieron". Eso lo consume gestos.py.
#
# Se usa el modelo hand_landmarker.task (carpeta modelos/). Si falta, bajalo de:
#   https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
#
# IMPORTANTE sobre la etiqueta izquierda/derecha:
#   MediaPipe asume una imagen ESPEJADA (cámara frontal al modo selfie) a la
#   hora de decir "Left"/"Right". Si levantás la mano DERECHA y el programa
#   dice "izq", poné INVERTIR_MANOS = True en config.py.
# =============================================================================

import os
import time

import config

try:
    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
except ImportError as e:                       # mensaje claro si falta algo
    raise SystemExit(
        'Faltan dependencias. Ejecutá:\n'
        '    python -m pip install mediapipe opencv-python\n'
        'Detalle: %s' % e
    )

IZQ = 'izq'
DER = 'der'
MANOS = (IZQ, DER)

_MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'modelos', 'hand_landmarker.task')

# Conexiones del esqueleto de la mano (21 landmarks), por si no está en la lib.
CONECTIVIDAD = (
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20),
    (0, 17),
)


class ManoHistorial(object):
    """Lo que sabemos de una mano (izq/der) a lo largo del tiempo."""

    __slots__ = ('lado', 'confianza', 'puntos', 'muestras', 'visible',
                 'gap_desde', 'perdidas', 'generacion', 'vista_vez')

    def __init__(self, lado):
        self.lado = lado
        self.confianza = 0.0
        self.puntos = []            # 21 landmarks (x, y, z) normalizados 0..1
        self.muestras = []          # [(t, x)] de los últimos LOOKBACK segundos
        self.visible = False
        self.gap_desde = None
        self.perdidas = 0
        self.generacion = 0         # cambia cada vez que se vacía el historial
        self.vista_vez = 0.0        # última vez que la vimos

    # -- atajos para los gestos ------------------------------------------------
    @property
    def x(self):
        return self.muestras[-1][1] if self.muestras else None

    @property
    def ultimo_t(self):
        return self.muestras[-1][0] if self.muestras else None

    def punto(self, i):
        """Landmark i (0 = muñeca, 4 = punta del pulgar, 8 = punta del índice,
        12 = medio, 16 = anular, 20 = meñique)."""
        if 0 <= i < len(self.puntos):
            p = self.puntos[i]
            return (p[0], p[1])
        return None

    def distancia(self, a, b):
        pa, pb = self.punto(a), self.punto(b)
        if pa is None or pb is None:
            return None
        return ((pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2) ** 0.5

    def __repr__(self):
        return '<Mano %s visible=%s x=%s>' % (self.lado, self.visible, self.x)


class Rastreador(object):
    """Envuelve HandLandmarker y mantiene un ManoHistorial por lado."""

    def __init__(self):
        if not os.path.exists(_MODELO):
            raise SystemExit(
                'Falta el modelo de MediaPipe:\n  %s\n\nBajalo con:\n'
                '  curl -o "%s"\n'
                '      https://storage.googleapis.com/mediapipe-models/'
                'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
                % (_MODELO, _MODELO))

        # Se lee como bytes y no como ruta: la carpeta "Instalación Infográfica"
        # tiene acentos y el backend C++ de MediaPipe en Windows no abre rutas
        # no-ASCII. Con el buffer no depende del filesystem.
        with open(_MODELO, 'rb') as f:
            modelo = f.read()

        self.landmarker = vision.HandLandmarker.create_from_options(
            vision.HandLandmarkerOptions(
                base_options=mp_python.BaseOptions(model_asset_buffer=modelo),
                running_mode=vision.RunningMode.VIDEO,
                num_hands=config.MAX_MANOS,
                min_hand_detection_confidence=config.CONFIANZA_DETECCION,
                min_hand_presence_confidence=config.CONFIANZA_DETECCION,
                min_tracking_confidence=config.CONFIANZA_RASTREO,
            ))
        self.manos = {IZQ: ManoHistorial(IZQ), DER: ManoHistorial(DER)}
        self._ultimo_ms = -1

    def cerrar(self):
        try:
            self.landmarker.close()
        except Exception:
            pass

    def procesar(self, frame_bgr):
        """Alimenta un frame BGR y actualiza los historiales. Devuelve el dict."""
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        imagen = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        # timestamps en ms estrictamente crecientes (lo pide RunningMode.VIDEO)
        ms = int(time.monotonic() * 1000)
        if ms <= self._ultimo_ms:
            ms = self._ultimo_ms + 1
        self._ultimo_ms = ms

        res = self.landmarker.detect_for_video(imagen, ms)

        t = time.time()
        vistas = set()

        for i, lms in enumerate(res.hand_landmarks):
            lado = self._lado(res, i)
            if lado is None or lado in vistas:
                continue          # dos detecciones del mismo lado: la primera gana
            vistas.add(lado)
            h = self.manos[lado]

            if h.gap_desde is not None and t - h.gap_desde > config.MAX_GAP:
                # vuelve después de una ausencia larga: historia nueva
                h.muestras = []
                h.generacion += 1
                h.gap_desde = None

            puntos = [(p.x, p.y, p.z) for p in lms]
            x = puntos[0][0]
            if config.INVERTIR_X:
                x = 1.0 - x

            h.puntos = puntos
            h.confianza = self._confianza(res, i)
            h.visible = True
            h.vista_vez = t
            h.gap_desde = None
            h.muestras.append((t, x))
            while h.muestras and t - h.muestras[0][0] > config.LOOKBACK:
                h.muestras.pop(0)

        # las que no aparecieron en este frame
        for lado, h in self.manos.items():
            if lado in vistas:
                continue
            h.visible = False
            h.puntos = []
            if h.gap_desde is None:
                h.gap_desde = t
                h.perdidas += 1
            elif t - h.gap_desde > config.MAX_GAP and h.muestras:
                h.muestras = []
                h.generacion += 1

        return self.manos

    # -- handedness -----------------------------------------------------------
    def _categoria(self, results, i):
        try:
            cats = results.handedness[i]
            return cats[0] if cats else None
        except Exception:
            return None

    def _lado(self, results, i):
        cat = self._categoria(results, i)
        if cat is None:
            return None
        label = getattr(cat, 'category_name', '') or ''
        if config.INVERTIR_MANOS:
            label = 'Right' if label == 'Left' else 'Left'
        if label == 'Left':
            return IZQ
        if label == 'Right':
            return DER
        return None

    def _confianza(self, results, i):
        cat = self._categoria(results, i)
        return float(getattr(cat, 'score', 0.0) or 0.0) if cat else 0.0


# -- dibujo de depuración -----------------------------------------------------
def dibujar(frame, manos, mostrar_esqueleto=True):
    """Dibuja los landmarks y la etiqueta de cada mano sobre el frame."""
    h, w = frame.shape[:2]
    colores = {IZQ: (255, 120, 0), DER: (0, 200, 80)}   # BGR: izq azul, der verde

    for lado, m in manos.items():
        if not m.visible or not m.puntos:
            continue
        c = colores[lado]
        if mostrar_esqueleto:
            for a, b in CONECTIVIDAD:
                pa, pb = m.puntos[a], m.puntos[b]
                cv2.line(frame, (int(pa[0] * w), int(pa[1] * h)),
                         (int(pb[0] * w), int(pb[1] * h)), c, 2)
            for p in m.puntos:
                cv2.circle(frame, (int(p[0] * w), int(p[1] * h)), 4, c, -1)

        mx, my = int(m.puntos[0][0] * w), int(m.puntos[0][1] * h)
        x0, y0 = max(0, mx - 40), max(24, my - 62)
        cv2.rectangle(frame, (x0, y0), (x0 + 80, y0 + 30), c, -1)
        cv2.putText(frame, 'MANO ' + ('IZQ' if lado == IZQ else 'DER'),
                    (x0 + 6, y0 + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                    (0, 0, 0), 2, cv2.LINE_AA)
    return frame
