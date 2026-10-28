# =============================================================================
# gestos.py — acá está TODO lo que es "gesto". Para agregar uno nuevo, mirá la
# receta al final del archivo (y el README, sección "Agregar un gesto nuevo").
#
# Un gesto recibe, cada frame, el estado de las dos manos y devuelve el mensaje
# de texto que hay que mandarle a la web (o None si no pasó nada).
# El mensaje puede ser cualquiera: 'siguiente', 'anterior', 'pinch:izq', ...
# =============================================================================

import time

import config
from manos import IZQ, DER

# Guarda los gestos activos. El orden importa: se preguntan en este orden y el
# primero que devuelve un mensaje es el que manda.
GESTOS = []


class Gesto(object):
    """Interfaz base. Subí esta clase e implementá frame()."""

    nombre = 'gesto'
    descripcion = ''

    def reiniciar(self):
        """Borra el estado interno (se llama cuando la mano desaparece mucho)."""

    def frame(self, manos, t):
        """manos = {'izq': ManoHistorial, 'der': ManoHistorial}. Devuelve str|list|None."""
        return None


def registrar(gesto):
    """Agrega un gesto a la lista de activos."""
    GESTOS.append(gesto)
    return gesto


# =============================================================================
#  Swipe: el movimiento horizontal de una mano, en una dirección concreta
# =============================================================================
class SwipePorMano(Gesto):
    """Dispara cuando la mano `lado` se desplaza `SWIPE_DISTANCE` en la dirección
    `direccion` (+1 = la x crece, -1 = la x baja) con velocidad moderada y
    movimiento continuo. Devuelve `mensaje`."""

    def __init__(self, nombre, lado, direccion, mensaje, descripcion=''):
        self.nombre = nombre
        self.lado = lado
        self.direccion = 1 if direccion > 0 else -1
        self.mensaje = mensaje
        self.descripcion = descripcion or ('swipe %s -> %s' % (lado, mensaje))
        self.armed = True
        self.trigger_x = 0.0
        self.trigger_dir = 1.0
        self.last_trigger = 0.0
        self.desde = 0.0         # solo miro muestras posteriores a esta hora
        self.gen = -1
        self.disparos = 0
        self.ultimo_dx = 0.0
        self.ultima_vel = 0.0

    def reiniciar(self):
        self.armed = True
        self.trigger_x = 0.0
        self.trigger_dir = 1.0
        self.last_trigger = 0.0
        self.desde = 0.0

    def frame(self, manos, t):
        h = manos.get(self.lado)
        if h is None:
            return None

        # el historial se vació (mano perdida demasiado tiempo) -> arrancar de cero
        if h.generacion != self.gen:
            self.gen = h.generacion
            self.reiniciar()

        # mano ausente: no disparamos, pero el historial queda intacto por si
        # vuelve antes de MAX_GAP y el gesto se completa igual
        if not h.visible or not h.muestras:
            return None

        # vista propia del historial: nunca modifico la lista compartida, así
        # varios gestos pueden convivir sobre la misma mano sin pisarse
        muestras = [m for m in h.muestras if m[0] > self.desde]
        if len(muestras) < 2:
            return None

        x = muestras[-1][1]

        if not self.armed:
            # re-armar solo cuando la mano vuelve EN CONTRA del último swipe:
            # un rebote en la misma dirección no debe volver a armar
            if (x - self.trigger_x) * self.trigger_dir <= -config.REARM_DIST:
                self.armed = True
                # solo siguen contando las muestras posteriores al disparo
                self.desde = self.last_trigger
            return None

        if t - self.last_trigger < config.COOLDOWN:
            return None

        ultimo = muestras[-1]
        for i in range(len(muestras) - 1, -1, -1):
            t0, x0 = muestras[i]
            dt = ultimo[0] - t0
            dx = ultimo[1] - x0
            if abs(dx) < config.SWIPE_DISTANCE:
                continue
            if dt <= 0:
                break

            self.ultimo_dx = dx
            vel = abs(dx) / dt
            self.ultima_vel = vel

            if vel > config.V_MAX:
                # salto brusco de la detección, no un swipe: descartamos el historial
                self.desde = ultimo[0]
                break

            # dirección equivocada para ESTA mano: la ignoramos y listo
            if (1 if dx > 0 else -1) != self.direccion:
                break

            if vel >= config.V_MIN and _consistente(muestras, i, dx):
                self.armed = False
                self.last_trigger = t
                self.trigger_x = x
                self.trigger_dir = 1.0 if dx > 0 else -1.0
                self.disparos += 1
                return self.mensaje
            break

        return None

    def __repr__(self):
        return '<Swipe %s %s dir=%+d -> %s>' % (
            self.nombre, self.lado, self.direccion, self.mensaje)


def _consistente(muestras, i, total_dx):
    """True si casi todos los pasos van en la dirección del movimiento total
    (movimiento continuo, sin rebotes)."""
    signo = 1.0 if total_dx > 0 else -1.0
    pasos = buenos = 0
    for j in range(i, len(muestras) - 1):
        d = muestras[j + 1][1] - muestras[j][1]
        pasos += 1
        if d * signo > 0 or abs(d) < config.JITTER:
            buenos += 1
    return pasos == 0 or (buenos / pasos) >= config.CONSISTENCY


# =============================================================================
#  LOS GESTOS ACTIVOS
# =============================================================================
# Mano izquierda, de izquierda a derecha  -> retroceder
registrar(SwipePorMano(
    'retroceder', IZQ, config.DIR_MENSAJE_ATRAS, config.MENSAJE_ATRAS,
    'mano izquierda deslizando izquierda -> derecha'))

# Mano derecha, de derecha a izquierda -> avanzar
registrar(SwipePorMano(
    'avanzar', DER, config.DIR_MENSAJE_ADELANTE, config.MENSAJE_ADELANTE,
    'mano derecha deslizando derecha -> izquierda'))


# =============================================================================
#  RECETA: agregar un gesto nuevo
# =============================================================================
# 1. Creá una clase que herede de Gesto e implementá frame().
# 2. Registrá una instancia abajo, en LOS GESTOS ACTIVOS.
# 3. Decidí vos qué mensaje manda; la web lo recibe tal cual por WebSocket.
#
# Lo que tenés disponible en frame():
#   manos['izq'] / manos['der']   -> objeto ManoHistorial (ver manos.py)
#       .visible          bool    ¿está la mano en el cuadro ahora?
#       .x                float   x actual de la muñeca (0..1), o None
#       .muestras         list    [(t, x)] de los últimos 0.6 s
#       .punto(i)         (x, y)  landmark i (0 muñeca, 4 pulgar, 8 índice,
#                                 12 medio, 16 anular, 20 meñique)
#       .distancia(a, b)  float   distancia entre dos landmarks
#       .confianza        float   0..1
#   t                       tiempo actual (time.time())
#
# Ejemplo mínimo — pinch con el índice de cualquiera de las dos manos:
#
#     class Pinch(Gesto):
#         nombre = 'pinch'
#
#         def frame(self, manos, t):
#             for lado, h in manos.items():
#                 if not h.visible:
#                     continue
#                 d = h.distancia(4, 8)          # pulgar <-> índice
#                 if d is not None and d < 0.05:
#                     return 'pinch:' + lado
#             return None
#
#     registrar(Pinch())
#
# Consejo: si el gesto necesita "se armó / se disparó", copiá el patrón de
# SwipePorMano (self.armed, self.last_trigger, self.gen).
