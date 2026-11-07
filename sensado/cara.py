# =============================================================================
# cara.py — detección de la cara del visitante (para caraUsuario).
#
# Usa el modelo face_landmarker.task (carpeta modelos/). Si falta, bajalo de:
#   https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
#
# De la cara saca rasgos simples y los manda por el mismo WebSocket que los gestos:
#   cara:{"piel":"#d9a074","pelo":"#2b1d14","pelado":false,"sonrisa":0.12,"ojos":0.27,"x":0.51}
#   ojos = qué tan abiertos son: alto / ancho del ojo (~0.18 achinados … ~0.32 bien redondos)
#   cara:nadie            (cuando la persona se va)
# La web decide qué hacer con eso (pruebas/carausuario.html arma el personaje).
# =============================================================================

import json
import os

import config

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

_MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'modelos', 'face_landmarker.task')

# Landmarks de la malla de la cara (468 puntos) que usamos
FRENTE_ARRIBA = 10      # punto más alto de la frente
MENTON = 152
MEJILLA_IZQ = 50
MEJILLA_DER = 280
FRENTE = 151
COSTADO_IZQ = 234
COSTADO_DER = 454
# contorno de los ojos: (arriba, abajo, rabillo, lagrimal)
OJO_A = (159, 145, 33, 133)
OJO_B = (386, 374, 263, 362)


def _hex(rgb):
    return '#%02x%02x%02x' % tuple(int(max(0, min(255, c))) for c in rgb)


