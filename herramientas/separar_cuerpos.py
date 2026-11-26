# =============================================================================
# separar_cuerpos.py — separa los cuerpos con ropa (caraUsuario) en capas para poder pintarlas.
#
# Quien diseña entrega cada cuerpo en una sola imagen (cabeza + brazos + ropa), con cada zona pintada
# de un color de código y las líneas en negro:
#     blanco (o casi)      → piel
#     amarillo             → ropa1  (prenda principal: remera, enterito, camisa)
#     celeste              → ropa2  (pantalón / short)
#     lila / azul          → detalle (cuello, puños, hebilla)
#     rosa / rojo / naranja → acento (corbata, botones, cinto)
# Este script genera, por cada cuerpo, una capa blanca por zona (para teñirla con cualquier color) y una capa
# con las líneas negras, en assets/carausuario/capas/. La web (js/personaje.js) pinta cada zona y pone las
# líneas encima. (No se puede hacer en la web: con file:// el navegador no deja leer los píxeles.)
#
# Uso (desde la carpeta del proyecto):   python herramientas/separar_cuerpos.py
# Volvé a correrlo cada vez que cambie un cuerpo.
# =============================================================================
import colorsys
import os

import numpy as np
from PIL import Image

CARPETA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'carausuario')
CUERPOS = ['cuerpo_bebe', 'cuerpo_nino', 'cuerpo_adulto']
ZONAS = ['piel', 'ropa1', 'ropa2', 'detalle', 'acento']


def zona_de_tono(h):
    """Zona según el tono (0-360) de un color saturado."""
    if 35 <= h < 75:
        return 'ropa1'
    if 150 <= h < 205:
        return 'ropa2'
    if 205 <= h < 330:
        return 'detalle'
    return 'acento'   # rojos, rosas, naranjas


def separar(nombre):
    im = np.array(Image.open(os.path.join(CARPETA, nombre + '.png')).convert('RGBA')).astype(float)
    rgb, alfa = im[:, :, :3] / 255.0, im[:, :, 3] / 255.0
    lum = rgb.mean(axis=2)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    alto, ancho = lum.shape

    # 1) zona de cada píxel claro; los oscuros (líneas) toman la zona de sus vecinos
    zona = np.full((alto, ancho), -1, dtype=int)
    hsv = np.zeros((alto, ancho))
    ys, xs = np.where((alfa > 0.05) & (lum > 0.45))
    for y, x in zip(ys, xs):
        if sat[y, x] < 0.12:
            zona[y, x] = 0   # piel
        else:
            h = colorsys.rgb_to_hsv(*rgb[y, x])[0] * 360
            zona[y, x] = ZONAS.index(zona_de_tono(h))
    for _ in range(12):   # crecer las zonas por debajo de las líneas
        faltan = (zona < 0) & (alfa > 0.05)
        if not faltan.any():
            break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            vecino = np.roll(np.roll(zona, dy, axis=0), dx, axis=1)
            tomar = faltan & (vecino >= 0) & (zona < 0)
            zona[tomar] = vecino[tomar]
    zona[(zona < 0) & (alfa > 0.05)] = 0

    # 2) brillo de referencia de cada zona (su color de código) para saber cuánto negro tiene cada píxel
    referencia = {}
    for i in range(len(ZONAS)):
        sel = (zona == i) & (lum > 0.45)
        referencia[i] = np.percentile(lum[sel], 90) if sel.any() else 1.0

    salida = os.path.join(CARPETA, 'capas')
    os.makedirs(salida, exist_ok=True)
    blanco = np.full((alto, ancho, 3), 255, dtype=np.uint8)
    for i, z in enumerate(ZONAS):
        a = np.where(zona == i, alfa, 0)
        capa = np.dstack([blanco, (a * 255).astype(np.uint8)])
        Image.fromarray(capa, 'RGBA').save(os.path.join(salida, '%s_%s.png' % (nombre, z)))
    # líneas: negro con la opacidad de lo que le falta al píxel para ser su color de código
    ref = np.vectorize(lambda i: referencia.get(i, 1.0))(zona)
    oscuro = np.clip((ref - lum) / np.maximum(ref, 1e-6), 0, 1) * alfa
    oscuro[oscuro < 0.06] = 0
    capa = np.dstack([np.zeros((alto, ancho, 3), dtype=np.uint8), (oscuro * 255).astype(np.uint8)])
    Image.fromarray(capa, 'RGBA').save(os.path.join(salida, '%s_lineas.png' % nombre))
    usadas = [z for i, z in enumerate(ZONAS) if (zona == i).any()]
    print('%s: %s' % (nombre, ', '.join(usadas)))


if __name__ == '__main__':
    for c in CUERPOS:
        separar(c)
