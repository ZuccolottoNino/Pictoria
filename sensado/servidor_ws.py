# =============================================================================
# servidor_ws.py — servidor WebSocket mínimo (RFC 6455), sin dependencias.
#
# Mismo protocolo que el que ya usabas con TouchDesigner: la página se conecta
# a ws://127.0.0.1:9980 y recibe texto plano ("siguiente", "anterior", ...).
# Portado tal cual desde sensorestdi2/swipe_detect.py para que el HTML no cambie.
# =============================================================================

import base64
import hashlib
import queue
import select
import socket
import struct
import threading
import time

_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'


def _frame(opcode, payload):
    n = len(payload)
    hdr = bytearray([0x80 | opcode])
    if n < 126:
        hdr.append(n)
    elif n < 65536:
        hdr.append(126)
        hdr += struct.pack('>H', n)
    else:
        hdr.append(127)
        hdr += struct.pack('>Q', n)
    return bytes(hdr) + payload


class ServidorWebSocket(object):
    """Hilo en segundo plano con select(). Uso:

        srv = ServidorWebSocket('127.0.0.1', 9980)
        srv.start()
        srv.send('siguiente')      # a todos los navegadores conectados
        ...
        srv.stop()
    """

    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.sock = None
        self.clients = []
        self.out = queue.Queue()
        self.running = False
        self.thread = None
        self.error = ''

    # -- ciclo de vida --------------------------------------------------------
    def start(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((self.host, self.port))
        s.listen(4)
        s.setblocking(False)
        self.sock = s
        self.running = True
        self.error = ''
        self.thread = threading.Thread(target=self._loop, name='ws-server', daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        for c in list(self.clients):
            try:
                c.close()
            except Exception:
                pass
        self.clients = []
        if self.sock is not None:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def send(self, msg):
        """Encola un mensaje de texto para todos los clientes."""
        if self.running:
            self.out.put(msg)

    @property
    def clientes(self):
        return len(self.clients)

    # -- bucle principal ------------------------------------------------------
    def _loop(self):
        while self.running:
            try:
                readable, _, _ = select.select([self.sock] + list(self.clients), [], [], 0.05)
            except Exception:
                time.sleep(0.05)
                continue

            for s in readable:
                if s is self.sock:
                    self._accept()
                else:
                    self._read(s)

            if not self.out.empty():
                msgs = []
                try:
                    while True:
                        msgs.append(self.out.get_nowait())
                except queue.Empty:
                    pass
                for c in list(self.clients):
                    vivo = True
                    for m in msgs:
                        if not self._write(c, _frame(0x1, m.encode('utf-8'))):
                            vivo = False
                            break
                    if not vivo:
                        self._drop(c)

    # -- conexión -------------------------------------------------------------
    def _accept(self):
        try:
            c, _ = self.sock.accept()
        except Exception:
            return
        try:
            c.settimeout(2.0)
            buf = b''
            while b'\r\n\r\n' not in buf and len(buf) < 8192:
                chunk = c.recv(1024)
                if not chunk:
                    break
                buf += chunk
            key = ''
            for line in buf.decode('latin-1', 'replace').split('\r\n'):
                if line.lower().startswith('sec-websocket-key:'):
                    key = line.split(':', 1)[1].strip()
            if not key:
                c.sendall(b'HTTP/1.1 400 Bad Request\r\n\r\n')
                c.close()
                return
            acc = base64.b64encode(hashlib.sha1((key + _GUID).encode()).digest()).decode()
            resp = ('HTTP/1.1 101 Switching Protocols\r\n'
                    'Upgrade: websocket\r\n'
                    'Connection: Upgrade\r\n'
                    'Sec-WebSocket-Accept: ' + acc + '\r\n\r\n')
            c.sendall(resp.encode('ascii'))
            c.setblocking(False)
            self.clients.append(c)
            self._write(c, _frame(0x1, b'conectado'))
        except Exception:
            try:
                c.close()
            except Exception:
                pass

    def _read(self, s):
        try:
            data = s.recv(4096)
        except Exception:
            self._drop(s)
            return
        if not data:
            self._drop(s)
            return
        code = data[0] & 0x0F
        if code == 8:                       # close
            self._drop(s)
            return
        if code == 9 and len(data) >= 2:    # ping -> pong
            ln = data[1] & 0x7F
            masked = (data[1] & 0x80) != 0
            off = 2
            mask = data[off:off + 4] if masked else None
            if masked:
                off += 4
            payload = bytearray(data[off:off + ln])
            if mask:
                for i in range(len(payload)):
                    payload[i] ^= mask[i % 4]
            self._write(s, _frame(0xA, bytes(payload)))

    def _write(self, s, raw):
        try:
            s.sendall(raw)
            return True
        except Exception:
            return False

    def _drop(self, s):
        try:
            s.close()
        except Exception:
            pass
        if s in self.clients:
            self.clients.remove(s)
