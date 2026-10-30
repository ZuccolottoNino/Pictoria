/* difusion.js: juego de modelos de difusión en 3 pantallas.
     1) Ensuciar     (jugable con la tableta: el visitante agrega ruido a la imagen)
     2) Reconstruir  (animación: el modelo quita el ruido paso a paso)
     3) Generar      (de ruido puro a una imagen nueva, con un prompt)
   Uso:  Infografia.presentacion([ ...tusPantallas, ...Difusion.pantallas() ])
   Necesita: gsap, SplitText y puente.js cargados antes. */
(function () {
  "use strict";

  /* ============================================================
     CONFIGURACIÓN Y TEXTOS (todo lo editable está acá)
     ============================================================ */
  var CFG = {
    imagen: null,            // ruta de la imagen base, ej. "../assets/difusion/imagen.jpg". null = imagen generada por código
    video: null,             // ruta del video de la pantalla 3, ej. "../assets/difusion/generacion.mp4". null = animación por código
    radioPincel: 38,         // radio del pincel en píxeles del buffer de ruido (el aro en pantalla mide el doble)
    intensidad: 0.22,        // cuánto ruido suma cada pasada del pincel
    umbralCierre: 0.40,      // cobertura de la imagen a la que el ruido se completa solo
    umbralMinimo: 0.12,      // cobertura mínima para cerrar por inactividad
    inactividadMs: 4000,     // sin dibujar durante este tiempo → se completa el ruido
    pasosMax: 1000,          // el número "grande" va de 0 a este valor
    pasosReconstruccion: 24, // cantidad de pasos visibles al reconstruir
    duracionReconstruccion: 9,
    pasosGeneracion: 30,
    duracionGeneracion: 10
  };

  var TEXTOS = {
    titulo1: "¡Ensuciá la imagen!",
    titulo2: "Ahora el modelo la reconstruye",
    titulo3: "¿Y si empezamos desde el ruido?",
    etiquetaPaso1: "Paso de ruido",
    etiquetaPaso2: "Paso de reconstrucción",
    etiquetaPaso3: "Paso de generación",
    consigna: "Pasá el lápiz sobre la imagen para agregarle ruido.",
    consignaSub: "Cada pasada la ensucia un poco más.",
    predTexto: "Lo que el modelo predice y resta.",
    promptEtiqueta: "Prompt",
    prompt: "un paisaje de montañas al atardecer, estilo ilustración",
    avisoSiguiente: "Hacé el gesto para continuar",
    // [cobertura mínima, mensaje, estado de la mascota]
    mensajes1: [
      [0,    "Apoyá el lápiz y pintá",  "neutral"],
      [0.06, "Cada pasada suma ruido",  "curiosa"],
      [0.25, "¿Todavía se reconoce?",   "preocupada"],
      [0.50, "¡Casi no queda nada!",    "asustada"],
      [0.98, "¡Solo ruido!",            "sorprendida"]
    ],
    msgRec1: "El modelo quita un poco de ruido en cada paso",
    msgRecFin: "¡Recuperó la imagen!",
    msgGen0: "Escribí qué querés ver…",
    msgGen1: "El modelo lo va revelando del ruido",
    msgGenFin: "Una imagen nueva, nacida del ruido"
  };

  /* ============================================================
     CONSTANTES Y ESTADO COMPARTIDO ENTRE PANTALLAS
     ============================================================ */
  var BW = 1160, BH = 820;      // tamaño de la imagen en el escenario
  var RW = 580,  RH = 410;      // resolución del ruido (la mitad: queda "granulado" y es liviano)
  var NPX = RW * RH;

  var RUIDO = new Uint8Array(NPX * 3 * 2);   // ruido precalculado; se reusa con desplazamientos al azar
  for (var q = 0; q < RUIDO.length; q++) RUIDO[q] = ((Math.random() + Math.random() + Math.random()) / 3) * 255;

  var IMG = null;                             // ImageData reutilizable (se crea al primer uso)
  var m = new Float32Array(NPX);              // máscara de ruido pintada por el visitante (0..1)
  var estado = { g: 0, cerrando: false, completo: false };   // g = ruido global que completa la imagen
  var ya = function (id) { return document.getElementById(id); };

  /* ============================================================
     IMAGEN PLACEHOLDER (se dibuja por código)
     ============================================================ */
  function cresta(ctx, w, h, base, amp, fq, fase, color) {
    ctx.beginPath(); ctx.moveTo(0, h);
    for (var x = 0; x <= w; x += 10) ctx.lineTo(x, base + Math.sin(x * fq + fase) * amp + Math.sin(x * fq * 2.3 + fase * 1.7) * amp * 0.5);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function dibujarImagen(ctx, w, h, v) {
    var P = v === 0
      ? { c: ["#FFE0B5", "#FFB3A7", "#C9A8FF"], sol: [w * 0.68, h * 0.36, 120], m: ["#B49CE8", "#8E7CC3", "#6B5B9A"], suelo: "#4B3F72" }
      : { c: ["#C8E6FF", "#FFD3E8", "#E6D2FF"], sol: [w * 0.28, h * 0.42, 100], m: ["#9CC3F0", "#7FA6D9", "#5C7FB5"], suelo: "#3F5A7A" };
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.8);
    g.addColorStop(0, P.c[0]); g.addColorStop(0.55, P.c[1]); g.addColorStop(1, P.c[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var rg = ctx.createRadialGradient(P.sol[0], P.sol[1], 10, P.sol[0], P.sol[1], P.sol[2] * 2.4);
    rg.addColorStop(0, "rgba(255,250,225,1)"); rg.addColorStop(0.35, "rgba(255,244,214,.85)"); rg.addColorStop(1, "rgba(255,244,214,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    cresta(ctx, w, h, h * 0.52, 44, 0.006, v ? 2 : 0, P.m[0]);
    cresta(ctx, w, h, h * 0.63, 52, 0.009, v ? 4 : 1.3, P.m[1]);
    cresta(ctx, w, h, h * 0.75, 38, 0.012, v ? 1 : 3, P.m[2]);
    cresta(ctx, w, h, h * 0.89, 16, 0.02, v ? 5 : 2, P.suelo);
  }

  /* Imagen real opcional: si CFG.imagen está definido, reemplaza a la placeholder de las pantallas 1 y 2 */
  var marcosImagen = [];
  function usarImagenReal() {
    if (!CFG.imagen) return;
    var im = new Image();
    im.onload = function () {
      marcosImagen.forEach(function (mk) {
        var c = mk.ctxBase, r = Math.max(BW / im.width, BH / im.height);
        var w = im.width * r, h = im.height * r;
        c.drawImage(im, (BW - w) / 2, (BH - h) / 2, w, h);   // "cover": llena el marco recortando lo que sobre
      });
    };
    im.src = CFG.imagen;
  }

  /* ============================================================
     CAPAS DE RUIDO
     ============================================================ */
  function armarMarco(id, variante) {
    var marco = ya(id);
    var base = document.createElement("canvas"); base.width = BW; base.height = BH;
    var rn = document.createElement("canvas"); rn.width = RW; rn.height = RH; rn.className = "d-ruido";
    marco.appendChild(base); marco.appendChild(rn);
    var ctxBase = base.getContext("2d");
    dibujarImagen(ctxBase, BW, BH, variante);
    var mk = { marco: marco, ruido: rn, ctx: rn.getContext("2d"), ctxBase: ctxBase };
    if (variante === 0) marcosImagen.push(mk);
    return mk;
  }

  function lienzoDatos(ctx) { if (!IMG) IMG = ctx.createImageData(RW, RH); return IMG.data; }

  /* Ruido con intensidad por zona (lo que pintó el visitante + el cierre automático g) */
  function pintarMascara(ctx) {
    var d = lienzoDatos(ctx), off = ((Math.random() * NPX) | 0) * 3, g = estado.g;
    for (var i = 0, j = off, k = 0; i < NPX; i++, j += 3, k += 4) {
      var a = m[i] * 1.25; if (a > 1) a = 1;
      a = a + (1 - a) * g;
      d[k] = RUIDO[j]; d[k + 1] = RUIDO[j + 1]; d[k + 2] = RUIDO[j + 2]; d[k + 3] = a * 255;
    }
    ctx.putImageData(IMG, 0, 0);
  }

  /* Ruido con la misma intensidad en toda la imagen (reconstrucción y generación) */
  function pintarUniforme(ctx, nivel) {
    var d = lienzoDatos(ctx), off = ((Math.random() * NPX) | 0) * 3, a = Math.round(nivel * 255);
    for (var i = 0, j = off, k = 0; i < NPX; i++, j += 3, k += 4) {
      d[k] = RUIDO[j]; d[k + 1] = RUIDO[j + 1]; d[k + 2] = RUIDO[j + 2]; d[k + 3] = a;
    }
    ctx.putImageData(IMG, 0, 0);
  }

  function cobertura() {
    var s = 0;
    for (var i = 0; i < NPX; i++) { var a = m[i] * 1.25; s += a > 1 ? 1 : a; }
    return s / NPX;
  }

  /* Animación por pasos discretos (reconstrucción / generación) */
  function porPasos(o) {
    var t = { i: 0 }, ultimo = -1;
    return gsap.to(t, {
      i: o.n, duration: o.dur, ease: "none",
      onUpdate: function () {
        var i = Math.min(o.n, Math.floor(t.i));
        if (i === ultimo) return;
        ultimo = i;
        var nivel = Math.cos((i / o.n) * Math.PI / 2);   // el ruido baja despacio al principio y rápido al final
        pintarUniforme(o.ctx, nivel);
        o.alPaso(i, nivel);
      },
      onComplete: o.alFin
    });
  }

  function setNumero(idNum, idBarra, nivel) {
    ya(idNum).textContent = Math.round(nivel * CFG.pasosMax);
    ya(idBarra).style.width = (nivel * 100).toFixed(1) + "%";
  }

  function mostrarAviso(id) { gsap.to("#" + id, { autoAlpha: 1, duration: 0.5 }); }

  function mensaje(id, txt) { if (ya(id).textContent !== txt) ya(id).textContent = txt; }

  /* ============================================================
     PANTALLA 1: ENSUCIAR (jugable)
     ============================================================ */
  function pantalla1() {
    var M = armarMarco("d1-marco", 0);
    var raiz = ya("d1"), cursor = ya("d-cursor"), cvC = cursor.querySelector("canvas"), cxC = cvC.getContext("2d");
    var intervalo = null, entrada = null, auto = null, partido = null, ocultar = null;
    var presionando = false, ux = 0, uy = 0, hayUltimo = false, ultimaAct = 0, estadoMascota = "";
    var ruidoCursor = cxC.createImageData(35, 35);

    function aMascara(e) {   // coordenadas de pantalla → coordenadas del buffer de ruido
      var r = M.ruido.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * RW, y: (e.clientY - r.top) / r.height * RH };
    }
    function aEscenario(e) { // coordenadas de pantalla → coordenadas del escenario (para el aro)
      var r = ya("escenario").getBoundingClientRect(), k = r.width / 1920;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    }

    function sello(x, y, fuerza) {
      var R = CFG.radioPincel, x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(RW - 1, Math.ceil(x + R));
      var y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(RH - 1, Math.ceil(y + R));
      for (var yy = y0; yy <= y1; yy++) {
        for (var xx = x0; xx <= x1; xx++) {
          var d = Math.sqrt((xx - x) * (xx - x) + (yy - y) * (yy - y));
          if (d >= R) continue;
          var f = 1 - d / R; f = f * f * (3 - 2 * f);       // borde suave
          var i = yy * RW + xx, v = m[i] + f * fuerza; m[i] = v > 1 ? 1 : v;
        }
      }
    }
    function trazo(x, y, fuerza) {
      if (hayUltimo) {
        var dx = x - ux, dy = y - uy, dist = Math.sqrt(dx * dx + dy * dy), pasos = Math.max(1, Math.ceil(dist / (CFG.radioPincel * 0.3)));
        for (var s = 1; s <= pasos; s++) sello(ux + dx * s / pasos, uy + dy * s / pasos, fuerza);
      } else sello(x, y, fuerza);
      ux = x; uy = y; hayUltimo = true;
    }
    function fuerzaDe(e) {   // el lápiz modula la intensidad (no el tamaño); mouse = valor medio
      var p = e.pointerType === "pen" ? (e.pressure || 0.5) : 0.5;
      return CFG.intensidad * (0.6 + 0.8 * p);
    }

    function moverCursor(e) {
      var p = aEscenario(e);
      cursor.style.transform = "translate(" + p.x + "px," + p.y + "px)";
      cursor.classList.add("vis");
      clearTimeout(ocultar);
      if (!presionando) ocultar = setTimeout(function () { cursor.classList.remove("vis"); }, 900);   // el lápiz salió del alcance
    }

    raiz.addEventListener("pointermove", function (e) {
      moverCursor(e);
      if (!presionando) return;
      var lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!lista.length) lista = [e];
      lista.forEach(function (ev) { var p = aMascara(ev); trazo(p.x, p.y, fuerzaDe(ev)); });
      ultimaAct = Date.now();
    });
    raiz.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      try { raiz.setPointerCapture(e.pointerId); } catch (x) {}
      presionando = true; hayUltimo = false; ultimaAct = Date.now();
      moverCursor(e); cursor.classList.add("pres");
      var p = aMascara(e); trazo(p.x, p.y, fuerzaDe(e));
    });
    function soltar() { presionando = false; hayUltimo = false; cursor.classList.remove("pres"); }
    raiz.addEventListener("pointerup", soltar);
    raiz.addEventListener("pointercancel", soltar);
    raiz.addEventListener("pointerleave", function () { if (!presionando) cursor.classList.remove("vis"); });

    function reiniciarJuego() {
      if (auto) { auto.kill(); auto = null; }
      m.fill(0); estado.g = 0; estado.cerrando = false; estado.completo = false;
      gsap.set("#d1-aviso", { autoAlpha: 0 });
      pintarMascara(M.ctx);
    }

    function cerrar() {   // completa el ruido hasta quedar todo estática
      if (estado.cerrando) return;
      estado.cerrando = true;
      auto = gsap.to(estado, { g: 1, duration: 3.2, ease: "power2.in", onComplete: function () { estado.completo = true; mostrarAviso("d1-aviso"); } });
    }

    function tick() {
      if (presionando && hayUltimo) sello(ux, uy, CFG.intensidad * 0.5);   // mantener apoyado intensifica
      var cov = cobertura(), nivel = cov + (1 - cov) * estado.g;
      setNumero("d1-num", "d1-barra", nivel);
      var msg = TEXTOS.mensajes1[0];
      TEXTOS.mensajes1.forEach(function (x) { if (nivel >= x[0]) msg = x; });
      mensaje("d1-msg", msg[1]);
      if (estadoMascota !== msg[2]) { estadoMascota = msg[2]; ya("d1-mascota").setAttribute("data-estado", msg[2]); ya("d1-mascota").lastElementChild.textContent = msg[2]; }
      if (nivel > 0) pintarMascara(M.ctx);
      if (presionando) {   // el aro se llena de ruido animado mientras se pinta
        var dd = ruidoCursor.data;
        for (var i = 0, k = 0; i < 35 * 35; i++, k += 4) { var v = RUIDO[(Math.random() * RUIDO.length) | 0]; dd[k] = dd[k + 1] = dd[k + 2] = v; dd[k + 3] = 255; }
        cxC.putImageData(ruidoCursor, 0, 0);
      }
      if (!estado.cerrando) {
        if (cov >= CFG.umbralCierre) cerrar();
        else if (cov >= CFG.umbralMinimo && !presionando && Date.now() - ultimaAct > CFG.inactividadMs) cerrar();
      }
    }

    function parar() {
      clearInterval(intervalo); intervalo = null;
      if (entrada) { entrada.kill(); entrada = null; }
      cursor.classList.remove("vis", "pres");
      soltar();
    }

    return {
      el: "#d1",
      preparar: function () {
        reiniciarJuego();
        partido = SplitText.create("#d1-titulo", { type: "words" });
        gsap.set(partido.words, { autoAlpha: 0, y: 60, rotation: 3 });
        gsap.set("#d1-marco", { autoAlpha: 0, scale: 0.94, y: 40 });
        gsap.set("#d1 .d-card", { autoAlpha: 0, x: 80 });
        gsap.set("#d1 .d-fila", { autoAlpha: 0, y: 40 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partido.words, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#d1-marco", { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.4")
          .to("#d1 .d-card", { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "-=0.5")
          .to("#d1 .d-fila", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.3");
        intervalo = setInterval(tick, 50);
        return entrada;
      },
      salir: parar,
      // Ya no hay botón de interactuar: el gesto de volver hace de "reintentar".
      // Si ya hay ruido pintado, lo borra y se queda en la pantalla; si está limpia, vuelve atrás normal.
      alAnterior: function () {
        if (cobertura() === 0 && estado.g === 0) return false;
        reiniciarJuego();
        return true;
      }
    };
  }

  /* ============================================================
     PANTALLA 2: RECONSTRUIR
     ============================================================ */
  function pantalla2() {
    var M = armarMarco("d2-marco", 0);
    var pc = ya("d2-pred"), pcx = pc.getContext("2d"), pdata = pcx.createImageData(101, 50);
    var entrada = null, rec = null, partido = null;

    function pintarPredicho(nivel) {   // ruido gris que se va apagando a medida que baja el nivel
      var d = pdata.data;
      for (var i = 0, k = 0; i < 101 * 50; i++, k += 4) {
        var v = 138 + (RUIDO[(Math.random() * RUIDO.length) | 0] - 127) * nivel;
        d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
      pcx.putImageData(pdata, 0, 0);
    }

    function reconstruir() {
      mensaje("d2-msg", TEXTOS.msgRec1);
      rec = porPasos({
        n: CFG.pasosReconstruccion, dur: CFG.duracionReconstruccion, ctx: M.ctx,
        alPaso: function (i, nivel) { setNumero("d2-num", "d2-barra", nivel); pintarPredicho(nivel); },
        alFin: function () { setNumero("d2-num", "d2-barra", 0); pintarPredicho(0); mensaje("d2-msg", TEXTOS.msgRecFin); ya("d2-mascota").lastElementChild.textContent = "feliz"; mostrarAviso("d2-aviso"); }
      });
    }

    return {
      el: "#d2",
      transicion: "fundido",
      preparar: function () {
        pintarMascara(M.ctx);   // arranca igual que como quedó la pantalla 1
        setNumero("d2-num", "d2-barra", 1); pintarPredicho(1);
        mensaje("d2-msg", "…");
        partido = SplitText.create("#d2-titulo", { type: "words" });
        gsap.set(partido.words, { autoAlpha: 0, y: 60, rotation: 3 });
        gsap.set("#d2-marco", { autoAlpha: 0, scale: 0.94, y: 40 });
        gsap.set("#d2 .d-card", { autoAlpha: 0, x: 80 });
        gsap.set("#d2 .d-fila", { autoAlpha: 0, y: 40 });
        gsap.set("#d2-aviso", { autoAlpha: 0 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partido.words, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#d2-marco", { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.4")
          .to("#d2 .d-card", { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "-=0.5")
          .to("#d2 .d-fila", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.3");
        if (estado.g < 1) {   // si el visitante pasó antes de tiempo, se completa el ruido primero
          entrada.to(estado, { g: 1, duration: 0.8, ease: "power1.out", onUpdate: function () { pintarMascara(M.ctx); } });
        }
        entrada.add(reconstruir);
        return entrada;
      },
      salir: function () { if (entrada) entrada.kill(); if (rec) rec.kill(); entrada = rec = null; }
    };
  }

  /* ============================================================
     PANTALLA 3: GENERAR
     ============================================================ */
  function pantalla3() {
    var M = armarMarco("d3-marco", 1);   // variante 1: imagen "nueva", parecida pero distinta
    var entrada = null, gen = null, tipeo = null, partido = null, video = null;

    if (CFG.video) {   // video real: reemplaza a la animación por código
      M.marco.innerHTML = "";
      video = document.createElement("video");
      video.src = CFG.video; video.muted = true; video.playsInline = true; video.preload = "auto";
      M.marco.appendChild(video);
    }

    function generar() {
      mensaje("d3-msg", TEXTOS.msgGen1);
      var fin = function () { setNumero("d3-num", "d3-barra", 0); mensaje("d3-msg", TEXTOS.msgGenFin); ya("d3-mascota").lastElementChild.textContent = "feliz"; mostrarAviso("d3-aviso"); };
      if (video) { video.onended = fin; video.currentTime = 0; video.play(); return; }
      gen = porPasos({
        n: CFG.pasosGeneracion, dur: CFG.duracionGeneracion, ctx: M.ctx,
        alPaso: function (i, nivel) { setNumero("d3-num", "d3-barra", nivel); },
        alFin: fin
      });
    }

    function escribirPrompt() {
      var txt = TEXTOS.prompt, o = { n: 0 }, el = ya("d3-prompt");
      mensaje("d3-msg", TEXTOS.msgGen0);
      tipeo = gsap.to(o, {
        n: txt.length, duration: txt.length * 0.05, ease: "none",
        onUpdate: function () { el.textContent = txt.slice(0, Math.round(o.n)); },
        onComplete: function () { gsap.delayedCall(0.6, generar); }
      });
    }

    return {
      el: "#d3",
      transicion: "fundido",
      preparar: function () {
        if (!video) pintarUniforme(M.ctx, 1);   // empieza en ruido puro
        setNumero("d3-num", "d3-barra", 1);
        ya("d3-prompt").textContent = "";
        mensaje("d3-msg", "…");
        partido = SplitText.create("#d3-titulo", { type: "words" });
        gsap.set(partido.words, { autoAlpha: 0, y: 60, rotation: 3 });
        gsap.set("#d3-marco", { autoAlpha: 0, scale: 0.94, y: 40 });
        gsap.set("#d3 .d-card", { autoAlpha: 0, x: 80 });
        gsap.set("#d3 .d-fila", { autoAlpha: 0, y: 40 });
        gsap.set("#d3-aviso", { autoAlpha: 0 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partido.words, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#d3-marco", { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.4")
          .to("#d3 .d-card", { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "-=0.5")
          .to("#d3 .d-fila", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.3")
          .add(escribirPrompt);
        return entrada;
      },
      salir: function () {
        if (entrada) entrada.kill(); if (gen) gen.kill(); if (tipeo) tipeo.kill();
        if (video) video.pause();
        entrada = gen = tipeo = null;
      }
    };
  }

  /* ============================================================
     API
     ============================================================ */
  function rellenarTextos() {
    ya("d1-titulo").textContent = TEXTOS.titulo1; ya("d2-titulo").textContent = TEXTOS.titulo2; ya("d3-titulo").textContent = TEXTOS.titulo3;
    ya("d1-etq").textContent = TEXTOS.etiquetaPaso1; ya("d2-etq").textContent = TEXTOS.etiquetaPaso2; ya("d3-etq").textContent = TEXTOS.etiquetaPaso3;
    ["d1-de", "d2-de", "d3-de"].forEach(function (id) { ya(id).textContent = "de " + CFG.pasosMax; });
    ya("d1-consigna").textContent = TEXTOS.consigna; ya("d1-consigna-sub").textContent = TEXTOS.consignaSub;
    ya("d2-pred-txt").textContent = TEXTOS.predTexto;
    ya("d3-prompt-etq").textContent = TEXTOS.promptEtiqueta;
    ["d1-aviso", "d2-aviso", "d3-aviso"].forEach(function (id) { ya(id).textContent = TEXTOS.avisoSiguiente; });
  }

  window.Difusion = {
    config: CFG,
    textos: TEXTOS,
    pantallas: function () {
      gsap.registerPlugin(SplitText);
      rellenarTextos();
      var p = [pantalla1(), pantalla2(), pantalla3()];
      usarImagenReal();
      return p;
    }
  };
})();
