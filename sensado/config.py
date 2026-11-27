# =============================================================================
# config.py — todos los ajustes del sensado en un solo lugar.
# Cambiá acá y volvé a correr sensado_manos.py (no hace falta tocar nada más).
# =============================================================================

# --- Cámara ------------------------------------------------------------------
CAMARA = 0              # índice de la webcam (0 = la primera)
ANCHO = 1280            # resolución que le pedimos a la cámara
ALTO = 720
# En Windows, DSHOW suele arrancar más rápido y libera mejor la cámara que
# el backend por defecto. Si te tira error de apertura, probá con '' (vacío).
BACKEND = 'DSHOW'

# --- Ventana de depuración ---------------------------------------------------
# True  = muestra la imagen de la cámara con los landmarks (para calibrar).
# False = corre a ciegas, sin ventana, sin consumir GPU de pantalla (instalación).
MOSTRAR_VENTANA = True
MOSTRAR_ESQUELETO = True   # dibuja los landmarks sobre la imagen

# --- Servidor WebSocket ------------------------------------------------------
# La página se conecta a ws://localhost:9980  (mismo protocolo que tenías en TD)
WS_HOST = '127.0.0.1'   # solo esta PC. Para otra PC: '0.0.0.0'
WS_PORT = 9980

# --- MediaPipe ---------------------------------------------------------------
MAX_MANOS = 2           # necesitamos las dos a la vez
CONFIANZA_DETECCION = 0.5
CONFIANZA_RASTREO = 0.5

# --- Orientación de la imagen / de las etiquetas -----------------------------
# MediaPipe asume una imagen ESPEJADA (cámara frontal al modo selfie) para
# ponerle "Left"/"Right". Si al levantar la mano DERECHA te figura "izq",
# poné INVERTIR_MANOS = True  (ver README, paso de calibración).
INVERTIR_MANOS = False
# True si querés que la x crezca hacia la izquierda (imagen en espejo).
INVERTIR_X = False

# --- Detección del swipe -----------------------------------------------------
# Las coordenadas de MediaPipe van de 0 a 1 (proporción del ancho del cuadro),
# no son centímetros. Ver "Calibrar" en el README para ajustar estos valores.
SWIPE_DISTANCE = 0.15   # Δx mínimo del gesto (~10 cm a ~60 cm de la cámara)
V_MIN = 0.35            # velocidad mínima (unidades/seg). Más lento = no es swipe.
V_MAX = 3.00            # velocidad máxima. Más rápido = salto de la detección.
LOOKBACK = 0.60         # cuánto tiempo se recuerdan muestras (seg)
CONSISTENCY = 0.80      # % mínimo de pasos en la misma dirección
JITTER = 0.004          # pasos más chicos que esto no cuentan como dirección opuesta
COOLDOWN = 0.50         # mínimo entre un swipe y el siguiente (seg)
REARM_DIST = 0.03       # vuelta mínima EN CONTRA del último swipe para re-armar
MAX_GAP = 0.30          # tolerancia si MediaPipe pierde la mano a mitad del gesto (seg)

# --- Gestos ------------------------------------------------------------------
# Mapeo mano izquierda / derecha -> mensaje que le manda a la web.
#   mano izquierda, desde su costado hacia el centro -> 'anterior'  (retroceder)
#   mano derecha,  desde su costado hacia el centro -> 'siguiente' (avanzar)
# Para agregar o cambiar gestos, mirá GESTOS en gestos.py.
MENSAJE_ATRAS = 'anterior'
MENSAJE_ADELANTE = 'siguiente'

# Dirección ESPERADA de cada swipe en coordenadas de imagen:
#   +1 = la x de la mano tiene que CRECER   (izquierda -> derecha en pantalla)
#   -1 = la x tiene que BAJAR              (derecha -> izquierda en pantalla)
# Si hacés el gesto y la web hace lo contrario, invertí el signo acá.
# (Estos valores se leen DESPUÉS de aplicar INVERTIR_X.)
# El gesto es del COSTADO hacia el CENTRO (antes era al revés: del centro hacia el costado).
DIR_MENSAJE_ATRAS = -1        # mano izquierda
DIR_MENSAJE_ADELANTE = +1     # mano derecha

# #############################################################################
# ##  AJUSTES DEL SENSADO DE LA PERSONA (cara.py) — cómo mide la cámara       ##
# ##  La otra mitad (qué se decide con estas medidas: umbrales de pelo largo, ##
# ##  rulos, anteojos, sonrisa, colores) está en js/personaje.js, en el       ##
# ##  bloque "AJUSTES DEL SENSADO DE LA PERSONA", al principio del archivo.   ##
# #############################################################################
# Para ver los números en vivo: tecla D en la muestra → "Ver mi personaje en vivo".
# IMPORTANTE: después de cambiar algo acá hay que cerrar y volver a abrir el sensado
#   (Ctrl+C en la ventana negra y de nuevo: C:\Python312\python.exe sensado_manos.py).

CARA = True                   # False = no detecta caras (sólo gestos). Útil si la compu anda lenta.

CARA_INTERVALO = 0.25         # cada cuántos segundos se analiza la cara. Más bajo = responde más rápido pero usa más CPU.
                              #   Ej.: si los gestos se traban, subilo a 0.4.

CARA_OLVIDO = 1.5             # segundos sin ver una cara para decidir que la persona se fue ("no veo a nadie").
                              #   Ej.: si "se olvida" de la persona cuando gira la cabeza un momento, subilo a 3.

CARA_ALTURA_PELO = 0.12       # dónde se toma el COLOR del pelo: cuánto más arriba de la frente (en altos de cara).
                              #   Ej.: si el color de pelo sale como el fondo (gente con poco pelo arriba), bajalo a 0.07.
                              #        si sale color piel (toma la frente), subilo a 0.18.

CARA_UMBRAL_PELADO = 45       # si el color "del pelo" se parece a la piel (diferencia menor a esto), se toma como pelado.
                              #   Ej.: a gente con pelo rubio/claro le sale pelado → bajalo a 30.
                              #        a un pelado le sale pelo → subilo a 60.

CARA_TOLERANCIA_PELO = 45     # cuánto se puede alejar un color del color del pelo para seguir contando como pelo
                              # (para medir el largo y el flequillo). Más alto = encuentra pelo más fácil (pero puede
                              # confundir sombras o el fondo con pelo).
                              #   Ej.: el pelo largo marca casi 0 aunque se ve el pelo → subilo a 60.
                              #        a todos les sale pelo largo o flequillo → bajalo a 35.

CARA_PESO_HOMBROS = 1.6       # cuánto pesa el pelo que cae sobre los hombros en el "largo".
                              # 1.6 → con ~40 % de los puntos de un hombro con pelo, el largo pasa 0.65 (= "largo").
                              #   Ej.: una chica de pelo largo y lacio (sin volumen arriba) sale con pelo corto → subilo a 2.
                              #        a chicos de pelo corto les sale largo (remera oscura parecida al pelo) → bajalo a 1.2.
# ######################## FIN DE LOS AJUSTES DEL SENSADO ########################
