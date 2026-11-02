# =============================================================================
# sensado_manos.py — punto de entrada.
#
#   python sensado_manos.py                 # con ventana de depuración
#   python sensado_manos.py --sin-ventana   # para la instalación (corre de fondo)
#
# Abre la webcam, detecta las dos manos con MediaPipe, corre los gestos de
# gestos.py y manda el mensaje que corresponda por WebSocket a ws://127.0.0.1:9980
# (el mismo puerto y el mismo protocolo que tenías con TouchDesigner).
#
# Ctrl+C o la tecla ESC / Q para salir.
# =============================================================================

import argparse
import sys
import time

import config

# Windows usa cp1252/cp437 por defecto y se ven roto los acentos del log.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass


def parsear_args():
    p = argparse.ArgumentParser(description='Sensado de manos -> WebSocket')
    p.add_argument('--camara', type=int, default=config.CAMARA,
                   help='índice de la webcam (default %s)' % config.CAMARA)
    p.add_argument('--puerto', type=int, default=config.WS_PORT,
                   help='puerto del servidor WebSocket (default %s)' % config.WS_PORT)
    p.add_argument('--host', default=config.WS_HOST,
                   help='host del servidor WebSocket (default %s)' % config.WS_HOST)
    p.add_argument('--sin-ventana', action='store_true',
                   help='no abre ventana de depuración (para correr en segundo plano)')
    return p.parse_args()


def _backend_id(nombre):
    """'DSHOW' -> cv2.CAP_DSHOW (OpenCV 5 no expone getBackendID)."""
    import cv2
    attr = {'DSHOW': 'CAP_DSHOW', 'MSMF': 'CAP_MSMF',
            'FFMPEG': 'CAP_FFMPEG', 'ANY': 'CAP_ANY'}.get(
                (nombre or '').upper(), 'CAP_ANY')
    return getattr(cv2, attr, cv2.CAP_ANY)


def abrir_camara(idx):
    import cv2
    backends = [config.BACKEND, 'MSMF', 'ANY', ''] if config.BACKEND else ['', 'MSMF', 'ANY']
    fallos = []
    for b in backends:
        nombre = b or 'default'
        errores = []
        cap = cv2.VideoCapture(idx, _backend_id(b))
        if not cap.isOpened():
            fallos.append('%s: no abrió' % nombre)
            cap.release()
            continue

        for prop, valor in ((cv2.CAP_PROP_FRAME_WIDTH, config.ANCHO),
                            (cv2.CAP_PROP_FRAME_HEIGHT, config.ALTO)):
            try:
                cap.set(prop, valor)
            except Exception as e:
                # en Windows algunos backends tiran excepción al fijar resolución;
                # no es grave: la cámara sigue andando con la que venga
                errores.append('%s: no pude fijar resolución (%s)' % (nombre, e))

        try:
            ok, _ = cap.read()
        except Exception as e:
            ok = False
            errores.append('%s: error leyendo frame (%s)' % (nombre, e))
        if ok:
            if errores:
                print('aviso al abrir la cámara: ' + ' | '.join(errores))
            return cap
        fallos.append('%s: abrió pero no dio frames' % nombre)
        cap.release()

    raise SystemExit('No pude abrir la cámara %s. %s\n'
                     'Fijate que otra aplicación no la esté usando: '
                     'cerrá TouchDesigner y probá de nuevo.' % (idx, '; '.join(fallos)))


