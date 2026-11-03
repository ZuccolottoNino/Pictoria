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
    radioPincel: 38,         // radio del pincel en píxeles del buffer de ruido (el aro en pantalla mide el doble)
    intensidad: 0.22,        // cuánto ruido suma cada pasada del pincel
    umbralCierre: 0.75,      // cobertura de la imagen a la que el ruido se completa solo
    umbralMinimo: 0.50,      // cobertura mínima para cerrar por inactividad
    pausaAlCompletar: 1.2,   // pantalla 1: segundos con la imagen 100% ruido antes de pasar sola a la etapa 2
    inactividadMs: 4000,     // sin dibujar durante este tiempo → se completa el ruido
    pasosMax: 1000,          // el número "grande" va de 0 a este valor
    pasosReconstruccion: 24, // cantidad de pasos visibles al reconstruir
    duracionReconstruccion: 9,
    pasosGeneracion: 30,
    duracionGeneracion: 10,
    segundosEtapa: 40,
    segundosAuto: 8,         // pantallas 2 y 3: al terminar, tiempo para reintentar antes de pasar solos       // pantallas 2 y 3: tiempo para jugar desde el primer trazo
    umbralGuia: 0.97,        // pantalla 2: parte de las líneas guía que hay que repasar (casi todas) para que el modelo termine solo
    radioLimpieza: 16,       // pantalla 2: radio del lápiz que limpia (en píxeles del buffer de ruido): fino = más difícil
    rebrote: 0.006           // pantalla 2: cuánto vuelve el ruido por cuadro donde no se repasó (hay que ser constante)
  };

  var TEXTOS = {
    titulo1: "¡Ensuciá la imagen!",
    titulo2: "¡Ayudá al modelo a reconstruirla!",
    titulo3: "¡Generá tu propio paisaje!",
    etiquetaPaso1: "Paso de ruido",
    etiquetaPaso2: "Paso de reconstrucción",
    etiquetaPaso3: "Paso de generación",
    consigna: "Pasá el lápiz sobre la imagen para agregarle ruido.",
    consignaSub: "Cada pasada la ensucia un poco más.",
    predTexto: "Lo que el modelo predice y resta.",
    promptEtiqueta: "Prompt",
    prompt: "Dibujá una montaña y un sol.",
    avisoSiguiente: "Arrastrá con la mano derecha para continuar",
    // [cobertura mínima, mensaje, estado de la mascota]
    mensajes1: [
      [0,    "Apoyá el lápiz y pintá",  "neutral"],
      [0.06, "Cada pasada suma ruido",  "curiosa"],
      [0.25, "¿Todavía se reconoce?",   "preocupada"],
      [0.50, "¡Casi no queda nada!",    "asustada"],
      [0.98, "¡Solo ruido!",            "sorprendida"]
    ],
    consigna2: "Repasá las líneas de las montañas con el lápiz.",
    consigna2Sub: "Por donde pasás, el modelo quita el ruido.",
    mensajes2: [
      [0,    "Seguí las líneas punteadas", "neutral"],
      [0.15, "¡Ahí aparece algo!",          "curiosa"],
      [0.40, "Va tomando forma",             "contenta"],
      [0.60, "¡Ya casi!",                    "emocionada"]
    ],
    msgRecFin: "Se parece… pero no es igual: el modelo predice, no copia",
    etiquetaOriginal: "Original",
    etiquetaReconstruida: "Reconstruida",
    msgGenMontaña: "1. Dibujá la silueta de la montaña",
    msgGenSol: "2. Ahora dibujá el sol",
    msgGenListo: "¡Listo! Arrastrá con la mano derecha para generar",
    pistaMontaña: "Dibujá la montaña",
    pistaSol: "¡Ahora dibujá un sol!",
    pistaListo: "¡Listo! Mano derecha para generar",
    msgGen1: "El modelo lo va revelando del ruido",
    msgGenFin: "Una imagen nueva, nacida de tu dibujo",
    recorrido: "Tu recorrido como modelo de difusión",
    recorrido1: "Ensuciaste",
    recorrido2: "Reconstruiste",
    recorrido3: "Generaste"
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
  // altura de una cresta en x (la usan el dibujo y las líneas guía de la pantalla 2)
  function alturaCresta(c, x) { return c.base + Math.sin(x * c.fq + c.fase) * c.amp + Math.sin(x * c.fq * 2.3 + c.fase * 1.7) * c.amp * 0.5; }
  function cresta(ctx, w, h, c, color) {
    ctx.beginPath(); ctx.moveTo(0, h);
    for (var x = 0; x <= w; x += 10) ctx.lineTo(x, alturaCresta(c, x));
    ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  /* Variantes: 0 = original (pantallas 1 y 2), 1 = imagen nueva (pantalla 3),
     2 = la que "reconstruye" el modelo: parecida a la original pero no igual (montañas corridas, otros tonos) */
  var PALETAS = [
    { c: ["#FFE0B5", "#FFB3A7", "#C9A8FF"], sol: [0.68, 0.36, 120], m: ["#B49CE8", "#8E7CC3", "#6B5B9A"], suelo: "#4B3F72", fases: [0, 1.3, 3, 2] },
    { c: ["#C8E6FF", "#FFD3E8", "#E6D2FF"], sol: [0.28, 0.42, 100], m: ["#9CC3F0", "#7FA6D9", "#5C7FB5"], suelo: "#3F5A7A", fases: [2, 4, 1, 5] },
    { c: ["#BFD9FF", "#E7C6F2", "#9FC7E8"], sol: [0.22, 0.30, 85],  m: ["#8FB3E0", "#6E8FC4", "#4E6B9E"], suelo: "#33486E", fases: [2.6, 4.4, 0.9, 4.1], forma: 1.35 }
  ];
  function crestasDe(w, h, v) {
    var f = PALETAS[v].fases, k = PALETAS[v].forma || 1;   // forma > 1: montañas más altas y quebradas
    return [
      { base: h * 0.52, amp: 44 * k, fq: 0.006 * k, fase: f[0] },
      { base: h * 0.63, amp: 52 * k, fq: 0.009 * k, fase: f[1] },
      { base: h * 0.75, amp: 38 * k, fq: 0.012 * k, fase: f[2] },
      { base: h * 0.89, amp: 16,     fq: 0.02,      fase: f[3] }
    ];
  }
  function dibujarImagen(ctx, w, h, v) {
    var P = PALETAS[v], C = crestasDe(w, h, v), sx = P.sol[0] * w, sy = P.sol[1] * h;
    var g = ctx.createLinearGradient(0, 0, 0, h * 0.8);
    g.addColorStop(0, P.c[0]); g.addColorStop(0.55, P.c[1]); g.addColorStop(1, P.c[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var rg = ctx.createRadialGradient(sx, sy, 10, sx, sy, P.sol[2] * 2.4);
    rg.addColorStop(0, "rgba(255,250,225,1)"); rg.addColorStop(0.35, "rgba(255,244,214,.85)"); rg.addColorStop(1, "rgba(255,244,214,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    cresta(ctx, w, h, C[0], P.m[0]);
    cresta(ctx, w, h, C[1], P.m[1]);
    cresta(ctx, w, h, C[2], P.m[2]);
    cresta(ctx, w, h, C[3], P.suelo);
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

  /* Al terminar una etapa que se puede reintentar (mano izquierda), se esperan unos segundos
     y se pasa sola a la siguiente. Devuelve el tween para poder cancelarlo al reintentar o salir. */
  function autoAvance(idAviso) {
    var el = ya(idAviso), base = Manos.svg("der") + " " + TEXTOS.avisoSiguiente, cuenta = { t: CFG.segundosAuto };
    return gsap.to(cuenta, { t: 0, duration: CFG.segundosAuto, ease: "none",
      onUpdate: function () { el.innerHTML = base + " · seguimos solos en " + Math.ceil(cuenta.t) + " s"; },
      onComplete: function () { el.innerHTML = base; Infografia.avanzar(); } });
  }
  function frenarAuto(t, idAviso) {
    if (t) t.kill();
    var el = ya(idAviso); if (el) el.innerHTML = Manos.svg("der") + " " + TEXTOS.avisoSiguiente;
    return null;
  }

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
      auto = gsap.timeline()
        .to(estado, { g: 1, duration: 3.2, ease: "power2.in", onComplete: function () { estado.completo = true; } })
        .add(function () { Infografia.avanzar(); }, "+=" + CFG.pausaAlCompletar);   // 100% ruido → etapa 2
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
      if (auto) { auto.kill(); auto = null; }   // que no pase sola de etapa si el visitante ya se fue
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
     PANTALLA 2: RECONSTRUIR (jugable)
     La imagen arranca tapada de ruido y se ven, punteadas, las crestas de las montañas.
     El visitante las repasa con el lápiz: por donde pasa, el ruido se limpia.
     Al repasar suficiente (o al terminar el tiempo) el modelo limpia el resto y se compara
     la original con la reconstruida, que es parecida pero NO igual (el modelo predice, no copia).
     ============================================================ */
  function pantalla2() {
    var M = armarMarco("d2-marco", 2);   // variante 2: la reconstrucción "a su manera"
    var raiz = ya("d2"), cursor = ya("d2-cursor");
    var pc = ya("d2-pred"), pcx = pc.getContext("2d"), pdata = pcx.createImageData(101, 50);
    var limpio = new Float32Array(NPX);            // 0 = con ruido, 1 = limpio (lo pinta el visitante)
    var bucles2 = [];                              // animaciones en bucle de la demo
    var auto2 = null;                              // paso automático a la etapa 3 (cancelable)
    var fin = { g: 0 };                            // limpieza final automática (0 a 1)
    var entrada = null, intervalo = null, reloj = null, cierre = null, partido = null, ocultar = null, demo = null;
    var presionando = false, ux = 0, uy = 0, hayUltimo = false, empezo = false, terminado = false, estadoMascota = "";

    // líneas guía: las crestas de la imagen reconstruida, punteadas sobre el ruido
    var guia = document.createElement("canvas"); guia.width = BW; guia.height = BH; guia.className = "d-guia";
    M.marco.appendChild(guia);
    var gcx = guia.getContext("2d"), crestas = crestasDe(BW, BH, 2).slice(0, 3), desfase = 0;
    // puntos de control sobre las guías: el progreso es cuántos ya quedaron limpios
    var muestras = [];
    crestas.forEach(function (c) { for (var x = 50; x < BW - 50; x += 24) muestras.push({ x: x, y: alturaCresta(c, x) }); });   // sin los bordes, difíciles de alcanzar

    function dibujarGuias() {
      gcx.clearRect(0, 0, BW, BH);
      gcx.lineWidth = 6; gcx.lineCap = "round"; gcx.setLineDash([2, 22]); gcx.lineDashOffset = -desfase;
      gcx.lineWidth = 4;
      gcx.strokeStyle = "rgba(255,255,255,.8)"; gcx.shadowColor = "rgba(189,114,255,.8)"; gcx.shadowBlur = 8;
      crestas.forEach(function (c) {
        gcx.beginPath();
        for (var x = 0; x <= BW; x += 8) { var y = alturaCresta(c, x); if (x) gcx.lineTo(x, y); else gcx.moveTo(x, y); }
        gcx.stroke();
      });
    }

    function aMascara(e) {
      var r = M.ruido.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * RW, y: (e.clientY - r.top) / r.height * RH };
    }
    function aEscenario(e) {
      var r = ya("escenario").getBoundingClientRect(), k = r.width / 1920;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    }
    function sello(x, y) {
      var R = CFG.radioLimpieza, x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(RW - 1, Math.ceil(x + R));
      var y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(RH - 1, Math.ceil(y + R));
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) {
        var d = Math.sqrt((xx - x) * (xx - x) + (yy - y) * (yy - y));
        if (d >= R) continue;
        var f = 1 - d / R; f = f * f * (3 - 2 * f);
        var i = yy * RW + xx, v = limpio[i] + f * 0.35; limpio[i] = v > 1 ? 1 : v;
      }
    }
    function trazo(x, y) {
      if (hayUltimo) {
        var dx = x - ux, dy = y - uy, n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / (CFG.radioLimpieza * 0.3)));
        for (var k = 1; k <= n; k++) sello(ux + dx * k / n, uy + dy * k / n);
      } else sello(x, y);
      ux = x; uy = y; hayUltimo = true;
    }

    // un punto de la guía cuenta cuando se limpió bien justo encima (y queda ganado aunque el ruido vuelva)
    function progreso() {
      var ok = 0;
      muestras.forEach(function (p) {
        if (!p.ok && limpio[((p.y / 2) | 0) * RW + ((p.x / 2) | 0)] >= 0.85) p.ok = true;
        if (p.ok) ok++;
      });
      return ok / muestras.length;
    }
    function rebrote() {   // el ruido vuelve de a poco donde no se está repasando
      for (var i = 0; i < NPX; i++) if (limpio[i] > 0) limpio[i] = Math.max(0, limpio[i] - CFG.rebrote);
    }

    function pintar() {   // ruido = lo que falta limpiar (pincel del visitante + limpieza final)
      var d = lienzoDatos(M.ctx), off = ((Math.random() * NPX) | 0) * 3, g = fin.g;
      for (var i = 0, j = off, k = 0; i < NPX; i++, j += 3, k += 4) {
        var a = (1 - limpio[i]) * (1 - g);
        d[k] = RUIDO[j]; d[k + 1] = RUIDO[j + 1]; d[k + 2] = RUIDO[j + 2]; d[k + 3] = a * 255;
      }
      M.ctx.putImageData(IMG, 0, 0);
    }
    function pintarPredicho(nivel) {   // ruido gris que se va apagando a medida que baja el nivel
      var d = pdata.data;
      for (var i = 0, k = 0; i < 101 * 50; i++, k += 4) {
        var v = 138 + (RUIDO[(Math.random() * RUIDO.length) | 0] - 127) * nivel;
        d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
      pcx.putImageData(pdata, 0, 0);
    }

    function moverCursor(e) {
      var p = aEscenario(e);
      cursor.style.transform = "translate(" + p.x + "px," + p.y + "px)";
      cursor.classList.add("vis");
      clearTimeout(ocultar);
      if (!presionando) ocultar = setTimeout(function () { cursor.classList.remove("vis"); }, 900);
    }

    function tick() {
      var pr = empezo ? progreso() : 0, nivel = (1 - fin.g) * (1 - 0.85 * pr);
      setNumero("d2-num", "d2-barra", nivel);
      pintarPredicho(nivel);
      if (!terminado) {
        var msg = TEXTOS.mensajes2[0];
        TEXTOS.mensajes2.forEach(function (x) { if (pr >= x[0]) msg = x; });
        mensaje("d2-msg", msg[1]);
        if (estadoMascota !== msg[2]) { estadoMascota = msg[2]; ya("d2-mascota").lastElementChild.textContent = msg[2]; }
        if (pr >= CFG.umbralGuia) terminar();
        rebrote();
        desfase += 1.2;
        dibujarGuias();
      }
      pintar();
    }

    // cuenta regresiva desde el primer trazo
    function arrancarReloj() {
      var el = ya("d2-tiempo"), cuenta = { t: CFG.segundosEtapa };
      el.textContent = CFG.segundosEtapa;
      gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" });
      reloj = gsap.to(cuenta, { t: 0, duration: CFG.segundosEtapa, ease: "none",
        onUpdate: function () { var n = Math.ceil(cuenta.t); if (el.textContent != n) { el.textContent = n; el.classList.toggle("apurado", n <= 5); } },
        onComplete: terminar });
    }

    function terminar() {
      if (terminado) return;
      terminado = true;
      if (reloj) { reloj.kill(); reloj = null; }
      soltar();
      cierre = gsap.timeline()
        .to("#d2-tiempo", { autoAlpha: 0, duration: 0.3 }, 0)
        .to(guia, { autoAlpha: 0, duration: 0.6 }, 0)
        .to(fin, { g: 1, duration: 1.6, ease: "power2.inOut" }, 0)
        .add(function () { mensaje("d2-msg", TEXTOS.msgRecFin); ya("d2-mascota").lastElementChild.textContent = "sorprendida"; })
        // original y reconstruida, lado a lado
        .to("#d2-comparar", { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, "+=0.4")
        .fromTo("#d2-comparar figure", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.2, ease: "back.out(1.6)" }, "<0.1")
        .add(function () { mostrarAviso("d2-aviso"); auto2 = autoAvance("d2-aviso"); });
    }

    /* Mini tutorial: un lápiz "fantasma" recorre un tramo de la primera línea guía limpiando el ruido,
       y se repite hasta que el visitante apoya el lápiz. Lo que limpia la demo no cuenta. */
    function arrancarDemo() {
      pararDemo();
      var c = crestas[0], o = { x: 90 };
      gsap.set("#d2-pista", { autoAlpha: 1 });
      demo = gsap.timeline({ repeat: -1, repeatDelay: 1.4 })
        .set(o, { x: 90 })
        .add(function () { hayUltimo = false; })
        .to("#d2-demo", { autoAlpha: 1, duration: 0.3 })
        .to(o, { x: 560, duration: 2.6, ease: "sine.inOut", onUpdate: function () {
          var y = alturaCresta(c, o.x);
          gsap.set("#d2-demo", { x: 108 + o.x, y: 170 + y });   // el marco empieza en (108, 170) del escenario
          trazo(o.x / 2, y / 2);
        } }, "<")
        .to("#d2-demo", { autoAlpha: 0, duration: 0.3 });
      bucles2.push(gsap.to("#d2-pista", { opacity: 0.45, duration: 0.6, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.3 }));
    }
    function pararDemo() {
      if (demo) { demo.kill(); demo = null; }
      bucles2.forEach(function (t) { t.kill(); }); bucles2 = [];
      gsap.set("#d2-demo, #d2-pista", { autoAlpha: 0 });
      hayUltimo = false;
    }

    function reiniciar() {
      limpio.fill(0); fin.g = 0; terminado = false; empezo = false; estadoMascota = "";
      muestras.forEach(function (p) { p.ok = false; });
      if (reloj) { reloj.kill(); reloj = null; }
      if (cierre) { cierre.kill(); cierre = null; }
      gsap.set(guia, { autoAlpha: 1 });
      gsap.set("#d2-tiempo", { autoAlpha: 0, scale: 0 });
      ya("d2-tiempo").classList.remove("apurado");
      gsap.set("#d2-comparar", { autoAlpha: 0 });
      auto2 = frenarAuto(auto2, "d2-aviso");
      gsap.set("#d2-aviso", { autoAlpha: 0 });
      dibujarGuias(); pintar();
      if (intervalo) arrancarDemo();   // al reintentar, vuelve la demo
    }

    raiz.addEventListener("pointermove", function (e) {
      if (!intervalo) return;
      moverCursor(e);
      if (!presionando || terminado) return;
      var lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!lista.length) lista = [e];
      lista.forEach(function (ev) { var p = aMascara(ev); trazo(p.x, p.y); });
    });
    raiz.addEventListener("pointerdown", function (e) {
      if (!intervalo || terminado) return;
      e.preventDefault();
      try { raiz.setPointerCapture(e.pointerId); } catch (x) {}
      presionando = true; hayUltimo = false;
      moverCursor(e); cursor.classList.add("pres");
      var p = aMascara(e); trazo(p.x, p.y);
      if (!empezo) {   // primer toque: se va la demo y se borra lo que limpió
        pararDemo();
        limpio.fill(0); hayUltimo = false;
        var q = aMascara(e); trazo(q.x, q.y);
        empezo = true; arrancarReloj();
      }
    });
    function soltar() { presionando = false; hayUltimo = false; cursor.classList.remove("pres"); }
    raiz.addEventListener("pointerup", soltar);
    raiz.addEventListener("pointercancel", soltar);
    raiz.addEventListener("pointerleave", function () { if (!presionando) cursor.classList.remove("vis"); });

    // las dos imágenes para la comparación final
    [["d2-comp-original", 0], ["d2-comp-reconstruida", 2]].forEach(function (par) {
      var c = ya(par[0]), x = c.getContext("2d");
      x.scale(c.width / BW, c.height / BH);
      dibujarImagen(x, BW, BH, par[1]);
    });

    return {
      el: "#d2",
      transicion: "fundido",
      preparar: function () {
        reiniciar();
        setNumero("d2-num", "d2-barra", 1); pintarPredicho(1);
        mensaje("d2-msg", "…");
        partido = partido || SplitText.create("#d2-titulo", { type: "words" });
        gsap.set(partido.words, { autoAlpha: 0, y: 60, rotation: 3 });
        gsap.set("#d2-marco", { autoAlpha: 0, scale: 0.94, y: 40 });
        gsap.set("#d2 .d-card", { autoAlpha: 0, x: 80 });
        gsap.set("#d2 .d-fila", { autoAlpha: 0, y: 40 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partido.words, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#d2-marco", { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.4")
          .to("#d2 .d-card", { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "-=0.5")
          .to("#d2 .d-fila", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.3");
        intervalo = setInterval(tick, 50);
        entrada.add(arrancarDemo, "-=0.2");
        return entrada;
      },
      // gesto de volver: si ya jugó, se reintenta; si no, vuelve a la pantalla anterior
      alAnterior: function () { if (!empezo) return false; reiniciar(); return true; },
      salir: function () {
        clearInterval(intervalo); intervalo = null;
        pararDemo();
        if (entrada) entrada.kill(); if (reloj) reloj.kill(); if (cierre) cierre.kill();
        entrada = reloj = cierre = null;
        cursor.classList.remove("vis", "pres"); soltar();
        auto2 = frenarAuto(auto2, "d2-aviso");
      }
    };
  }

  /* ============================================================
     PANTALLA 3: GENERAR (jugable)
     El prompt es una orden: "Dibujá una montaña y un sol". El visitante dibuja sobre el ruido
     la silueta de la montaña y el sol; con el gesto de avanzar (o al terminar el tiempo) el modelo
     genera la imagen desde el ruido siguiendo su boceto. La altura del sol decide la hora:
     sol alto = de día, sol bajo = atardecer. Al final se muestra "tu recorrido" con las 3 imágenes.
     ============================================================ */
  function pantalla3() {
    var M = armarMarco("d3-marco", 1);
    var raiz = ya("d3"), cursor = ya("d3-cursor");
    var boceto = document.createElement("canvas"); boceto.width = BW; boceto.height = BH; boceto.className = "d-boceto";
    M.marco.appendChild(boceto);
    var bcx = boceto.getContext("2d");
    var demoLienzo = document.createElement("canvas"); demoLienzo.width = BW; demoLienzo.height = BH; demoLienzo.className = "d-boceto";
    M.marco.appendChild(demoLienzo);
    var dcx = demoLienzo.getContext("2d");
    var entrada = null, tipeo = null, reloj = null, gen = null, cierre = null, partido = null, ocultar = null, intervalo = null;
    var demo = null, latido = null;
    var auto3 = null;                              // paso automático al terminar (cancelable)
    var trazos = [], actual = null, presionando = false, empezo = false;
    var fase = "montaña";   // montaña → sol → listo → generando → fin

    function aImagen(e) {
      var r = M.ruido.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * BW, y: (e.clientY - r.top) / r.height * BH };
    }
    function aEscenario(e) {
      var r = ya("escenario").getBoundingClientRect(), k = r.width / 1920;
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
    }
    function moverCursor(e) {
      var p = aEscenario(e);
      cursor.style.transform = "translate(" + p.x + "px," + p.y + "px)";
      cursor.classList.add("vis");
      clearTimeout(ocultar);
      if (!presionando) ocultar = setTimeout(function () { cursor.classList.remove("vis"); }, 900);
    }

    function dibujarBoceto() {   // los trazos del visitante, en blanco con brillo violeta, sobre el ruido
      bcx.clearRect(0, 0, BW, BH);
      bcx.lineWidth = 10; bcx.lineCap = "round"; bcx.lineJoin = "round";
      bcx.strokeStyle = "#fff"; bcx.shadowColor = "rgba(189,114,255,.95)"; bcx.shadowBlur = 14;
      trazos.concat(actual ? [actual] : []).forEach(function (t) {
        bcx.beginPath();
        t.forEach(function (p, i) { if (i) bcx.lineTo(p.x, p.y); else bcx.moveTo(p.x, p.y); });
        if (t.length === 1) bcx.lineTo(t[0].x + 0.1, t[0].y);
        bcx.stroke();
      });
    }

    function caja(t) {
      var b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
      t.forEach(function (p) { b.x0 = Math.min(b.x0, p.x); b.x1 = Math.max(b.x1, p.x); b.y0 = Math.min(b.y0, p.y); b.y1 = Math.max(b.y1, p.y); });
      b.w = b.x1 - b.x0; b.h = b.y1 - b.y0;
      return b;
    }
    function indicacion() {
      var txt = fase === "montaña" ? TEXTOS.msgGenMontaña : fase === "sol" ? TEXTOS.msgGenSol : TEXTOS.msgGenListo;
      mensaje("d3-msg", txt);
      // cartel grande sobre la imagen: cambia con un salto para que se note el nuevo paso
      var pista = fase === "montaña" ? TEXTOS.pistaMontaña : fase === "sol" ? TEXTOS.pistaSol : TEXTOS.pistaListo;
      var el = ya("d3-pista");
      if (el.textContent !== pista) {
        el.textContent = pista;
        gsap.fromTo(el, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.5)" });
      }
      if (latido) latido.kill();
      latido = gsap.to(el, { scale: 1.06, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.5 });
      if (fase === "montaña" || fase === "sol") arrancarDemo(fase); else pararDemo();
    }

    /* Lápiz fantasma: dibuja de ejemplo una montaña o un sol (punteado), y se repite
       hasta que el visitante empieza a dibujar ese paso. */
    function caminoDemo(tipo, t) {
      if (tipo === "sol") {   // círculo arriba a la derecha
        var a = -Math.PI / 2 + t * Math.PI * 2;
        return { x: BW * 0.76 + Math.cos(a) * 70, y: BH * 0.24 + Math.sin(a) * 70 };
      }
      var x = 120 + t * (BW - 240);   // montaña: dos picos de izquierda a derecha
      return { x: x, y: BH * 0.62 - Math.max(0, Math.sin(t * Math.PI * 2.2)) * BH * 0.26 - Math.sin(t * Math.PI) * 30 };
    }
    function arrancarDemo(tipo) {
      pararDemo();
      var o = { t: 0 };
      demo = gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
        .set(o, { t: 0 })
        .add(function () { dcx.clearRect(0, 0, BW, BH); })
        .to("#d3-demo", { autoAlpha: 1, duration: 0.25 })
        .to(o, { t: 1, duration: tipo === "sol" ? 1.8 : 2.6, ease: "sine.inOut", onUpdate: function () {
          dcx.clearRect(0, 0, BW, BH);
          dcx.lineWidth = 8; dcx.lineCap = "round"; dcx.setLineDash([3, 18]);
          dcx.strokeStyle = "rgba(255,255,255,.9)"; dcx.shadowColor = "rgba(189,114,255,.9)"; dcx.shadowBlur = 10;
          dcx.beginPath();
          for (var k = 0; k <= 60; k++) { var q = caminoDemo(tipo, o.t * k / 60); if (k) dcx.lineTo(q.x, q.y); else dcx.moveTo(q.x, q.y); }
          dcx.stroke();
          var p = caminoDemo(tipo, o.t);
          gsap.set("#d3-demo", { x: 108 + p.x, y: 170 + p.y });   // el marco empieza en (108, 170) del escenario
        } }, "<")
        .to("#d3-demo", { autoAlpha: 0, duration: 0.3 }, "+=0.4")
        .to(demoLienzo, { autoAlpha: 0, duration: 0.4 }, "<")
        .set(demoLienzo, { autoAlpha: 1 });
    }
    function pararDemo() {
      if (demo) { demo.kill(); demo = null; }
      dcx.clearRect(0, 0, BW, BH); gsap.set(demoLienzo, { autoAlpha: 1 });
      gsap.set("#d3-demo", { autoAlpha: 0 });
    }
    // al soltar el lápiz: la primera línea ancha es la montaña; lo que venga después, el sol
    function alSoltar() {
      if (!actual) return;
      var antes = fase;
      if (actual.length > 1) trazos.push(actual);
      actual = null;
      if (fase === "montaña" && trazos.some(function (t) { return caja(t).w > BW * 0.3; })) fase = "sol";
      else if (fase === "sol" && trazos.length >= 2) fase = "listo";
      indicacion();
      if (fase === "montaña" || fase === "sol") pararDemo();          // recién dibujó: que no tape su trazo
      if (fase === "sol" && antes === "montaña") arrancarDemo("sol");  // recién pasó al sol: mostrar cómo
      dibujarBoceto();
    }

    /* ---- interpretación del boceto ---- */
    function montañaDelBoceto() {
      var mejor = null;
      trazos.forEach(function (t) { if (!mejor || caja(t).w > caja(mejor).w) mejor = t; });
      if (!mejor || caja(mejor).w < BW * 0.15) return null;
      return mejor;
    }
    function solDelBoceto(mont) {
      var otros = trazos.filter(function (t) { return t !== mont; });
      if (!otros.length) return null;
      var t = otros[otros.length - 1], b = caja(t);   // el último trazo que no es la montaña
      return { x: b.x0 + b.w / 2, y: b.y0 + b.h / 2, r: Math.max(45, Math.min(150, Math.max(b.w, b.h) / 2)) };
    }
    // altura de la montaña en cada x, siguiendo el trazo (y estirándolo hasta los bordes)
    function alturas(mont) {
      var pts = mont.slice().sort(function (a, b) { return a.x - b.x; }), h = [];
      for (var x = 0; x <= BW; x += 10) {
        var y;
        if (x <= pts[0].x) y = pts[0].y + (BH * 0.62 - pts[0].y) * Math.min(1, (pts[0].x - x) / 220);
        else if (x >= pts[pts.length - 1].x) { var u = pts[pts.length - 1]; y = u.y + (BH * 0.62 - u.y) * Math.min(1, (x - u.x) / 220); }
        else {
          for (var i = 1; i < pts.length && pts[i].x < x; i++);
          var a = pts[i - 1], b = pts[i], f = (x - a.x) / Math.max(1, b.x - a.x);
          y = a.y + (b.y - a.y) * f;
        }
        h.push(Math.max(BH * 0.12, Math.min(BH * 0.85, y)));
      }
      return h;
    }

    /* ---- la imagen generada, a partir del boceto ---- */
    function dibujarGenerada(ctx) {
      var mont = montañaDelBoceto(), sol = solDelBoceto(mont) || { x: BW * 0.7, y: BH * 0.3, r: 100 };
      var dia = sol.y < BH * 0.4;   // sol alto = de día; sol bajo = atardecer
      var P = dia
        ? { c: ["#A9DBFF", "#D4ECFF", "#F1E6FF"], m: ["#A8C6EE", "#6F95CF", "#4C6DA6"], suelo: "#34507A", sol: "255,253,235" }
        : { c: ["#FFD39E", "#FFAA94", "#C69BF2"], m: ["#C2A5EC", "#8C70C4", "#5E4C93"], suelo: "#44386C", sol: "255,236,200" };
      var g = ctx.createLinearGradient(0, 0, 0, BH * 0.85);
      g.addColorStop(0, P.c[0]); g.addColorStop(0.6, P.c[1]); g.addColorStop(1, P.c[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, BW, BH);
      // sol: halo + disco, donde lo dibujó el visitante
      var rg = ctx.createRadialGradient(sol.x, sol.y, sol.r * 0.2, sol.x, sol.y, sol.r * 2.6);
      rg.addColorStop(0, "rgba(" + P.sol + ",1)"); rg.addColorStop(0.35, "rgba(" + P.sol + ",.75)"); rg.addColorStop(1, "rgba(" + P.sol + ",0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, BW, BH);
      ctx.fillStyle = "rgba(" + P.sol + ",1)"; ctx.beginPath(); ctx.arc(sol.x, sol.y, sol.r * 0.55, 0, 6.2832); ctx.fill();
      // montañas lejanas (decoran el fondo)
      var C = crestasDe(BW, BH, 1);
      cresta(ctx, BW, BH, { base: BH * 0.48, amp: C[0].amp, fq: C[0].fq, fase: C[0].fase }, P.m[0]);
      // la montaña del visitante
      ctx.beginPath(); ctx.moveTo(0, BH);
      if (mont) alturas(mont).forEach(function (y, i) { ctx.lineTo(i * 10, y); });
      else for (var x = 0; x <= BW; x += 10) ctx.lineTo(x, alturaCresta(C[1], x));
      ctx.lineTo(BW, BH); ctx.closePath(); ctx.fillStyle = P.m[1]; ctx.fill();
      // primer plano
      cresta(ctx, BW, BH, C[2], P.m[2]);
      cresta(ctx, BW, BH, C[3], P.suelo);
    }

    function generar() {
      if (fase === "generando" || fase === "fin") return;
      fase = "generando";
      if (reloj) { reloj.kill(); reloj = null; }
      pararDemo();
      if (latido) { latido.kill(); latido = null; }
      gsap.to("#d3-pista", { autoAlpha: 0, scale: 0.8, duration: 0.3 });
      presionando = false; actual = null; cursor.classList.remove("vis", "pres");
      gsap.to("#d3-tiempo", { autoAlpha: 0, duration: 0.3 });
      dibujarGenerada(M.ctxBase);
      mensaje("d3-msg", TEXTOS.msgGen1);
      gsap.to(boceto, { autoAlpha: 0, duration: CFG.duracionGeneracion * 0.6, ease: "power1.in" });
      gen = porPasos({
        n: CFG.pasosGeneracion, dur: CFG.duracionGeneracion, ctx: M.ctx,
        alPaso: function (i, nivel) { setNumero("d3-num", "d3-barra", nivel); },
        alFin: function () { setNumero("d3-num", "d3-barra", 0); mensaje("d3-msg", TEXTOS.msgGenFin); mostrarRecorrido(); }
      });
    }

    /* ---- cierre: las tres imágenes del visitante ---- */
    function mostrarRecorrido() {
      fase = "fin";
      var c1 = ya("d3-final-1").getContext("2d"), c2 = ya("d3-final-2").getContext("2d"), c3 = ya("d3-final-3").getContext("2d");
      var w = c1.canvas.width, h = c1.canvas.height, d1 = ya("d1-marco").querySelectorAll("canvas");
      c1.clearRect(0, 0, w, h); c1.drawImage(d1[0], 0, 0, w, h); c1.drawImage(d1[1], 0, 0, w, h);   // la que ensució
      c2.save(); c2.scale(w / BW, h / BH); dibujarImagen(c2, BW, BH, 2); c2.restore();            // la que reconstruyó
      c3.clearRect(0, 0, w, h); c3.drawImage(M.ctxBase.canvas, 0, 0, w, h);                       // la que generó
      cierre = gsap.timeline({ delay: 1.2 })
        .to("#d3-final", { autoAlpha: 1, duration: 0.6, ease: "power2.out" })
        .fromTo("#d3-final h3", { y: -20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" }, "<0.1")
        .fromTo("#d3-final figure", { y: 30, autoAlpha: 0, scale: 0.9 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.25, ease: "back.out(1.6)" }, "-=0.2")
        .add(function () { mostrarAviso("d3-aviso"); auto3 = autoAvance("d3-aviso"); });
    }

    function escribirPrompt() {
      var txt = TEXTOS.prompt, o = { n: 0 }, el = ya("d3-prompt");
      tipeo = gsap.to(o, {
        n: txt.length, duration: txt.length * 0.05, ease: "none",
        onUpdate: function () { el.textContent = txt.slice(0, Math.round(o.n)); },
        onComplete: function () { indicacion(); }
      });
    }

    function arrancarReloj() {
      var el = ya("d3-tiempo"), cuenta = { t: CFG.segundosEtapa };
      el.textContent = CFG.segundosEtapa;
      gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" });
      reloj = gsap.to(cuenta, { t: 0, duration: CFG.segundosEtapa, ease: "none",
        onUpdate: function () { var n = Math.ceil(cuenta.t); if (el.textContent != n) { el.textContent = n; el.classList.toggle("apurado", n <= 5); } },
        onComplete: generar });
    }

    function reiniciar() {
      if (gen) { gen.kill(); gen = null; }
      if (reloj) { reloj.kill(); reloj = null; }
      if (cierre) { cierre.kill(); cierre = null; }
      trazos = []; actual = null; empezo = false; fase = "montaña";
      bcx.clearRect(0, 0, BW, BH); gsap.set(boceto, { autoAlpha: 1 });
      pintarUniforme(M.ctx, 1);
      setNumero("d3-num", "d3-barra", 1);
      gsap.set("#d3-tiempo", { autoAlpha: 0, scale: 0 }); ya("d3-tiempo").classList.remove("apurado");
      gsap.set("#d3-final, #d3-aviso", { autoAlpha: 0 });
      auto3 = frenarAuto(auto3, "d3-aviso");
      pararDemo();
      if (latido) { latido.kill(); latido = null; }
      ya("d3-pista").textContent = ""; gsap.set("#d3-pista", { autoAlpha: 0, xPercent: -50 });   // centrado lo maneja GSAP
    }

    // el ruido "vivo" mientras se dibuja (antes de generar)
    function tick() { if (fase !== "generando" && fase !== "fin") pintarUniforme(M.ctx, 1); }

    raiz.addEventListener("pointermove", function (e) {
      if (!intervalo || fase === "generando" || fase === "fin") return;
      moverCursor(e);
      if (!presionando || !actual) return;
      var lista = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!lista.length) lista = [e];
      lista.forEach(function (ev) { actual.push(aImagen(ev)); });
      dibujarBoceto();
    });
    raiz.addEventListener("pointerdown", function (e) {
      if (!intervalo || fase === "generando" || fase === "fin") return;
      var p = aImagen(e);
      if (p.x < 0 || p.y < 0 || p.x > BW || p.y > BH) return;   // solo se dibuja sobre la imagen
      e.preventDefault();
      try { raiz.setPointerCapture(e.pointerId); } catch (x) {}
      presionando = true; actual = [p];
      pararDemo();
      moverCursor(e); cursor.classList.add("pres");
      if (!empezo) { empezo = true; arrancarReloj(); }
      dibujarBoceto();
    });
    function soltar() { if (presionando) { presionando = false; cursor.classList.remove("pres"); alSoltar(); } }
    raiz.addEventListener("pointerup", soltar);
    raiz.addEventListener("pointercancel", soltar);
    raiz.addEventListener("pointerleave", function () { if (!presionando) cursor.classList.remove("vis"); });

    return {
      el: "#d3",
      transicion: "fundido",
      preparar: function () {
        reiniciar();
        ya("d3-prompt").textContent = "";
        mensaje("d3-msg", "…");
        partido = partido || SplitText.create("#d3-titulo", { type: "words" });
        gsap.set(partido.words, { autoAlpha: 0, y: 60, rotation: 3 });
        gsap.set("#d3-marco", { autoAlpha: 0, scale: 0.94, y: 40 });
        gsap.set("#d3 .d-card", { autoAlpha: 0, x: 80 });
        gsap.set("#d3 .d-fila", { autoAlpha: 0, y: 40 });
      },
      entrar: function () {
        intervalo = setInterval(tick, 60);
        entrada = gsap.timeline()
          .to(partido.words, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#d3-marco", { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.4")
          .to("#d3 .d-card", { autoAlpha: 1, x: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "-=0.5")
          .to("#d3 .d-fila", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.3")
          .add(escribirPrompt);
        return entrada;
      },
      // gesto de avanzar: con algo dibujado, genera; mientras genera no se avanza; al final, sigue
      alSiguiente: function () {
        if (fase === "fin") return false;
        if (fase !== "generando" && trazos.length) generar();
        return true;
      },
      // gesto de volver: si ya dibujó, borra y se reintenta; si no, vuelve a la etapa 2
      alAnterior: function () { if (!empezo) return false; reiniciar(); indicacion(); return true; },
      salir: function () {
        clearInterval(intervalo); intervalo = null;
        if (entrada) entrada.kill(); if (tipeo) tipeo.kill(); if (reloj) reloj.kill(); if (gen) gen.kill(); if (cierre) cierre.kill();
        entrada = tipeo = reloj = gen = cierre = null;
        pararDemo(); if (latido) { latido.kill(); latido = null; }
        auto3 = frenarAuto(auto3, "d3-aviso");
        cursor.classList.remove("vis", "pres"); presionando = false; actual = null;
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
    ya("d2-consigna").textContent = TEXTOS.consigna2; ya("d2-consigna-sub").textContent = TEXTOS.consigna2Sub;
    ya("d2-etq-original").textContent = TEXTOS.etiquetaOriginal; ya("d2-etq-reconstruida").textContent = TEXTOS.etiquetaReconstruida;
    ya("d3-prompt-etq").textContent = TEXTOS.promptEtiqueta;
    ya("d3-final-titulo").textContent = TEXTOS.recorrido;
    ya("d3-final-etq-1").textContent = TEXTOS.recorrido1; ya("d3-final-etq-2").textContent = TEXTOS.recorrido2; ya("d3-final-etq-3").textContent = TEXTOS.recorrido3;
    ["d1-aviso", "d2-aviso", "d3-aviso"].forEach(function (id) { ya(id).innerHTML = Manos.svg("der") + " " + TEXTOS.avisoSiguiente; });
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
