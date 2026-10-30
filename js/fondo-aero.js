/* fondo-aero.js: fondo animado estilo Frutiger Aero (ondas de luz turquesa) para el núcleo 2.

   Se dibuja en un <canvas> que ocupa TODA la ventana (no el escenario de 1920x1080),
   así nunca quedan franjas negras a los costados, sea cual sea la proporción de la pantalla.
   Todo está en coordenadas relativas (0 a 1) para que se adapte a cualquier tamaño.

   Uso: <canvas id="fondo-aero"></canvas> + FondoAero.iniciar("#fondo-aero")
*/
(function () {
  /* ---------- Ajustes ---------- */
  var COLORES = {
    arriba:   "#035a52",   // esquina superior derecha (la más oscura)
    medio:    "#08918f",
    abajo:    "#3fd6f2",   // esquina inferior izquierda (la más luminosa)
    onda:     "190, 250, 255",   // color de las líneas de luz (r, g, b)
    destello: "255, 255, 255"
  };
  var VELOCIDAD = 1;   // 1 = normal; más chico = más lento

  /* Cada "cinta" es un haz de líneas finas que siguen una curva (Bézier cuadrática:
     inicio p0, control p1, fin p2), separadas entre sí y ondulando a su ritmo. */
  var CINTAS = [
    // gran barrido que baja desde arriba a la izquierda
    { p0: [-0.05, 0.10], p1: [0.28, 0.58], p2: [1.05, 0.80], lineas: 16, sep: 3.5, alfa: 0.22, ancho: 1.4, onda: 10, frec: 3, vel: 0.35 },
    // lámina ancha casi horizontal abajo
    { p0: [-0.05, 0.68], p1: [0.45, 0.80], p2: [1.05, 0.90], lineas: 22, sep: 4.5, alfa: 0.16, ancho: 1.2, onda: 14, frec: 2, vel: 0.25 },
    // brillo intenso pegado al borde inferior
    { p0: [-0.05, 0.86], p1: [0.50, 0.97], p2: [1.05, 0.84], lineas: 12, sep: 2.5, alfa: 0.30, ancho: 1.6, onda: 8,  frec: 2.5, vel: 0.4 },
    // arco que sube por la derecha
    { p0: [0.72, 1.05], p1: [0.93, 0.78], p2: [1.02, 0.12], lineas: 12, sep: 3,   alfa: 0.20, ancho: 1.3, onda: 12, frec: 2, vel: 0.3 },
    // estrías finas en diagonal (las "rayitas" del medio)
    { p0: [0.06, 0.52], p1: [0.33, 0.62], p2: [0.62, 0.82], lineas: 24, sep: 7,   alfa: 0.08, ancho: 1,   onda: 6,  frec: 4, vel: 0.5 }
  ];

  /* Rayos de luz verticales, muy suaves */
  var RAYOS = [
    { x: 0.18, ancho: 0.06, alfa: 0.08, vel: 0.07 },
    { x: 0.38, ancho: 0.10, alfa: 0.07, vel: 0.05 },
    { x: 0.52, ancho: 0.05, alfa: 0.09, vel: 0.09 },
    { x: 0.66, ancho: 0.12, alfa: 0.06, vel: 0.04 },
    { x: 0.84, ancho: 0.07, alfa: 0.07, vel: 0.06 }
  ];

  var BURBUJAS = 14;

  /* ---------- Motor ---------- */
  var canvas, ctx, W = 0, H = 0, dpr = 1, burbujas = [], inicio = 0, corriendo = false;

  function ajustar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function nuevaBurbuja(alAzar) {
    return {
      x: Math.random(), y: alAzar ? Math.random() : 1.08,
      r: 4 + Math.random() * 18, vel: 0.015 + Math.random() * 0.03,
      fase: Math.random() * 6.28, alfa: 0.15 + Math.random() * 0.25
    };
  }

  function fondo(t) {
    var g = ctx.createLinearGradient(W, 0, 0, H);
    g.addColorStop(0, COLORES.arriba);
    g.addColorStop(0.55, COLORES.medio);
    g.addColorStop(1, COLORES.abajo);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function rayos(t) {
    RAYOS.forEach(function (r, i) {
      var cx = (r.x + Math.sin(t * r.vel + i) * 0.03) * W, a = r.ancho * W;
      var alfa = r.alfa * (0.7 + 0.3 * Math.sin(t * 0.4 + i * 2));
      var g = ctx.createLinearGradient(cx - a, 0, cx + a, 0);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255," + alfa + ")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - a, 0, a * 2, H);
    });
  }

  function cinta(c, t, k) {
    // los puntos de control también flotan un poco, así la cinta entera "respira"
    var flota = Math.sin(t * 0.2 + k) * 0.02;
    var x0 = c.p0[0] * W, y0 = (c.p0[1] + flota) * H;
    var x1 = c.p1[0] * W, y1 = (c.p1[1] - flota) * H;
    var x2 = c.p2[0] * W, y2 = (c.p2[1] + flota * 0.5) * H;
    var PASOS = 60;
    for (var i = 0; i < c.lineas; i++) {
      var centro = 1 - Math.abs(i - c.lineas / 2) / (c.lineas / 2);   // las del medio brillan más
      ctx.strokeStyle = "rgba(" + COLORES.onda + "," + (c.alfa * (0.35 + 0.65 * centro)) + ")";
      ctx.lineWidth = c.ancho;
      ctx.beginPath();
      for (var s = 0; s <= PASOS; s++) {
        var u = s / PASOS, v = 1 - u;
        // punto y tangente de la curva
        var px = v * v * x0 + 2 * v * u * x1 + u * u * x2;
        var py = v * v * y0 + 2 * v * u * y1 + u * u * y2;
        var tx = 2 * v * (x1 - x0) + 2 * u * (x2 - x1);
        var ty = 2 * v * (y1 - y0) + 2 * u * (y2 - y1);
        var l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
        // separación de cada línea + ondulación que viaja a lo largo de la cinta
        var d = (i - c.lineas / 2) * c.sep + Math.sin(u * c.frec * 6.28 - t * c.vel * 2 + i * 0.25) * c.onda * (0.4 + u);
        if (s === 0) ctx.moveTo(px + nx * d, py + ny * d);
        else ctx.lineTo(px + nx * d, py + ny * d);
      }
      ctx.stroke();
    }
  }

  function destello(t) {
    var cx = W * 0.55, cy = H * 0.98, r = Math.max(W, H) * (0.35 + 0.04 * Math.sin(t * 0.6));
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(" + COLORES.destello + ",0.55)");
    g.addColorStop(0.25, "rgba(" + COLORES.destello + ",0.18)");
    g.addColorStop(1, "rgba(" + COLORES.destello + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function dibujarBurbujas(dt, t) {
    burbujas.forEach(function (b, i) {
      b.y -= b.vel * dt * VELOCIDAD;
      if (b.y < -0.1) burbujas[i] = b = nuevaBurbuja(false);
      var x = (b.x + Math.sin(t * 0.8 + b.fase) * 0.01) * W, y = b.y * H, r = b.r;
      // burbuja de vidrio: borde claro + reflejo arriba a la izquierda
      var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, "rgba(255,255,255," + b.alfa * 1.6 + ")");
      g.addColorStop(0.6, "rgba(255,255,255," + b.alfa * 0.15 + ")");
      g.addColorStop(1, "rgba(255,255,255," + b.alfa + ")");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    });
  }

  var anterior = 0;
  function cuadro(ahora) {
    if (!corriendo) return;
    var t = (ahora - inicio) / 1000 * VELOCIDAD, dt = Math.min(0.1, (ahora - anterior) / 1000 || 0);
    anterior = ahora;
    ctx.globalCompositeOperation = "source-over";
    fondo(t);
    ctx.globalCompositeOperation = "lighter";   // la luz se suma: los cruces brillan más
    rayos(t);
    CINTAS.forEach(function (c, k) { cinta(c, t, k); });
    destello(t);
    ctx.globalCompositeOperation = "source-over";
    dibujarBurbujas(dt, t);
    requestAnimationFrame(cuadro);
  }

  window.FondoAero = {
    iniciar: function (selector) {
      canvas = document.querySelector(selector);
      ctx = canvas.getContext("2d");
      ajustar();
      window.addEventListener("resize", ajustar);
      burbujas = [];
      for (var i = 0; i < BURBUJAS; i++) burbujas.push(nuevaBurbuja(true));
      corriendo = true;
      inicio = anterior = performance.now();
      requestAnimationFrame(cuadro);
    },
    parar: function () { corriendo = false; }
  };
})();