def main():
    args = parsear_args()

    config.CAMARA = args.camara
    config.WS_PORT = args.puerto
    config.WS_HOST = args.host
    mostrar = config.MOSTRAR_VENTANA and not args.sin_ventana

    import cv2

    from gestos import GESTOS
    from manos import Rastreador, dibujar
    from servidor_ws import ServidorWebSocket

    print('=' * 68)
    print('  Sensado de manos  ->  ws://%s:%s' % (config.WS_HOST, config.WS_PORT))
    print('  Gestos activos:')
    for g in GESTOS:
        print('    - %-12s %s' % (g.nombre, g.descripcion))
    print('=' * 68)

    srv = ServidorWebSocket(config.WS_HOST, config.WS_PORT)
    try:
        srv.start()
    except OSError as e:
        raise SystemExit('No pude abrir el puerto %s: %s\n'
                         '¿Hay otro sensado corriendo (TouchDesigner u otra copia '
                         'de este script)?' % (config.WS_PORT, e))

    cap = abrir_camara(config.CAMARA)
    rastreador = Rastreador()

    historial = []          # últimas líneas de log para la ventana
    fps = 0.0
    t_fps = time.time()
    frames = 0
    ultimo_status = 0.0

    def log(txt):
        historial.append(time.strftime('%H:%M:%S') + '  ' + txt)
        del historial[:-8]
        print(txt)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print('! la cámara dejó de dar frames')
                time.sleep(0.5)
                continue

            ahora = time.time()
            manos = rastreador.procesar(frame)

            # --- correr los gestos y despachar --------------------------------
            for g in GESTOS:
                res = g.frame(manos, ahora)
                if not res:
                    continue
                mensajes = res if isinstance(res, (list, tuple)) else [res]
                for m in mensajes:
                    srv.send(m)
                    log('  -> %-12s %s   (%s)' % (g.nombre, m, g.lado
                                                   if hasattr(g, 'lado') else 'ambas'))

            # --- fps -----------------------------------------------------------
            frames += 1
            if ahora - t_fps >= 1.0:
                fps = frames / (ahora - t_fps)
                frames = 0
                t_fps = ahora

            # --- dibujar -------------------------------------------------------
            if mostrar:
                dibujar(frame, manos, config.MOSTRAR_ESQUELETO)
                _overlay(frame, manos, srv, fps, historial)
                cv2.imshow('sensado de manos (ESC para salir)', frame)
                if cv2.waitKey(1) & 0xFF in (27, ord('q')):
                    break
            else:
                # sin ventana no hay waitKey: cortito para no quemar la CPU
                time.sleep(0.001)

            if ahora - ultimo_status > 5.0:
                ultimo_status = ahora
                print('[%s] clientes=%d fps=%.1f  izq=%s  der=%s' % (
                    time.strftime('%H:%M:%S'), srv.clientes, fps,
                    'si' if manos['izq'].visible else 'no',
                    'si' if manos['der'].visible else 'no'))

    except KeyboardInterrupt:
        print('\nsaliendo...')
    finally:
        try:
            cap.release()
        except Exception:
            pass
        rastreador.cerrar()
        srv.stop()
        if mostrar:
            try:
                cv2.destroyAllWindows()
            except Exception:
                pass
    return 0


def _overlay(frame, manos, srv, fps, historial):
    """Información de calibración dibujada sobre el video."""
    import cv2

    lineas = [
        'WS %s:%s   clientes:%d   fps:%.1f' % (config.WS_HOST, config.WS_PORT,
                                                srv.clientes, fps),
        '',
    ]
    for lado in ('izq', 'der'):
        h = manos[lado]
        if h.visible and h.x is not None:
            lineas.append('%-3s  x=%.3f  conf=%.2f  perdidas=%d'
                          % (lado.upper(), h.x, h.confianza, h.perdidas))
        else:
            lineas.append('%-3s  (no detectada)' % lado.upper())

    lineas.append('')
    lineas.append('gestos:')
    from gestos import GESTOS
    for g in GESTOS:
        lado = getattr(g, 'lado', '?')
        dir_ = getattr(g, 'direccion', 0)
        lineas.append('  %-11s mano %-3s dir=%+d  dx=%+.3f  v=%.2f  n=%d'
                      % (g.nombre, lado, dir_, g.ultimo_dx, g.ultima_vel, g.disparos))
    if historial:
        lineas.append('')
        lineas.extend(historial[-5:])

    y = 22
    for ln in lineas:
        cv2.putText(frame, ln, (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                    (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(frame, ln, (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                    (240, 240, 240), 1, cv2.LINE_AA)
        y += 20


if __name__ == '__main__':
    sys.exit(main())