def _muestra(frame, cx, cy, r):
    """Color mediano (RGB) de un cuadradito de lado 2r alrededor de (cx, cy), en píxeles."""
    h, w = frame.shape[:2]
    x0, x1 = max(0, int(cx - r)), min(w, int(cx + r))
    y0, y1 = max(0, int(cy - r)), min(h, int(cy + r))
    if x1 <= x0 or y1 <= y0:
        return None
    zona = frame[y0:y1, x0:x1].reshape(-1, 3)
    b, g, r_ = [float(sorted(zona[:, i])[len(zona) // 2]) for i in range(3)]
    return (r_, g, b)


def _distancia(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


class DetectorCara(object):
    def __init__(self):
        if not os.path.exists(_MODELO):
            raise SystemExit('Falta el modelo de cara: %s' % _MODELO)
        self.landmarker = vision.FaceLandmarker.create_from_options(
            vision.FaceLandmarkerOptions(
                base_options=mp_python.BaseOptions(model_asset_path=_MODELO),
                running_mode=vision.RunningMode.VIDEO,
                num_faces=1,
                output_face_blendshapes=True,
            ))
        self.ultimo_t = 0.0          # última vez que se analizó un frame
        self.ultimo_ms = 0
        self.vista_vez = 0.0         # última vez que se vio una cara
        self.presente = False
        self.rasgos = None           # lo último que se detectó (para la ventana)
        self.puntos = None           # landmarks en píxeles (para dibujar)
        self.aperturas = []          # últimas mediciones de apertura de ojos (para no contar parpadeos)

    def cerrar(self):
        try:
            self.landmarker.close()
        except Exception:
            pass

    def procesar(self, frame, ahora):
        """Analiza la cara cada CARA_INTERVALO segundos. Devuelve el mensaje a mandar o None."""
        if ahora - self.ultimo_t < config.CARA_INTERVALO:
            return None
        self.ultimo_t = ahora

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        ms = max(int(ahora * 1000), self.ultimo_ms + 1)   # estrictamente creciente
        self.ultimo_ms = ms
        res = self.landmarker.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ms)

        if not res.face_landmarks:
            self.puntos = None
            # se fue: avisar una sola vez, después de un ratito sin verla
            if self.presente and ahora - self.vista_vez > config.CARA_OLVIDO:
                self.presente = False
                self.rasgos = None
                self.aperturas = []
                return 'cara:nadie'
            return None

        self.vista_vez = ahora
        self.presente = True
        h, w = frame.shape[:2]
        lm = res.face_landmarks[0]
        P = lambda i: (lm[i].x * w, lm[i].y * h)
        self.puntos = [P(i) for i in range(len(lm))]

        alto_cara = abs(P(MENTON)[1] - P(FRENTE_ARRIBA)[1])
        ancho_cara = abs(P(COSTADO_DER)[0] - P(COSTADO_IZQ)[0])
        r = max(3, alto_cara * 0.035)

        # piel: mejillas y frente
        tonos = [c for c in (_muestra(frame, *P(i), r=r) for i in (MEJILLA_IZQ, MEJILLA_DER, FRENTE)) if c]
        piel = tuple(sorted(t[k] for t in tonos)[len(tonos) // 2] for k in range(3)) if tonos else (200, 160, 130)

        # pelo: un poco más arriba de la frente, en el medio y a los costados
        fx, fy = P(FRENTE_ARRIBA)
        y_pelo = fy - alto_cara * config.CARA_ALTURA_PELO
        pelos = [c for c in (_muestra(frame, fx + dx * ancho_cara, y_pelo, r) for dx in (-0.22, 0, 0.22)) if c]
        pelo = tuple(sorted(t[k] for t in pelos)[len(pelos) // 2] for k in range(3)) if pelos else (40, 30, 20)
        # si lo de arriba de la frente se parece a la piel, no hay pelo (o es muy corto)
        pelado = _distancia(pelo, piel) < config.CARA_UMBRAL_PELADO

        sonrisa = 0.0
        if res.face_blendshapes:
            bs = {c.category_name: c.score for c in res.face_blendshapes[0]}
            sonrisa = (bs.get('mouthSmileLeft', 0) + bs.get('mouthSmileRight', 0)) / 2

        # ojos: alto / ancho de cada ojo. Se guardan las últimas mediciones y se usa una de las más altas,
        # así un parpadeo (ojo cerrado un instante) no cuenta como ojos achinados.
        def apertura(o):
            arriba, abajo, a, b = (P(i) for i in o)
            ancho = _distancia(a, b)
            return _distancia(arriba, abajo) / ancho if ancho else 0
        self.aperturas.append((apertura(OJO_A) + apertura(OJO_B)) / 2)
        del self.aperturas[:-12]   # ~3 segundos
        orden = sorted(self.aperturas)
        ojos = orden[int(len(orden) * 0.75)]

        x = sum(p.x for p in lm) / len(lm)
        if config.INVERTIR_X:
            x = 1 - x
        self.rasgos = {'piel': _hex(piel), 'pelo': _hex(pelo), 'pelado': pelado,
                       'sonrisa': round(sonrisa, 2), 'ojos': round(ojos, 3), 'x': round(x, 3),
                       'muestra_pelo': (fx, y_pelo), 'r': r}
        datos = {k: v for k, v in self.rasgos.items() if k not in ('muestra_pelo', 'r')}
        return 'cara:' + json.dumps(datos)


def dibujar_cara(frame, det):
    """Para la ventana de calibración: contorno de la cara y dónde se toman los colores."""
    if not det.puntos or not det.rasgos:
        return
    xs = [p[0] for p in det.puntos]
    ys = [p[1] for p in det.puntos]
    cv2.rectangle(frame, (int(min(xs)), int(min(ys))), (int(max(xs)), int(max(ys))), (60, 220, 120), 2)
    r = int(det.rasgos['r'])
    for i in (MEJILLA_IZQ, MEJILLA_DER, FRENTE):
        x, y = det.puntos[i]
        cv2.rectangle(frame, (int(x - r), int(y - r)), (int(x + r), int(y + r)), (255, 255, 255), 1)
    fx, fy = det.rasgos['muestra_pelo']
    cv2.circle(frame, (int(fx), int(fy)), r, (0, 200, 255), 2)
    texto = 'CARA piel %s  pelo %s%s  sonrisa %.2f  ojos %.2f' % (
        det.rasgos['piel'], det.rasgos['pelo'], ' (pelado?)' if det.rasgos['pelado'] else '',
        det.rasgos['sonrisa'], det.rasgos['ojos'])
    cv2.putText(frame, texto, (int(min(xs)), int(max(ys)) + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(frame, texto, (int(min(xs)), int(max(ys)) + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (240, 240, 240), 1, cv2.LINE_AA)
