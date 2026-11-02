/* juego-peces.js: juego 2.2 del núcleo 2 (machine learning: reconocer patrones).
     1) Observá estos peces: 12 peces de referencia, dibujados por código.
     2) Dibujá tu pez: elegís un color y dibujás por partes (cuerpo con guía, ojo y aleta), 40 s, con tutorial.
     3) La computadora reconoce tu pez: lo "escanea" y marca las partes que encuentra, como un dato más.
     4) Comparación: lo que vio la computadora (los ejemplos) vs tu pez.
   Uso:  Infografia.presentacion([ ...tusPantallas, ...JuegoPeces.pantallas() ])
   Necesita: gsap y puente.js cargados antes. */
(function () {
  "use strict";

  var CFG = {
    segundos: 40           // tiempo para dibujar desde el primer trazo
  };
  var TEXTOS = {
    paso_cuerpo: "1. Dibujá el cuerpo siguiendo la guía",
    paso_ojo: "2. Ahora dibujá el ojo",
    paso_aleta: "3. Ahora dibujá la aleta",
    paso_listo: "¡Listo! Hacé el gesto de avanzar →",
    analizando: "Analizando el dibujo…",
    encontrando: "Buscando patrones…",
    listo: "Análisis terminado",
    comparar: "La computadora reconoció tu pez porque tiene los mismos <b>patrones</b> que los ejemplos que vio: cuerpo, cola, ojo y aleta. ¡Así aprende a reconocer cosas nuevas!"
  };
  var ya = function (id) { return document.getElementById(id); };

  /* ============================================================
     PECES DE REFERENCIA (dibujados por código)
     ============================================================ */
  var VARIANTES = [
    { c1: "#FF9F43", c2: "#FFD166", cola: "v",       patron: "rayas",  alto: 1.0 },
    { c1: "#5DADE2", c2: "#AED6F1", cola: "abanico", patron: "puntos", alto: 0.9 },
    { c1: "#F1948A", c2: "#F9D3CF", cola: "v",       patron: "liso",   alto: 1.2 },
    { c1: "#58D68D", c2: "#D5F5E3", cola: "abanico", patron: "rayas",  alto: 0.8 },
    { c1: "#AF7AC5", c2: "#E8DAEF", cola: "v",       patron: "puntos", alto: 1.1 },
    { c1: "#F4D03F", c2: "#FCF3CF", cola: "abanico", patron: "liso",   alto: 1.3 },
    { c1: "#48C9B0", c2: "#D1F2EB", cola: "v",       patron: "puntos", alto: 0.85 },
    { c1: "#EC7063", c2: "#FADBD8", cola: "abanico", patron: "rayas",  alto: 1.0 },
    { c1: "#5499C7", c2: "#D6EAF8", cola: "v",       patron: "rayas",  alto: 1.15 },
    { c1: "#F5B041", c2: "#FDEBD0", cola: "abanico", patron: "puntos", alto: 0.95 },
    { c1: "#A569BD", c2: "#F4ECF7", cola: "v",       patron: "liso",   alto: 0.9 },
    { c1: "#52BE80", c2: "#E9F7EF", cola: "abanico", patron: "rayas",  alto: 1.25 }
  ];
  var TINTA = "#23476B";

  // pez mirando a la derecha, centrado en (x, y), de largo s
  function dibujarPez(ctx, x, y, s, p) {
    var rx = s * 0.36, ry = s * 0.2 * p.alto, lw = Math.max(2, s * 0.025);
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = TINTA; ctx.lineWidth = lw;
    // cola
    var cx = x - rx * 0.92, ct = s * 0.26, ca = s * 0.2 * p.alto;
    ctx.beginPath();
    if (p.cola === "v") {
      ctx.moveTo(cx, y); ctx.lineTo(cx - ct, y - ca); ctx.lineTo(cx - ct * 0.7, y); ctx.lineTo(cx - ct, y + ca); ctx.closePath();
    } else {
      ctx.moveTo(cx, y); ctx.quadraticCurveTo(cx - ct * 1.3, y - ca * 1.3, cx - ct, y); ctx.quadraticCurveTo(cx - ct * 1.3, y + ca * 1.3, cx, y);
    }
    ctx.fillStyle = p.c1; ctx.fill(); ctx.stroke();
    // aleta de arriba
    ctx.beginPath(); ctx.moveTo(x - rx * 0.3, y - ry * 0.92); ctx.quadraticCurveTo(x - rx * 0.1, y - ry * 1.7, x + rx * 0.35, y - ry * 0.9);
    ctx.fillStyle = p.c1; ctx.fill(); ctx.stroke();
    // cuerpo con degradé
    var g = ctx.createLinearGradient(x, y - ry, x, y + ry);
    g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    // dibujo del cuerpo (recortado a la elipse)
    ctx.save(); ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.strokeStyle = "rgba(35,71,107,.35)";
    if (p.patron === "rayas") { ctx.lineWidth = s * 0.05; for (var k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * rx * 0.4, y - ry); ctx.lineTo(x + k * rx * 0.4 - rx * 0.1, y + ry); ctx.stroke(); } }
    if (p.patron === "puntos") { for (var q = 0; q < 7; q++) { ctx.beginPath(); ctx.arc(x - rx * 0.6 + (q % 4) * rx * 0.38, y - ry * 0.35 + Math.floor(q / 4) * ry * 0.6, s * 0.03, 0, 6.2832); ctx.fill(); } }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.strokeStyle = TINTA; ctx.lineWidth = lw; ctx.stroke();
    // aleta lateral, ojo y boca
    ctx.beginPath(); ctx.moveTo(x - rx * 0.05, y + ry * 0.1); ctx.quadraticCurveTo(x - rx * 0.35, y + ry * 0.6, x + rx * 0.12, y + ry * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + rx * 0.55, y - ry * 0.2, s * 0.05, 0, 6.2832); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + rx * 0.57, y - ry * 0.2, s * 0.022, 0, 6.2832); ctx.fillStyle = TINTA; ctx.fill();
    ctx.beginPath(); ctx.arc(x + rx * 0.9, y + ry * 0.15, s * 0.04, Math.PI * 0.6, Math.PI * 1.1); ctx.stroke();
    ctx.restore();
  }
  function pintarReferencias(canvases) {
    canvases.forEach(function (c, i) {
      var x = c.getContext("2d");
      x.clearRect(0, 0, c.width, c.height);
      dibujarPez(x, c.width / 2 + c.width * 0.06, c.height / 2, Math.min(c.width * 0.8, c.height * 1.3), VARIANTES[i % VARIANTES.length]);
    });
  }

  /* ============================================================
     PANTALLA 1: OBSERVÁ ESTOS PECES
     ============================================================ */
  function pantallaObservar() {
    var bucles = [];
    pintarReferencias(gsap.utils.toArray("#j22-grilla canvas"));
    return {
      el: "#j22-observa",
      preparar: function () {
        var d = Infografia.direccion;
        gsap.set("#j22o-titulo", { autoAlpha: 0, y: -30 });
        gsap.set("#j22o-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#j22o-globo", { autoAlpha: 0, scale: 0.6, transformOrigin: "0% 100%" });
        gsap.set("#j22-grilla", { autoAlpha: 0, x: 90 * d });
        gsap.set("#j22-grilla .j22-celda", { autoAlpha: 0, scale: 0.6 });
      },
      entrar: function () {
        return gsap.timeline()
          .to("#j22o-titulo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" })
          .to("#j22o-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.3")
          .to("#j22o-globo", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, "-=0.3")
          .to("#j22-grilla", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
          .to("#j22-grilla .j22-celda", { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)", stagger: { each: 0.07, from: "random" } }, "-=0.3")
          .add(function () {
            bucles.push(gsap.to("#j22o-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // los peces "nadan" en su lugar
            bucles.push(gsap.to("#j22-grilla canvas", { x: 6, rotation: 2, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.15, from: "random" } }));
          });
      },
      salir: function () { bucles.forEach(function (t) { t.kill(); }); bucles = []; }
    };
  }

  /* ============================================================
     ESTADO COMPARTIDO: el dibujo del visitante (lo usan las pantallas 2, 3 y 4)
     ============================================================ */
  var COLORES = [
    { nombre: "naranja", hex: "#FF8C42" },
    { nombre: "azul",    hex: "#3E9EEA" },
    { nombre: "rosa",    hex: "#F06A9E" },
    { nombre: "verde",   hex: "#3FB56A" }
  ];
  var W = 1100, H = 700;   // tamaño interno del lienzo
  var dibujo = { color: COLORES[0], partes: { cuerpo: [], ojo: [], aleta: [] } };

  function dibujarTrazos(ctx, partes, color, fondoBlanco) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (fondoBlanco) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
    var k = ctx.canvas.width / W;
    ctx.save(); ctx.scale(k, k);
    ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color;
    ["cuerpo", "ojo", "aleta"].forEach(function (p) {
      partes[p].forEach(function (t) {
        ctx.beginPath();
        t.forEach(function (q, i) { if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
        if (t.length === 1) ctx.lineTo(t[0].x + 0.1, t[0].y);
        ctx.stroke();
      });
    });
    ctx.restore();
  }
  function caja(lista) {   // caja que envuelve una o varias líneas
    var b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    lista.forEach(function (t) { t.forEach(function (p) { b.x0 = Math.min(b.x0, p.x); b.x1 = Math.max(b.x1, p.x); b.y0 = Math.min(b.y0, p.y); b.y1 = Math.max(b.y1, p.y); }); });
    b.w = b.x1 - b.x0; b.h = b.y1 - b.y0;
    return b;
  }

  /* Guías y tutorial: contorno del cuerpo (un solo trazo, mirando a la derecha), ojo y aleta */
  var GUIA = (function () {
    var cx = W * 0.54, cy = H * 0.52, rx = 230, ry = 135, ax = cx - rx * 0.92, cola = 160, cuerpo = [];
    cuerpo.push([ax - cola, cy - 120]);
    for (var a = 0; a <= 1.0001; a += 0.04) {
      var ang = Math.PI - 0.38 - a * (Math.PI * 2 - 0.76);   // por arriba (lomo) hacia la cabeza y vuelta por abajo
      cuerpo.push([cx + Math.cos(ang) * rx, cy - Math.sin(ang) * ry]);
    }
    cuerpo.push([ax - cola, cy + 120]); cuerpo.push([ax - cola * 0.55, cy]); cuerpo.push(cuerpo[0]);
    var ojo = [], ox = cx + rx * 0.55, oy = cy - ry * 0.25;
    for (var b = 0; b <= 1.0001; b += 0.05) ojo.push([ox + Math.cos(b * 6.2832) * 26, oy + Math.sin(b * 6.2832) * 26]);
    var aleta = [[cx - rx * 0.35, cy - ry * 0.93], [cx - rx * 0.05, cy - ry * 1.75], [cx + rx * 0.35, cy - ry * 0.9]];
    return { cuerpo: cuerpo, ojo: ojo, aleta: aleta };
  })();
  function punto(camino, t) {
    var n = camino.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, A = camino[i], B = camino[i + 1];
    return { x: A[0] + (B[0] - A[0]) * u, y: A[1] + (B[1] - A[1]) * u };
  }

  /* ============================================================
     PANTALLA 2: DIBUJÁ TU PEZ (jugable)
     Elegí un color y dibujá por partes, en orden: cuerpo (con guía), ojo y aleta.
     ============================================================ */
  function pantallaDibujar() {
    var lienzo = ya("j22-lienzo"), ctx = lienzo.getContext("2d");
    var demoC = ya("j22-demo-lienzo"), dcx = demoC.getContext("2d");
    var guia = ya("j22-guia"), gcx = guia.getContext("2d");
    var raiz = ya("j22-dibuja"), cursor = ya("j22-cursor");
    var PASOS = ["cuerpo", "ojo", "aleta", "listo"];
    var paso = 0, actual = null, presionando = false, empezo = false;
    var bucles = [], demo = null, reloj = null, ocultar = null;

    function aLienzo(e) {
      var r = lienzo.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    }
    function aEscenario(e) {
      var r = ya("escenario").getBoundingClientRect(), k = r.width / 1920;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    }
    function moverCursor(e) {
      var p = aEscenario(e);
      gsap.set(cursor, { x: p.x, y: p.y, autoAlpha: 1 });
      clearTimeout(ocultar);
      if (!presionando) ocultar = setTimeout(function () { gsap.set(cursor, { autoAlpha: 0 }); }, 900);
    }
    function repintar() {
      var partes = { cuerpo: dibujo.partes.cuerpo.slice(), ojo: dibujo.partes.ojo.slice(), aleta: dibujo.partes.aleta.slice() };
      if (actual) partes[PASOS[paso]].push(actual);
      dibujarTrazos(ctx, partes, dibujo.color.hex);
    }

    /* ---- guías punteadas: el cuerpo siempre; el ojo y la aleta cuando les toca ---- */
    function dibujarGuias() {
      gcx.clearRect(0, 0, W, H);
      gcx.lineWidth = 6; gcx.lineCap = "round"; gcx.lineJoin = "round"; gcx.setLineDash([2, 16]);
      ["cuerpo", "ojo", "aleta"].forEach(function (p, i) {
        if (i > paso) return;
        gcx.strokeStyle = i === paso ? "rgba(44,127,184,.55)" : "rgba(44,127,184,.18)";
        gcx.beginPath();
        GUIA[p].forEach(function (q, k) { if (k) gcx.lineTo(q[0], q[1]); else gcx.moveTo(q[0], q[1]); });
        gcx.stroke();
      });
    }
    /* ---- lápiz fantasma: recorre la guía del paso actual ---- */
    function arrancarDemo() {
      pararDemo();
      var p = PASOS[paso];
      if (!GUIA[p]) return;
      var o = { t: 0 }, camino = GUIA[p];
      demo = gsap.timeline({ repeat: -1, repeatDelay: 1 })
        .set(o, { t: 0 })
        .to("#j22-fantasma", { autoAlpha: 1, duration: 0.25 })
        .to(o, { t: 1, duration: p === "cuerpo" ? 3.6 : 1.4, ease: "none", onUpdate: function () {
          dcx.clearRect(0, 0, W, H);
          dcx.lineWidth = 8; dcx.lineCap = "round"; dcx.setLineDash([3, 18]); dcx.strokeStyle = dibujo.color.hex;
          dcx.beginPath();
          for (var k = 0; k <= 80; k++) { var q = punto(camino, o.t * k / 80); if (k) dcx.lineTo(q.x, q.y); else dcx.moveTo(q.x, q.y); }
          dcx.stroke();
          var a = punto(camino, o.t);
          gsap.set("#j22-fantasma", { x: LIENZO_X + a.x * LIENZO_ESCALA, y: LIENZO_Y + a.y * LIENZO_ESCALA });
        } }, "<")
        .to("#j22-fantasma", { autoAlpha: 0, duration: 0.3 }, "+=0.4")
        .to(demoC, { autoAlpha: 0, duration: 0.4 }, "<")
        .set(demoC, { autoAlpha: 1 });
    }
    function pararDemo() {
      if (demo) { demo.kill(); demo = null; }
      dcx.clearRect(0, 0, W, H); gsap.set(demoC, { autoAlpha: 1 }); gsap.set("#j22-fantasma", { autoAlpha: 0 });
    }

    function pista(txt) {
      var el = ya("j22-pista");
      if (el.textContent === txt) return;
      el.textContent = txt;
      gsap.fromTo(el, { autoAlpha: 0, scale: 0.7, xPercent: -50 }, { autoAlpha: 1, scale: 1, xPercent: -50, duration: 0.45, ease: "back.out(2.4)" });
    }
    function indicarPaso() {
      pista(TEXTOS["paso_" + PASOS[paso]]);
      dibujarGuias();
      if (PASOS[paso] !== "listo") arrancarDemo(); else pararDemo();
      document.querySelectorAll(".j22-parte").forEach(function (el, i) {
        el.classList.toggle("hecha", i < paso); el.classList.toggle("actual", i === paso);
      });
    }

    function elegirColor(i) {
      dibujo.color = COLORES[i];
      document.querySelectorAll(".j22-color").forEach(function (el, k) { el.classList.toggle("elegido", k === i); });
      repintar();
    }

    function arrancarReloj() {
      var el = ya("j22-tiempo"), cuenta = { t: CFG.segundos };
      el.textContent = CFG.segundos;
      gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" });
      reloj = gsap.to(cuenta, { t: 0, duration: CFG.segundos, ease: "none",
        onUpdate: function () { var n = Math.ceil(cuenta.t); if (el.textContent != n) { el.textContent = n; el.classList.toggle("apurado", n <= 5); } },
        onComplete: function () { if (dibujo.partes.cuerpo.length) Infografia.avanzar(); } });
    }

    function reiniciar() {
      if (reloj) { reloj.kill(); reloj = null; }
      dibujo.partes = { cuerpo: [], ojo: [], aleta: [] };
      paso = 0; actual = null; empezo = false; presionando = false;
      ctx.clearRect(0, 0, W, H);
      gsap.set("#j22-tiempo", { autoAlpha: 0, scale: 0 }); ya("j22-tiempo").classList.remove("apurado");
      ya("j22-pista").textContent = "";
    }

    // las muestras de color se tocan con el lápiz
    document.querySelectorAll(".j22-color").forEach(function (el, i) {
      el.style.background = COLORES[i].hex;
      el.addEventListener("pointerdown", function (e) { e.stopPropagation(); elegirColor(i); });
    });

    raiz.addEventListener("pointermove", function (e) {
      if (!raiz.classList.contains("activa")) return;
      moverCursor(e);
      if (!presionando || !actual) return;
      var lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!lista.length) lista = [e];
      lista.forEach(function (ev) { actual.push(aLienzo(ev)); });
      repintar();
    });
    raiz.addEventListener("pointerdown", function (e) {
      if (!raiz.classList.contains("activa") || PASOS[paso] === "listo") return;
      var p = aLienzo(e);
      if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return;   // solo dentro del lienzo
      e.preventDefault();
      try { raiz.setPointerCapture(e.pointerId); } catch (x) {}
      presionando = true; actual = [p];
      pararDemo(); moverCursor(e);
      if (!empezo) { empezo = true; arrancarReloj(); }
      repintar();
    });
    function soltar() {
      if (!presionando) return;
      presionando = false;
      if (!actual) return;
      var parte = PASOS[paso], b = caja([actual]);
      // el cuerpo tiene que ser grande; el ojo y la aleta, cualquier trazo
      var valido = parte !== "cuerpo" || Math.max(b.w, b.h) > W * 0.25;
      if (valido) { dibujo.partes[parte].push(actual); paso++; }
      actual = null;
      repintar();
      if (valido) indicarPaso(); else arrancarDemo();
    }
    raiz.addEventListener("pointerup", soltar);
    raiz.addEventListener("pointercancel", soltar);

    return {
      el: "#j22-dibuja",
      preparar: function () {
        var d = Infografia.direccion;
        reiniciar();
        pintarReferencias(gsap.utils.toArray("#j22-refs canvas"));
        gsap.set("#j22-refs-etq, #j22-refs canvas", { autoAlpha: 0, x: 40 });
        gsap.set("#j22-colores", { autoAlpha: 0, y: 30 });
        gsap.set("#j22d-titulo", { autoAlpha: 0, y: -30 });
        gsap.set("#j22d-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#j22-marco", { autoAlpha: 0, x: 90 * d, scale: 0.97 });
        gsap.set("#j22-pista", { autoAlpha: 0, xPercent: -50 });
        gsap.set(cursor, { autoAlpha: 0 });
        elegirColor(0);
        dibujarGuias();
      },
      entrar: function () {
        raiz.classList.add("activa");
        return gsap.timeline()
          .to("#j22d-titulo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" })
          .to("#j22d-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.3")
          .to("#j22-marco", { autoAlpha: 1, x: 0, scale: 1, duration: 0.7, ease: "power3.out" }, "-=0.6")
          .to("#j22-refs-etq, #j22-refs canvas", { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.1, ease: "back.out(1.8)" }, "-=0.3")
          .to("#j22-colores", { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(1.8)" }, "-=0.3")
          .add(function () {
            indicarPaso();
            bucles.push(gsap.to("#j22d-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#j22-pista", { scale: 1.05, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.5 }));
          });
      },
      // avanzar: con el cuerpo dibujado pasa al análisis; sin cuerpo, no
      alSiguiente: function () { return !dibujo.partes.cuerpo.length; },
      // volver: si ya dibujó, borra y reintenta; si no, vuelve a "Observá estos peces"
      alAnterior: function () {
        if (!empezo) return false;
        reiniciar(); indicarPaso();
        return true;
      },
      salir: function () {
        raiz.classList.remove("activa");
        bucles.forEach(function (t) { t.kill(); }); bucles = [];
        pararDemo();
        if (reloj) { reloj.kill(); reloj = null; }
        presionando = false; actual = null;
      }
    };
  }

  /* ============================================================
     PANTALLA 3: LA COMPUTADORA RECONOCE TU PEZ
     El dibujo aparece en una "pantalla de computadora", se escanea y se marcan las partes
     que reconoce (como un dato más, igual que los gatos y las bicis).
     ============================================================ */
  function pantallaReconocer() {
    var bucles = [], tl = null;
    var pantalla = ya("j22r-dibujo"), K = pantalla.width / W;   // escala del dibujo en la pantalla
    function confianza(min, max) { return Math.round(min + Math.random() * (max - min)); }

    function ubicarCaja(id, partes) {
      var el = ya(id);
      if (!partes.length) { el.style.display = "none"; return false; }
      var b = caja(partes), m = 18;
      el.style.display = "block";
      el.style.left = (b.x0 * K - m) + "px"; el.style.top = (b.y0 * K - m) + "px";
      el.style.width = (b.w * K + m * 2) + "px"; el.style.height = (b.h * K + m * 2) + "px";
      return true;
    }

    return {
      el: "#j22-reconoce",
      preparar: function () {
        var d = Infografia.direccion, P = dibujo.partes;
        dibujarTrazos(pantalla.getContext("2d"), P, dibujo.color.hex, true);
        var hay = { cuerpo: ubicarCaja("j22r-caja-cuerpo", P.cuerpo), ojo: ubicarCaja("j22r-caja-ojo", P.ojo), aleta: ubicarCaja("j22r-caja-aleta", P.aleta) };
        var pc = confianza(93, 99), po = hay.ojo ? confianza(86, 97) : 0, pa = hay.aleta ? confianza(80, 94) : 0;
        document.querySelector("#j22r-caja-cuerpo span").textContent = "Cuerpo " + pc + "%";
        document.querySelector("#j22r-caja-ojo span").textContent = "Ojo " + po + "%";
        document.querySelector("#j22r-caja-aleta span").textContent = "Aleta " + pa + "%";
        // lista del análisis
        ya("j22r-it-cuerpo").innerHTML = "<b>✓</b> Cuerpo y cola";
        ya("j22r-it-ojo").innerHTML = hay.ojo ? "<b>✓</b> Ojo" : "<b class='no'>✗</b> Ojo (no encontrado)";
        ya("j22r-it-aleta").innerHTML = hay.aleta ? "<b>✓</b> Aleta" : "<b class='no'>✗</b> Aleta (no encontrada)";
        ya("j22r-it-color").innerHTML = "<b>✓</b> Color: <span style='color:" + dibujo.color.hex + "'>" + dibujo.color.nombre + "</span>";
        var total = Math.round((pc + (po || 55) + (pa || 55)) / 3);
        ya("j22r-veredicto").innerHTML = "¡Es un <b>pez</b>! <small>" + total + "% de seguridad</small>";

        gsap.set("#j22r-titulo", { autoAlpha: 0, y: -30 });
        gsap.set("#j22r-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#j22r-monitor", { autoAlpha: 0, x: 90 * d, scale: 0.97 });
        gsap.set("#j22r-escaner", { autoAlpha: 0, y: 0 });
        gsap.set(".j22r-caja", { autoAlpha: 0, scale: 1.3 });
        gsap.set("#j22r-estado", { autoAlpha: 0 });
        gsap.set(".j22r-item", { autoAlpha: 0, x: 30 });
        gsap.set("#j22r-veredicto", { autoAlpha: 0, scale: 0.7 });
      },
      entrar: function () {
        var alto = pantalla.offsetHeight;
        tl = gsap.timeline()
          .to("#j22r-titulo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" })
          .to("#j22r-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.3")
          .to("#j22r-monitor", { autoAlpha: 1, x: 0, scale: 1, duration: 0.7, ease: "power3.out" }, "-=0.6")
          // escaneo: una franja de luz recorre el dibujo
          .to("#j22r-estado", { autoAlpha: 1, duration: 0.3 })
          .add(function () { ya("j22r-estado").textContent = TEXTOS.analizando; })
          .to("#j22r-escaner", { autoAlpha: 1, duration: 0.2 })
          .to("#j22r-escaner", { y: alto - 12, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 1 })
          .to("#j22r-escaner", { autoAlpha: 0, duration: 0.2 })
          // aparecen los recuadros de cada parte reconocida, uno por uno, con su ítem en la lista
          .add(function () { ya("j22r-estado").textContent = TEXTOS.encontrando; })
          .to("#j22r-caja-cuerpo", { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" })
          .to("#j22r-it-cuerpo", { autoAlpha: 1, x: 0, duration: 0.35 }, "<")
          .to("#j22r-caja-ojo", { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, "+=0.35")
          .to("#j22r-it-ojo", { autoAlpha: 1, x: 0, duration: 0.35 }, "<")
          .to("#j22r-caja-aleta", { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, "+=0.35")
          .to("#j22r-it-aleta", { autoAlpha: 1, x: 0, duration: 0.35 }, "<")
          .to("#j22r-it-color", { autoAlpha: 1, x: 0, duration: 0.35 }, "+=0.35")
          .add(function () { ya("j22r-estado").textContent = TEXTOS.listo; })
          .to("#j22r-veredicto", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2.5)" }, "+=0.3")
          .add(function () {
            bucles.push(gsap.to("#j22r-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to(".j22r-caja", { opacity: 0.55, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.2 }));
            bucles.push(gsap.to("#j22r-veredicto", { scale: 1.04, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return tl;
      },
      salir: function () { if (tl) { tl.kill(); tl = null; } bucles.forEach(function (t) { t.kill(); }); bucles = []; }
    };
  }

  /* ============================================================
     PANTALLA 4: COMPARACIÓN (lo que vio la computadora vs tu pez)
     ============================================================ */
  function pantallaComparar() {
    var bucles = [];
    ya("j22c-texto").innerHTML = TEXTOS.comparar;
    pintarReferencias(gsap.utils.toArray("#j22c-refs canvas"));
    return {
      el: "#j22-compara",
      preparar: function () {
        var d = Infografia.direccion;
        dibujarTrazos(ya("j22c-mio").getContext("2d"), dibujo.partes, dibujo.color.hex, true);   // el pez que dibujó
        gsap.set("#j22c-titulo", { autoAlpha: 0, y: -30 });
        gsap.set("#j22c-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#j22c-panel", { autoAlpha: 0, x: 90 * d, scale: 0.97 });
        gsap.set(".j22c-etq", { autoAlpha: 0, y: -14 });
        gsap.set("#j22c-refs canvas", { autoAlpha: 0, scale: 0.7 });
        gsap.set("#j22c-flecha", { autoAlpha: 0, x: -20 });
        gsap.set("#j22c-mio", { autoAlpha: 0, scale: 0.8, rotation: -3 });
        gsap.set("#j22c-texto", { autoAlpha: 0, y: 20 });
      },
      entrar: function () {
        return gsap.timeline()
          .to("#j22c-titulo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" })
          .to("#j22c-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.3")
          .to("#j22c-panel", { autoAlpha: 1, x: 0, scale: 1, duration: 0.7, ease: "power3.out" }, "-=0.6")
          .to(".j22c-etq", { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.3, ease: "back.out(2)" }, "-=0.2")
          .to("#j22c-refs canvas", { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", stagger: { each: 0.05, from: "random" } }, "<")
          .to("#j22c-flecha", { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" })
          .to("#j22c-mio", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(1.6)" })
          .to("#j22c-texto", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "+=0.2")
          .add(function () {
            bucles.push(gsap.to("#j22c-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#j22c-flecha", { x: 10, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#j22c-mio", { y: -8, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
      },
      salir: function () { bucles.forEach(function (t) { t.kill(); }); bucles = []; }
    };
  }

  // dónde está el lienzo en el escenario (para ubicar el lápiz fantasma); coincide con el CSS
  var LIENZO_X = 420, LIENZO_Y = 240, LIENZO_ESCALA = 1000 / 1100;

  window.JuegoPeces = {
    config: CFG,
    textos: TEXTOS,
    pantallas: function () { return [pantallaObservar(), pantallaDibujar(), pantallaReconocer(), pantallaComparar()]; }
  };
})();
