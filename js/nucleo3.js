gsap.registerPlugin(SplitText);
Infografia.escalar("#escenario", 1920, 1080);

var bucles = [];      // animaciones en bucle de la pantalla actual
var entrada = null;   // timeline de entrada en curso
var partido = null;   // SplitText del título
var partido2 = null;
var cont = { n: 0, p: 0 }; 
function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); } 
var datos3 = [ { si: 81, no: 19 }, { si: 85, no: 15 }, { si: 69, no: 31 } ];
var cont3 = datos3.map(function () { return { p: 0 }; });
var partido4 = null;   // SplitText del título de la P4
var cifra15 = { n: 0 };   // contador de la pantalla de los 15.000 millones
var partidoIntro = null, partidoModelos = null, partidoUsos = null, partidoAgua = null, partidoEvolucion = null;
var valorEvolucion = { v: 0 };   // contador de la etiqueta del gráfico
var partidoDif1 = null, partidoDif2 = null, partidoDif3 = null, letrasPrompt = null;
var tipeo = { n: 0, mostradas: 0 };
var partidoPractica = null, palabrasPractica = null;
var partidoCierre = null, lineasCierre = null;
var partidoEncuesta = null, partidoResultados = null, partidoFinal = null;
var miVoto = null;   // lo que votó el visitante en la encuesta final   // avance del prompt que se escribe (pantalla de generación)

/* Ruido gaussiano en vivo sobre una foto (pantallas del modelo de difusión).
   Cada cuadro mezcla la foto con ruido según su nivel (0 = foto, 1 = solo ruido), como un modelo de difusión.
   El ruido se renueva varias veces por segundo, como estática.
   op (opcional): src (imagen), recorte {x, y, w, h} dentro de la imagen, gris (ruido blanco y negro). */
function ruidoSobreGato(selector, op) {
  op = op || {};
  var RECORTE = op.recorte || { x: 20, y: 18, w: 210, h: 212 };   // por defecto: el gato limpio dentro de gato1.png
  var cuadros = [], ctxs = [], intervalo = null;
  var niveles = [0, 0, 0, 0];                        // nivel actual de cada cuadro (los anima GSAP)
  var GAUSS = new Float32Array(1 << 16);             // tabla de valores gaussianos (Box-Muller)
  for (var i = 0; i < GAUSS.length; i++) {
    GAUSS[i] = Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(6.2831853 * Math.random());
  }

  // la foto se dibuja con drawImage y el ruido se pinta encima con transparencia = nivel;
  // así nunca se leen los píxeles de la imagen (abriendo como archivo local, Chrome no lo permite)
  var img = new Image(), listo = false;
  img.src = op.src || "../assets/nucleo3/img/gato1.png";
  img.onload = function () { listo = true; dibujar(); };

  var lienzoRuido = document.createElement("canvas");
  lienzoRuido.width = RECORTE.w; lienzoRuido.height = RECORTE.h;
  var ctxRuido = lienzoRuido.getContext("2d"), datosRuido = ctxRuido.createImageData(RECORTE.w, RECORTE.h);

  function nuevoRuido() {
    var d = datosRuido.data, j = (Math.random() * GAUSS.length) | 0;
    for (var p = 0; p < d.length; p += 4) {
      for (var c = 0; c < 3; c++) {   // ruido de color, independiente por canal (o el mismo valor si es gris)
        var v = (op.gris && c > 0) ? d[p] : 128 + (op.gris ? 90 : 72) * GAUSS[j++ & 0xffff];
        d[p + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      d[p + 3] = 255;
    }
    ctxRuido.putImageData(datosRuido, 0, 0);
  }

  function dibujar() {
    if (!listo || !ctxs.length) return;
    nuevoRuido();
    ctxs.forEach(function (ctx, k) {
      ctx.globalAlpha = 1;
      ctx.drawImage(img, RECORTE.x, RECORTE.y, RECORTE.w, RECORTE.h, 0, 0, RECORTE.w, RECORTE.h);
      if (niveles[k] > 0) { ctx.globalAlpha = niveles[k]; ctx.drawImage(lienzoRuido, 0, 0); }
    });
  }

  return {
    niveles: niveles,
    preparar: function (inicial) {   // inicial: nivel de ruido con el que arrancan todos los cuadros
      if (!ctxs.length) {
        cuadros = gsap.utils.toArray(selector);
        ctxs = cuadros.map(function (c) { return c.getContext("2d"); });
      }
      for (var k = 0; k < niveles.length; k++) niveles[k] = inicial || 0;
      dibujar();
    },
    arrancar: function () { if (!intervalo) intervalo = setInterval(dibujar, 90); },
    parar: function () { clearInterval(intervalo); intervalo = null; }
  };
}
var ruidoGato  = ruidoSobreGato("#n3-dif1 .n3d-cuadro");   // difusión directa (4 cuadros)
var ruidoGato2 = ruidoSobreGato("#n3-dif2 .n3d-cuadro");   // difusión indirecta (3 cuadros)
var ruidoGato3 = ruidoSobreGato("#n3-dif3 .n3d-cuadro",       // generación: ruido gris → gato siamés
  { src: "../assets/nucleo3/img/gato3.png", recorte: { x: 0, y: 0, w: 297, h: 224 }, gris: true });

/* Vasos de vidrio de la pantalla del agua (se crean una sola vez).
   El agua es una ola dentro del vaso: arranca abajo (invisible) y GSAP la sube con "y". */
var vasosArmados = false;
function armarVasos() {
  if (vasosArmados) return;
  vasosArmados = true;
  var n = 0;
  function vaso(nivel) {
    var id = "n3a-clip-" + (n++);
    var forma = "M5 4 H65 L58 88 H12 Z";
    return '<svg class="n3a-vaso" viewBox="0 0 70 92" data-nivel="' + nivel + '">' +
      '<defs><clipPath id="' + id + '"><path d="' + forma + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' +
        '<rect width="70" height="92" fill="rgba(237, 233, 255, .55)"/>' +
        '<g class="n3a-agua"><path class="n3a-ola" fill="url(#n3a-grad)" ' +
          'd="M-70 92 Q-52 86 -35 92 T0 92 T35 92 T70 92 T105 92 T140 92 V200 H-70 Z"/></g>' +
      '</g>' +
      '<path d="' + forma + '" fill="none" stroke="rgba(150, 140, 220, .55)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M15 12 L20 78" stroke="rgba(255,255,255,.9)" stroke-width="4" stroke-linecap="round"/>' +
      '</svg>';
  }
  var html = "";
  for (var i = 0; i < 8; i++) html += vaso(1);
  document.getElementById("n3a-vasos-persona").innerHTML = html;
  html = "";
  for (i = 0; i < 17; i++) html += vaso(1);
  html += vaso(0.25);   // el 0,25 de 17,25
  document.getElementById("n3a-vasos-imagen").innerHTML = html;
}   // SplitText de las dos pantallas nuevas (se parten una sola vez)
function pintar3(i) {
var t = document.querySelectorAll(".n3-torta")[i], p = cont3[i].p, d = datos3[i];
t.querySelector(".n3-disco").style.setProperty("--a", d.no * 3.6 * p);
t.querySelector(".n3-no-n").textContent = "%" + Math.round(d.no * p);
t.querySelector(".n3-si-n").textContent = "%" + Math.round(d.si * p);
}

function detener() {
  bucles.forEach(function (t) { t.kill(); }); bucles = [];
  if (entrada) { entrada.kill(); entrada = null; }
}

function iniciar() {
  /* ============ Modelo de difusión: las 3 pantallas comparten título y personaje ============
     Entre ellas no hay transición: el título y el personaje se quedan quietos y sólo cambia la card. */
  var DIF = ["n3-dif1", "n3-dif2", "n3-dif3"];
  function otraDifVisible(el) {   // la pantalla de difusión de la que se viene (todavía visible en preparar)
    for (var i = 0; i < DIF.length; i++) {
      var s = document.getElementById(DIF[i]);
      if (s !== el && !s.hidden) return s;
    }
    return null;
  }
  // entre pantallas de difusión: sólo se va el contenido de abajo de la card que sale (texto, cuadros, barra);
  // título, personaje, card y pasos quedan, porque la pantalla nueva los tiene iguales en el mismo lugar
  Infografia.transiciones.difCambio = function (sale, entra, d, dir) {
    var cosas = sale.querySelectorAll(".tarjeta .tarjeta, .n3d-cuadro, #n3d-avance, .n3d-avance, #n3d3-flecha");
    return gsap.timeline()
      .to(cosas, { autoAlpha: 0, x: -50 * dir, duration: 0.35, stagger: 0.04, ease: "power2.in" })
      .set(cosas, { x: 0 });   // quedan ocultas pero en su lugar, para la próxima vez que entre esa pantalla
  };
  function transicionDif(saliente) { return DIF.indexOf(saliente.id) >= 0 ? "difCambio" : null; }
  function indiceActivo(sec) {
    return Array.prototype.indexOf.call(sec.querySelectorAll(".n3d-paso"), sec.querySelector(".n3d-paso.activo"));
  }
  // si se viene de otra pantalla de difusión, deja título, personaje, card y pasos como estaban (sin animarlos)
  // y marca como activo el paso de la pantalla anterior; cambiarPaso() después lo pasa al nuevo con un fundido
  function continuarDif(el, palabras, caja, personaje, sombra, tarjeta) {
    var otra = otraDifVisible(el);
    el._sigue = !!otra;
    if (!otra) return;
    var y = gsap.getProperty(otra.querySelector('img[src*="personaje4"]'), "y");
    gsap.set(palabras, { autoAlpha: 1, x: 0, rotation: 0 });
    gsap.set(caja, { autoAlpha: 1, x: 0 });
    gsap.set(personaje, { autoAlpha: 1, scale: 1, x: 0, y: y });
    gsap.set(sombra, { autoAlpha: 1, scaleX: 1 });
    gsap.set(tarjeta, { autoAlpha: 1, x: 0 });
    var pasos = el.querySelectorAll(".n3d-paso");
    gsap.set(pasos, { autoAlpha: 1, y: 0 });
    el._activo = indiceActivo(el);
    el.classList.add("n3d-quieto");
    pasos.forEach(function (p, i) { p.classList.toggle("activo", i === indiceActivo(otra)); });
  }
  function cambiarPaso(el) {
    if (!el._sigue) return;
    void el.offsetWidth;   // aplica el estado anterior antes de prender las transiciones
    el.classList.remove("n3d-quieto");
    el.querySelectorAll(".n3d-paso").forEach(function (p, i) { p.classList.toggle("activo", i === el._activo); });
  }

  Infografia.presentacion([

    /* ============ Intro: felicidades, da paso a los modelos ============ */
    {
      el: "#n3-intro",
      preparar: function () {
        var d = Infografia.direccion;
        partidoIntro = partidoIntro || SplitText.create("#n3i-titulo", { type: "words" });
        gsap.set(partidoIntro.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3i-personaje", { autoAlpha: 0, scale: 0.85, x: 70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3i-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3i-tarjeta", { autoAlpha: 0, x: 70 * d });
        gsap.set("#n3i-tarjeta .linea", { autoAlpha: 0, x: 26 * d });
        gsap.set("#n3i-sombra-tarjeta", { autoAlpha: 0, scaleX: 0.5 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partidoIntro.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#n3i-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.45")
          .to("#n3i-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3i-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
          .to("#n3i-sombra-tarjeta", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3i-tarjeta .linea", { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" }, "-=0.4")
          .add(function () {
            bucles.push(gsap.to("#n3i-personaje", { y: -20, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3i-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3i-sombra-tarjeta", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ Modelos de difusión: línea de tiempo con DALL·E, Midjourney y Stable Diffusion ============ */
    {
      el: "#n3-modelos",
      preparar: function () {
        var d = Infografia.direccion;
        partidoModelos = partidoModelos || SplitText.create("#n3m-titulo", { type: "words" });
        gsap.set(partidoModelos.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3m-linea", { scaleX: 0, transformOrigin: d > 0 ? "0 50%" : "100% 50%" });
        gsap.set(".n3m-glow", { autoAlpha: 0, scale: 0 });
        gsap.set(".n3m-flecha", { autoAlpha: 0, y: -10 });
        gsap.set(".n3m-fecha", { autoAlpha: 0, x: 30 * d });
        gsap.set(".n3m-logo", { autoAlpha: 0, scale: 0.8, y: 30 });
        gsap.set("#n3m-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3m-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3m-tarjeta", { autoAlpha: 0, x: 70 * d });
        gsap.set("#n3m-sombra-tarjeta", { autoAlpha: 0, scaleX: 0.5 });
      },
      entrar: function () {
        var hitos = gsap.utils.toArray("#n3-modelos .n3m-hito");
        entrada = gsap.timeline()
          .to(partidoModelos.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          // la línea avanza y, a medida que pasa, aparece cada modelo en su fecha
          .to("#n3m-linea", { scaleX: 1, duration: 1.8, ease: "power2.inOut" }, "-=0.3");
        hitos.forEach(function (h, i) {
          var t = 1.0 + i * 0.45;   // sincronizado con el avance de la línea
          entrada
            .to(h.querySelector(".n3m-glow"),   { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.5)" }, t)
            .to(h.querySelector(".n3m-flecha"), { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, t + 0.15)
            .to(h.querySelector(".n3m-fecha"),  { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, t + 0.25)
            .to(h.querySelector(".n3m-logo"),   { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" }, t + 0.35);
        });
        entrada
          .to("#n3m-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.3")
          .to("#n3m-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3m-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
          .to("#n3m-sombra-tarjeta", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .add(function () {
            bucles.push(gsap.to("#n3m-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3m-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3m-sombra-tarjeta", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // los brillos de la línea laten y los logos flotan, cada uno a su ritmo
            bucles.push(gsap.to(".n3m-glow", { scale: 1.25, opacity: 0.6, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 }));
            bucles.push(gsap.to(".n3m-flecha", { y: 6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.3 }));
            bucles.push(gsap.to(".n3m-logo", { y: -10, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.5 }));
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ Comparación de modelos (tabla por filas) ============ */
    {
      el: "#n3-comparacion",
      preparar: function () {
        var d = Infografia.direccion;
        gsap.set(".n3c-col", { autoAlpha: 0, y: -20 });
        gsap.set(".n3c-fila", { autoAlpha: 0, x: 120 * d, scale: 1, clearProps: "boxShadow" });
        gsap.set(".n3c-logo", { autoAlpha: 0, scale: 0.8 });
        gsap.set(".n3c-celda", { autoAlpha: 0, x: 30 * d });
        gsap.set("#n3c-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3c-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
      },
      entrar: function () {
        var filas = gsap.utils.toArray("#n3-comparacion .n3c-fila");
        entrada = gsap.timeline()
          .to(".n3c-col", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.12 });
        // cada fila entra entera y su contenido aparece de izquierda a derecha: logo → datos
        filas.forEach(function (f, i) {
          entrada
            .to(f, { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, 0.4 + i * 0.35)
            .to(f.querySelector(".n3c-logo"), { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "<0.2")
            .to(f.querySelectorAll(".n3c-celda"), { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out", stagger: 0.12 }, "<0.15");
        });
        entrada
          .to("#n3c-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.4")
          .to("#n3c-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .add(function () {
            bucles.push(gsap.to("#n3c-personaje", { y: -14, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3c-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // foco que recorre las filas de a una: refuerza que cada dato es de ese modelo
            var foco = gsap.timeline({ repeat: -1 });
            filas.forEach(function (f) {
              foco.to(f, { scale: 1.015, boxShadow: "0 18px 70px rgba(120, 110, 200, .28)", duration: 0.5, ease: "power2.out" })
                  .to(f, { scale: 1, boxShadow: "0 12px 56px rgba(120, 110, 200, .12)", duration: 0.5, ease: "power2.in" }, "+=1.6");
            });
            bucles.push(foco);
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ 15.000 millones de imágenes ============ */
    {
      el: "#n3-cifras",
      preparar: function () {
        var d = Infografia.direccion;
        cifra15.n = 0;
        document.getElementById("n3f-num").textContent = "0";
        gsap.set("#n3f-tarjeta", { autoAlpha: 0, y: -30 });
        gsap.set("#n3f-texto", { autoAlpha: 0 });
        gsap.set("#n3f-cifra", { autoAlpha: 0, scale: 0.8 });
        gsap.set("#n3f-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3f-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set(".n3f-logo", { autoAlpha: 0, scale: 0.8 });
        gsap.set(".n3f-union", { scaleX: 0 });
        gsap.set(".n3f-dato", { autoAlpha: 0, x: 60 * d });
      },
      entrar: function () {
        var num = document.getElementById("n3f-num");
        entrada = gsap.timeline()
          .to("#n3f-tarjeta", { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" })
          .to("#n3f-texto", { autoAlpha: 1, duration: 0.6, ease: "power2.out" }, "-=0.2")
          // la cifra aparece y cuenta hasta 15.000
          .to("#n3f-cifra", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)" })
          .to(cifra15, { n: 15000, duration: 2, ease: "power2.out", onUpdate: function () { num.textContent = miles(cifra15.n); } }, "<")
          .to("#n3f-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=1.6")
          .to("#n3f-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1");
        // cada modelo: logo → se dibuja la unión → aparece su dato
        gsap.utils.toArray("#n3-cifras .n3f-fila").forEach(function (f, i) {
          entrada
            .to(f.querySelector(".n3f-logo"), { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, i ? "-=0.2" : "-=0.6")
            .to(f.querySelector(".n3f-union"), { scaleX: 1, duration: 0.35, ease: "steps(6)" })
            .to(f.querySelector(".n3f-dato"), { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" });
        });
        entrada.add(function () {
          bucles.push(gsap.to("#n3f-personaje", { y: -18, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to("#n3f-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          // la cifra late suave y los logos flotan
          bucles.push(gsap.to("#n3f-cifra", { scale: 1.03, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(".n3f-logo", { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.5 }));
        });
        return entrada;
      },
      salir: detener
    },

    /* ============ Usos de la creación de imágenes ============ */
    {
      el: "#n3-usos",
      preparar: function () {
        var d = Infografia.direccion;
        partidoUsos = partidoUsos || SplitText.create("#n3u-titulo", { type: "words" });
        gsap.set(partidoUsos.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3u-lista", { autoAlpha: 0, x: -70 * d });
        gsap.set(".n3u-item", { autoAlpha: 0, x: 26 * d });
        gsap.set("#n3u-personaje", { autoAlpha: 0, scale: 0.85, y: 40, transformOrigin: "50% 100%" });
        gsap.set("#n3u-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set(".n3u-img", { autoAlpha: 0, scale: 0.85, rotation: function () { return gsap.utils.random(-6, 6); } });
        document.querySelectorAll("#n3-usos .activo").forEach(function (e) { e.classList.remove("activo"); });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partidoUsos.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#n3u-lista", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
          .to(".n3u-item", { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.1, ease: "power2.out" }, "-=0.3")
          // las imágenes "caen" como fotos sobre la mesa
          .to(".n3u-img", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, stagger: 0.15, ease: "back.out(1.6)" }, 0.5)
          .to("#n3u-personaje", { autoAlpha: 1, scale: 1, y: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.6")
          .to("#n3u-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .add(function () {
            bucles.push(gsap.to("#n3u-personaje", { y: -14, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3u-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // recorrido: se resalta cada uso junto con su imagen de ejemplo
            var foco = gsap.timeline({ repeat: -1 });
            [1, 2, 3, 4, 5].forEach(function (n) {
              var par = document.querySelectorAll('#n3-usos [data-uso="' + n + '"]');
              var img = document.querySelector('#n3-usos .n3u-img[data-uso="' + n + '"]');
              foco.add(function () { par.forEach(function (e) { e.classList.add("activo"); }); })
                  .to(img, { scale: 1.05, duration: 0.3, ease: "back.out(2)" })
                  .to(img, { scale: 1, duration: 0.3, ease: "power2.inOut" }, "+=0.8")
                  .add(function () { par.forEach(function (e) { e.classList.remove("activo"); }); });
            });
            bucles.push(foco);
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ ¿Sabías que…? (agua) ============
       Los vasos se llenan de a uno: primero los 8 de la persona, con calma; después los 17,25 de una sola
       imagen, más rápido y en cascada (el último queda a un cuarto). */
    {
      el: "#n3-agua",
      preparar: function () {
        var d = Infografia.direccion;
        armarVasos();
        partidoAgua = partidoAgua || SplitText.create("#n3a-titulo", { type: "words" });
        gsap.set(partidoAgua.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3a-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set("#n3a-persona", { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 100%" });
        gsap.set("#n3a-divisor", { scaleY: 0 });
        gsap.set("#n3a-imagen", { autoAlpha: 0, scale: 0.8, rotation: -4 });
        gsap.set(".n3a-chispa", { autoAlpha: 0, scale: 0 });
        gsap.set(".n3a-vaso", { autoAlpha: 0, y: 20 });
        gsap.set(".n3a-agua", { y: 0 });
        gsap.set(".n3a-cuenta, .n3a-texto", { autoAlpha: 0 });
        gsap.set("#n3a-personaje", { autoAlpha: 0, scale: 0.85, x: -60 * d, transformOrigin: "50% 100%" });
        document.querySelector("#n3a-cuenta-persona span").textContent = "0";
        document.querySelector("#n3a-cuenta-imagen span").textContent = "0";
      },
      entrar: function () {
        var vP = gsap.utils.toArray("#n3a-vasos-persona .n3a-vaso");
        var vI = gsap.utils.toArray("#n3a-vasos-imagen .n3a-vaso");
        var cP = { v: 0 }, cI = { v: 0 };
        var spanP = document.querySelector("#n3a-cuenta-persona span");
        var spanI = document.querySelector("#n3a-cuenta-imagen span");
        // cada vaso: aparece y el agua sube hasta su nivel (el último de la imagen, a 0,25)
        function llenar(vasos, cada) {
          var tl = gsap.timeline();
          vasos.forEach(function (v, i) {
            var nivel = parseFloat(v.getAttribute("data-nivel"));
            tl.to(v, { autoAlpha: 1, y: 0, duration: 0.25, ease: "back.out(2)" }, i * cada)
              .to(v.querySelector(".n3a-agua"), { y: -80 * nivel, duration: cada * 2, ease: "power2.out" }, i * cada + 0.1);
          });
          return tl;
        }
        entrada = gsap.timeline()
          .to(partidoAgua.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#n3a-tarjeta", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
          .to("#n3a-divisor", { scaleY: 1, duration: 0.6, ease: "power2.inOut" }, "-=0.2")
          .to("#n3a-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.8, ease: "back.out(1.4)" }, "<")
          // la persona: 8 vasos, con calma
          .to("#n3a-persona", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.8)" })
          .to("#n3a-cuenta-persona", { autoAlpha: 1, duration: 0.3 })
          .add(llenar(vP, 0.3), "<")
          .to(cP, { v: 8, duration: vP.length * 0.3 + 0.3, ease: "none", onUpdate: function () { spanP.textContent = Math.floor(cP.v); } }, "<")
          .to("#n3a-texto-persona", { autoAlpha: 1, duration: 0.5 })
          // una sola imagen: 17,25 vasos, rápido y en cascada
          .to("#n3a-imagen", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.8)" }, "+=0.3")
          .to(".n3a-chispa", { autoAlpha: 1, scale: 1, rotation: 180, duration: 0.5, ease: "back.out(2.5)" }, "-=0.2")
          .to("#n3a-cuenta-imagen", { autoAlpha: 1, duration: 0.3 })
          .add(llenar(vI, 0.12), "<")
          .to(cI, { v: 17.25, duration: vI.length * 0.12 + 0.3, ease: "none", onUpdate: function () {
            spanI.textContent = cI.v >= 17.25 ? "17,25" : Math.floor(cI.v);
          } }, "<")
          .to("#n3a-texto-imagen", { autoAlpha: 1, duration: 0.5 })
          .add(function () {
            bucles.push(gsap.to("#n3a-personaje", { y: -12, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3a-persona", { scaleY: 1.02, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to(".n3a-chispa", { scale: 0.7, opacity: 0.6, rotation: "+=45", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3a-imagen", { y: -8, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ Evolución de la cantidad de imágenes (gráfico) ============
       La línea se dibuja de izquierda a derecha, el área la acompaña y cada punto aparece
       justo cuando la línea llega a él; al final la etiqueta cuenta hasta 16.000 millones. */
    {
      el: "#n3-evolucion",
      preparar: function () {
        var d = Infografia.direccion;
        var linea = document.getElementById("n3e-linea"), largo = linea.getTotalLength();
        partidoEvolucion = partidoEvolucion || SplitText.create("#n3e-titulo", { type: "words" });
        gsap.set(partidoEvolucion.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3e-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set(".n3e-grilla", { autoAlpha: 0 });
        gsap.set(".n3e-fechas text", { autoAlpha: 0 });
        gsap.set(linea, { strokeDasharray: largo, strokeDashoffset: largo });
        gsap.set("#n3e-revela-rect", { attr: { width: 0 } });
        // en SVG, GSAP escala desde la esquina si no se le dice el centro
        gsap.set(".n3e-punto", { scale: 0, transformOrigin: "50% 50%" });
        gsap.set("#n3e-etiqueta", { autoAlpha: 0, scale: 0.6, y: 10, transformOrigin: "50% 100%" });
        gsap.set("#n3e-pie", { autoAlpha: 0, y: 20 });
        gsap.set("#n3e-personaje", { autoAlpha: 0, scale: 0.85, x: -60 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3e-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        valorEvolucion.v = 0;
        document.getElementById("n3e-valor").textContent = "0";
      },
      entrar: function () {
        var linea = document.getElementById("n3e-linea"), largo = linea.getTotalLength();
        var DURA = 2.6, INICIO = 1.6;   // duración del trazo y momento en que arranca
        var valor = document.getElementById("n3e-valor");
        entrada = gsap.timeline()
          .to(partidoEvolucion.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.06, ease: "back.out(1.5)" })
          .to("#n3e-tarjeta", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
          .to("#n3e-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "<")
          .to("#n3e-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to(".n3e-grilla", { autoAlpha: 1, duration: 0.5 }, "-=0.5")
          .to(".n3e-fechas text", { autoAlpha: 1, duration: 0.3, stagger: 0.08 }, "-=0.2")
          // el trazo y el área avanzan juntos (el área se revela con un rectángulo que se ensancha)
          .to(linea, { strokeDashoffset: 0, duration: DURA, ease: "none" }, INICIO)
          .to("#n3e-revela-rect", { attr: { width: 1200 }, duration: DURA, ease: "none" }, INICIO);
        // cada punto aparece cuando la línea pasa por él (según su posición a lo largo del trazo)
        var recorrido = 0, prev = null;
        document.querySelectorAll("#n3e-grafico .n3e-punto").forEach(function (p) {
          var x = +p.getAttribute("cx"), y = +p.getAttribute("cy");
          if (prev) recorrido += Math.hypot(x - prev.x, y - prev.y);
          prev = { x: x, y: y };
          entrada.to(p, { scale: 1, duration: 0.35, ease: "back.out(3)" }, INICIO + DURA * recorrido / largo - 0.05);
        });
        entrada
          .to("#n3e-etiqueta", { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(2.2)" }, INICIO + DURA)
          .to(valorEvolucion, { v: 16000, duration: 1.4, ease: "power2.out", onUpdate: function () { valor.textContent = miles(valorEvolucion.v); } }, "<")
          .to("#n3e-pie", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.6")
          .add(function () {
            bucles.push(gsap.to("#n3e-personaje", { y: -14, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3e-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // el último punto late: "y sigue creciendo"
            bucles.push(gsap.to("#n3e-ultimo", { scale: 1.2, opacity: 0.8, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3e-etiqueta", { y: -6, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ ¿Qué sos ahora? (antes "Pantalla 4") ============ */
    {
      el: "#p4",

      preparar: function () {
        partido4 = SplitText.create("#n3-titulo4", { type: "words" });
        gsap.set(partido4.words, { autoAlpha: 0, x: 60 * Infografia.direccion, rotation: 3 });
        gsap.set("#n3-t4-caja", { autoAlpha: 0, x: 40 * Infografia.direccion });
        gsap.set("#n3-linea", { clipPath: "inset(0% 100% 0% 0%)" });
        gsap.set("#n3-glow", { autoAlpha: 0, scale: 0 });
        gsap.set("#n3-flecha", { autoAlpha: 0, x: 14 * Infografia.direccion });
        gsap.set("#n3-pildora", { autoAlpha: 0, scale: 0.4, x: 20 * Infografia.direccion, transformOrigin: "50% 0%" });
        gsap.set("#n3-personaje4", { autoAlpha: 0, scale: 0.85, x: 70 * Infografia.direccion, transformOrigin: "50% 100%" });
        gsap.set("#n3-sombra-personaje4", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3-tarjeta4", { autoAlpha: 0, x: 70 * Infografia.direccion });
        gsap.set("#n3-sombra-tarjeta4", { autoAlpha: 0, scaleX: 0.5 });
        gsap.set("#n3-dif-titulo", { autoAlpha: 0, x: 26 * Infografia.direccion });
        gsap.set(".n3-dif-img", { autoAlpha: 0, scale: 0.5, rotation: -8 });
        gsap.set(".n3-cap", { autoAlpha: 0, x: 20 * Infografia.direccion });
      },

      entrar: function () {
        entrada = gsap.timeline()
          // título
          .to("#n3-t4-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, 0)
          .to(partido4.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" }, 0.15)
          // la línea se dibuja y, al pasar por 2015, aparece el marcador
          .to("#n3-linea", { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "power2.inOut" }, 0.5)
          .to("#n3-glow", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, 1.0)
          .to("#n3-flecha", { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" }, "<0.25")
          .to("#n3-pildora", { autoAlpha: 1, scale: 1, x: 0, duration: 0.7, ease: "back.out(1.8)" }, "<0.1")
          // personaje
          .to("#n3-personaje4", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.5")
          .to("#n3-sombra-personaje4", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          // tarjeta
          .to("#n3-tarjeta4", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
          .to("#n3-sombra-tarjeta4", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3-dif-titulo", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power2.out" }, "-=0.4")
          // las tres imágenes con su texto
          .to(".n3-dif-img", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, stagger: 0.2, ease: "back.out(1.8)" }, "-=0.2")
          .to(".n3-cap", { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.2, ease: "power2.out" }, "<0.15")
          .add(function () {
            bucles.push(gsap.to("#n3-personaje4", { y: -20, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-sombra-personaje4", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-sombra-tarjeta4", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-glow", { scale: 1.3, opacity: 0.6, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-flecha", { y: 6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to(".n3-dif-img", { y: -8, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.25 }));
          });
        return entrada;
      },

      salir: detener
    },

    /* ============ Modelo de difusión · 1: difusión directa ============
       Los cuadros aparecen y el ruido "invade" uno por uno: 0 → 35% → 65% → 100%. */
    {
      el: "#n3-dif1",
      transicion: transicionDif,
      preparar: function (el) {
        var d = Infografia.direccion;
        ruidoGato.preparar();
        partidoDif1 = partidoDif1 || SplitText.create("#n3d-titulo", { type: "words" });
        gsap.set(partidoDif1.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3d-titulo-caja", { autoAlpha: 0, x: 40 * d });
        gsap.set("#n3d-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3d-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3d-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set(".n3d-paso", { autoAlpha: 0, y: -20 });
        gsap.set("#n3d-explica", { autoAlpha: 0, y: 20 });
        gsap.set(".n3d-cuadro", { autoAlpha: 0, scale: 0.85 });
        gsap.set("#n3d-avance", { autoAlpha: 0 });
        gsap.set("#n3d-avance-barra", { scaleX: 0 });
        continuarDif(el, partidoDif1.words, "#n3d-titulo-caja", "#n3d-personaje", "#n3d-sombra-personaje", "#n3d-tarjeta");
      },
      entrar: function (el) {
        cambiarPaso(el);
        var N = ruidoGato.niveles;
        entrada = gsap.timeline()
          .to("#n3d-titulo-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
          .to(partidoDif1.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" }, 0.15)
          .to("#n3d-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, 0.3)
          .to("#n3d-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3d-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, 0.5)
          .to(".n3d-paso", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "back.out(2)" }, "-=0.3")
          .to("#n3d-explica", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.2")
          // los 4 cuadros aparecen con el gato limpio...
          .to(".n3d-cuadro", { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.8)" })
          .to("#n3d-avance", { autoAlpha: 1, duration: 0.3 })
          .add(function () { ruidoGato.arrancar(); })
          // ...y el ruido se va sumando de izquierda a derecha
          .to(N, { 1: 0.35, duration: 1.0, ease: "power1.in" }, "+=0.2")
          .to(N, { 2: 0.65, duration: 1.0, ease: "power1.in" }, "-=0.5")
          .to(N, { 3: 1,    duration: 1.0, ease: "power1.in" }, "-=0.5")
          .to("#n3d-avance-barra", { scaleX: 1, duration: 2.0, ease: "power1.in" }, "<-1")
          .add(function () {
            bucles.push(gsap.to("#n3d-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3d-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // el paso activo (1) late
            bucles.push(gsap.to(".n3d-paso.activo .n3d-num", { scale: 1.08, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: function () { detener(); ruidoGato.parar(); }
    },

    /* ============ Modelo de difusión · 2: difusión indirecta ============
       Al revés que la anterior: los cuadros arrancan en ruido puro y se van limpiando
       (100% → 65% → 35% → 0%) hasta que vuelve a aparecer el gato. */
    {
      el: "#n3-dif2",
      transicion: transicionDif,
      preparar: function (el) {
        var d = Infografia.direccion;
        ruidoGato2.preparar(1);
        partidoDif2 = partidoDif2 || SplitText.create("#n3d2-titulo", { type: "words" });
        gsap.set(partidoDif2.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3d2-titulo-caja", { autoAlpha: 0, x: 40 * d });
        gsap.set("#n3d2-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3d2-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3d2-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set("#n3-dif2 .n3d-paso", { autoAlpha: 0, y: -20 });
        gsap.set("#n3d2-explica", { autoAlpha: 0, y: 20 });
        gsap.set("#n3-dif2 .n3d-cuadro", { autoAlpha: 0, scale: 0.85 });
        gsap.set("#n3d2-avance", { autoAlpha: 0 });
        gsap.set("#n3d2-avance-barra", { scaleX: 0 });
        continuarDif(el, partidoDif2.words, "#n3d2-titulo-caja", "#n3d2-personaje", "#n3d2-sombra-personaje", "#n3d2-tarjeta");
      },
      entrar: function (el) {
        cambiarPaso(el);
        var N = ruidoGato2.niveles;
        entrada = gsap.timeline()
          .to("#n3d2-titulo-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
          .to(partidoDif2.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" }, 0.15)
          .to("#n3d2-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, 0.3)
          .to("#n3d2-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3d2-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, 0.5)
          .to("#n3-dif2 .n3d-paso", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "back.out(2)" }, "-=0.3")
          .to("#n3d2-explica", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.2")
          // los 3 cuadros aparecen como ruido puro...
          .add(function () { ruidoGato2.arrancar(); })
          .to("#n3-dif2 .n3d-cuadro", { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.8)" })
          .to("#n3d2-avance", { autoAlpha: 1, duration: 0.3 })
          // ...y la red neuronal "limpia" de izquierda a derecha hasta reconstruir el gato
          .to(N, { 0: 0.65, duration: 1.0, ease: "power1.out" }, "+=0.3")
          .to(N, { 1: 0.35, duration: 1.0, ease: "power1.out" }, "-=0.5")
          .to(N, { 2: 0,    duration: 1.0, ease: "power1.out" }, "-=0.5")
          .to("#n3d2-avance-barra", { scaleX: 1, duration: 2.0, ease: "power1.out" }, "<-1")
          .add(function () {
            bucles.push(gsap.to("#n3d2-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3d2-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-dif2 .n3d-paso.activo .n3d-num", { scale: 1.08, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // el gato reconstruido "aparece" con un brillo suave
            bucles.push(gsap.to("#n3-dif2 .n3d-cuadro:last-child", { boxShadow: "0 0 0 6px rgba(169, 230, 251, .8), 0 12px 32px rgba(120, 110, 200, .25)", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: function () { detener(); ruidoGato2.parar(); }
    },

    /* ============ Modelo de difusión · 3: generación ============
       Se escribe el pedido (prompt), aparece el ruido gris en vivo y, a partir de él,
       "se revela" el gato siamés a medida que el ruido baja de 100% a 0%. */
    {
      el: "#n3-dif3",
      transicion: transicionDif,
      preparar: function (el) {
        var d = Infografia.direccion;
        ruidoGato3.preparar(1);
        partidoDif3 = partidoDif3 || SplitText.create("#n3d3-titulo", { type: "words" });
        letrasPrompt = letrasPrompt || SplitText.create("#n3d3-prompt", { type: "chars" });
        gsap.set(partidoDif3.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3d3-titulo-caja", { autoAlpha: 0, x: 40 * d });
        gsap.set("#n3d3-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3d3-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3d3-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set("#n3-dif3 .n3d-paso", { autoAlpha: 0, y: -20 });
        gsap.set("#n3d3-explica", { autoAlpha: 0, y: 20 });
        gsap.set(letrasPrompt.chars, { autoAlpha: 0 });
        gsap.set("#n3d3-cursor", { autoAlpha: 0, opacity: 1 });
        tipeo.n = 0; tipeo.mostradas = 0;
        gsap.set("#n3-dif3 .n3d-cuadro", { autoAlpha: 0, scale: 0.85 });
        gsap.set("#n3d3-flecha", { autoAlpha: 0, x: -20 });
        continuarDif(el, partidoDif3.words, "#n3d3-titulo-caja", "#n3d3-personaje", "#n3d3-sombra-personaje", "#n3d3-tarjeta");
      },
      entrar: function (el) {
        cambiarPaso(el);
        var N = ruidoGato3.niveles;
        entrada = gsap.timeline()
          .to("#n3d3-titulo-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
          .to(partidoDif3.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" }, 0.15)
          .to("#n3d3-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, 0.3)
          .to("#n3d3-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3d3-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, 0.5)
          .to("#n3-dif3 .n3d-paso", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "back.out(2)" }, "-=0.3")
          .to("#n3d3-explica", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.2")
          // el pedido se escribe letra por letra, como si alguien lo tipeara
          // el cursor se mueve detrás de la última letra escrita (no queda fijo al final de la frase)
          .add(function () {
            var cursor = document.getElementById("n3d3-cursor");
            letrasPrompt.chars[0].before(cursor);
            gsap.set(cursor, { autoAlpha: 1 });
            bucles.push(gsap.to(cursor, { opacity: 0, duration: 0.45, ease: "steps(1)", yoyo: true, repeat: -1 }));
          })
          .to(tipeo, { n: letrasPrompt.chars.length, duration: letrasPrompt.chars.length * 0.035, ease: "none",
            onUpdate: function () {
              var n = Math.floor(tipeo.n), chars = letrasPrompt.chars;
              for (var i = tipeo.mostradas; i < n; i++) gsap.set(chars[i], { autoAlpha: 1 });
              if (n > tipeo.mostradas) { chars[n - 1].after(document.getElementById("n3d3-cursor")); tipeo.mostradas = n; }
            } })
          // ruido gris en vivo → flecha → el gato se revela desde el ruido
          .add(function () { ruidoGato3.arrancar(); }, "-=0.6")
          .to("#n3-dif3 .n3d-cuadro", { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.25, ease: "back.out(1.8)" }, "-=0.6")
          .to("#n3d3-flecha", { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" }, "-=0.3")
          .to(N, { 1: 0, duration: 2.4, ease: "power2.inOut" }, "+=0.2")
          .add(function () {
            bucles.push(gsap.to("#n3d3-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3d3-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-dif3 .n3d-paso.activo .n3d-num", { scale: 1.08, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3d3-flecha", { x: 8, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-dif3 .n3d-cuadro:last-child", { boxShadow: "0 0 0 6px rgba(169, 230, 251, .8), 0 12px 32px rgba(120, 110, 200, .25)", duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: function () { detener(); ruidoGato3.parar(); }
    },

    /* ============ A la práctica (da paso al juego de difusión) ============ */
    {
      el: "#n3-practica",
      preparar: function () {
        var d = Infografia.direccion;
        partidoPractica = partidoPractica || SplitText.create("#n3p-titulo", { type: "words" });
        palabrasPractica = palabrasPractica || SplitText.create("#n3p-texto", { type: "words" });
        gsap.set(partidoPractica.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3p-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3p-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3p-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set("#n3p-sombra-tarjeta", { autoAlpha: 0, scaleX: 0.5 });
        gsap.set(palabrasPractica.words, { autoAlpha: 0, y: 24 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partidoPractica.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#n3p-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.4")
          .to("#n3p-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3p-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.6")
          .to("#n3p-sombra-tarjeta", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to(palabrasPractica.words, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "back.out(2)" }, "-=0.3")
          .add(function () {
            bucles.push(gsap.to("#n3p-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3p-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3p-sombra-tarjeta", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // "práctica" late para anticipar el juego
            bucles.push(gsap.to(".n3p-resalte", { scale: 1.08, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 60%" }));
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ Juego de difusión (3 pantallas: ensuciar, reconstruir, generar) ============ */
    ...Difusion.pantallas(),

    /* ============ Cierre del juego (da paso a las curiosidades) ============ */
    {
      el: "#n3-cierre",
      preparar: function () {
        var d = Infografia.direccion;
        partidoCierre = partidoCierre || SplitText.create("#n3k-titulo", { type: "words" });
        lineasCierre = lineasCierre || SplitText.create("#n3k-texto", { type: "lines" });
        gsap.set(partidoCierre.words, { autoAlpha: 0, x: 60 * d, rotation: 3 });
        gsap.set("#n3k-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
        gsap.set("#n3k-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3k-tarjeta", { autoAlpha: 0, x: 80 * d });
        gsap.set("#n3k-sombra-tarjeta", { autoAlpha: 0, scaleX: 0.5 });
        gsap.set(lineasCierre.lines, { autoAlpha: 0, y: 24 });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partidoCierre.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#n3k-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.4")
          .to("#n3k-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3k-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.6")
          .to("#n3k-sombra-tarjeta", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to(lineasCierre.lines, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.18, ease: "power3.out" }, "-=0.3")
          .add(function () {
            bucles.push(gsap.to("#n3k-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3k-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3k-sombra-tarjeta", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // el personaje "festeja" con un pequeño bamboleo al terminar de entrar
            bucles.push(gsap.to("#n3k-personaje", { rotation: 4, duration: 0.25, ease: "sine.inOut", yoyo: true, repeat: 3, repeatDelay: 0.05,
              transformOrigin: "50% 100%", delay: 0.4 }));
          });
        return entrada;
      },
      salir: detener
    },

    /* ============ Pantalla 1: sin interactividad con el botón ============ */
    {
      el: "#p1",

      // Estado inicial: todo oculto antes de que la pantalla aparezca
      preparar: function () {
        partido = SplitText.create("#n3-titulo", { type: "words" });
        gsap.set(partido.words, { autoAlpha: 0, x: 60 * Infografia.direccion, rotation: 3 });
        gsap.set("#n3-personaje", { autoAlpha: 0, scale: 0.85, x: 70 * Infografia.direccion, transformOrigin: "50% 100%" });
        gsap.set("#n3-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3-tarjeta", { autoAlpha: 0, x: 70 * Infografia.direccion });
        gsap.set("#n3-tarjeta .linea", { autoAlpha: 0, x: 26 * Infografia.direccion });
        gsap.set("#n3-adobe", { autoAlpha: 0, scale: 0.5, rotation: -12 });
        gsap.set("#n3-sombra-tarjeta", { autoAlpha: 0, scaleX: 0.5 });
      },

      // Secuencia de entrada
      entrar: function () {
        entrada = gsap.timeline()
          .to(partido.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" })
          .to("#n3-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.45")
          .to("#n3-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3-tarjeta", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
          .to("#n3-sombra-tarjeta", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          .to("#n3-tarjeta .linea", { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.1, ease: "power2.out" }, "-=0.4")
          .to("#n3-adobe", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.8, ease: "back.out(1.8)" }, "-=0.5")
          .add(function () {
            // Movimiento continuo mientras la pantalla está a la vista
            bucles.push(gsap.to("#n3-personaje", { y: -20, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-adobe", { y: -10, rotation: 1.5, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-sombra-tarjeta", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },

      salir: detener
      // sin "interactuar": el botón no hace nada en esta pantalla
    },

          /* ============ Pantalla 2: encuesta ============ */
    {
      el: "#p2",

      preparar: function () {
        document.getElementById("n3-copia").innerHTML = "";
        cont.n = 0; cont.p = 0;
        document.getElementById("n3-cifra").textContent = "+0";
        document.getElementById("n3-pct").textContent = "0%";

        partido2 = SplitText.create("#n3-titulo2", { type: "words" });
        gsap.set(partido2.words, { autoAlpha: 0, x: 60 * Infografia.direccion, rotation: 3 });
        gsap.set("#n3-t2-caja", { autoAlpha: 0, x: 40 * Infografia.direccion });
        gsap.set("#n3-personaje2", { autoAlpha: 0, scale: 0.85, x: 70 * Infografia.direccion, transformOrigin: "50% 100%" });
        gsap.set("#n3-sombra-personaje2", { autoAlpha: 0, scaleX: 0.4 });
        gsap.set("#n3-tarjeta2", { autoAlpha: 0, x: 70 * Infografia.direccion });
        gsap.set("#n3-cifra", { autoAlpha: 0, x: 30 * Infografia.direccion });
        gsap.set("#n3-etiqueta", { autoAlpha: 0, x: 20 * Infografia.direccion });
        gsap.set(".n3-icono", { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%" });
        gsap.set("#n3-divisor", { autoAlpha: 0, scaleY: 0, transformOrigin: "50% 0%" });
        gsap.set("#n3-dona-caja", { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 50%" });
        gsap.set("#n3-dona", { "--a": 0 });
        gsap.set("#n3-texto2 .linea", { autoAlpha: 0, x: 26 * Infografia.direccion });
        gsap.set("#n3-sombra-tarjeta2", { autoAlpha: 0, scaleX: 0.5 });
      },

      entrar: function () {
        entrada = gsap.timeline()
          // título
          .to("#n3-t2-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, 0)
          .to(partido2.words, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, stagger: 0.08, ease: "back.out(1.5)" }, 0.15)
          // personaje
          .to("#n3-personaje2", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "-=0.45")
          .to("#n3-sombra-personaje2", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          // tarjeta
          .to("#n3-tarjeta2", { autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
          .to("#n3-sombra-tarjeta2", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
          // +16.000 con conteo
          .to("#n3-cifra", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power2.out" }, "-=0.3")
          .to(cont, { n: 16000, duration: 1.8, ease: "power2.out", onUpdate: function () {
            document.getElementById("n3-cifra").textContent = "+" + miles(cont.n);
          } }, "<")
          .to("#n3-etiqueta", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.out" }, "-=1.2")
          // íconos que aparecen de a uno
          .to(".n3-icono", { autoAlpha: 1, scale: 1, duration: 0.55, stagger: 0.1, ease: "back.out(2)" }, "-=0.9")
          // divisor
          .to("#n3-divisor", { autoAlpha: 1, scaleY: 1, duration: 0.7, ease: "power3.out" }, "-=0.9")
          // dona que se llena + 86%
          .to("#n3-dona-caja", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.4)" }, "-=0.4")
          .to("#n3-dona", { "--a": 309.6, duration: 1.6, ease: "power2.inOut" }, "<0.2")
          .to(cont, { p: 86, duration: 1.6, ease: "power2.inOut", onUpdate: function () {
            document.getElementById("n3-pct").textContent = Math.round(cont.p) + "%";
          } }, "<")
          // texto de la derecha
          .to("#n3-texto2 .linea", { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" }, "-=1.1")
          .add(function () {
            bucles.push(gsap.to("#n3-personaje2", { y: -20, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#n3-sombra-personaje2", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // ola suave entre los íconos
            bucles.push(gsap.to(".n3-icono", { y: -8, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.15 }));
            bucles.push(gsap.to("#n3-sombra-tarjeta2", { scaleX: 0.92, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },

        salir: function () { if (entrada) entrada.progress(1); detener(); }
    },

          /* ============ Pantalla 3: la card sube y entra la de las tortas ============ */
    {
      el: "#p3",
      transicion: "ninguna",   // arranca igual que el final de la P2, no hay nada que transicionar

      preparar: function () {
        // Copia de la P2 tal como quedó (incluye títulos, personaje, sombras y la card)
        document.getElementById("n3-copia").innerHTML = document.getElementById("p2").innerHTML;
        gsap.set("#n3-copia #n3-tarjeta2", { transformOrigin: "50% 0%" });

        gsap.set("#n3-tarjeta3", { autoAlpha: 0, x: 320 * Infografia.direccion });
        gsap.set(".n3-pregunta", { autoAlpha: 0, x: 30 * Infografia.direccion });
        gsap.set(".n3-torta", { autoAlpha: 0, scale: 0.6, rotation: -25, transformOrigin: "50% 50%" });
        cont3.forEach(function (c, i) { c.p = 0; pintar3(i); });
      },

      entrar: function () {
        var s = "#n3-copia ";
        entrada = gsap.timeline()
          // la card vieja sube y pasa a segundo plano
          .to(s + "#n3-tarjeta2", { y: -132, x: -20, scale: 0.92, opacity: 0.55, filter: "blur(2px)", duration: 1.1, ease: "power3.inOut" }, 0)
          .to(s + ".n3-icono", { y: 0, duration: 0.6, ease: "power2.out" }, 0)
          // su sombra baja y pasa a ser la de la card nueva
          .to(s + "#n3-sombra-tarjeta2", { y: 80, x: -30, scaleX: 0.82, duration: 1.1, ease: "power3.inOut" }, 0)
          // entra la card nueva desde abajo
          .to("#n3-tarjeta3", { autoAlpha: 1, x: 0, duration: 0.9, ease: "power3.out" }, 0.4)
          .to(".n3-pregunta", { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.12, ease: "power2.out" }, "-=0.3")
          .addLabel("tortas", "-=0.2")
          .to(".n3-torta", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.8, stagger: 0.15, ease: "back.out(1.5)" }, "tortas");

        // el sector "NO" crece y los porcentajes cuentan
        cont3.forEach(function (c, i) {
          entrada.to(c, { p: 1, duration: 1.4, ease: "power2.inOut", onUpdate: function () { pintar3(i); } }, "tortas+=" + (0.2 + i * 0.15));
        });

        entrada.add(function () {
          bucles.push(gsap.to(s + "#n3-personaje2", { y: -20, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(s + "#n3-sombra-personaje2", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(s + "#n3-sombra-tarjeta2", { scaleX: 0.76, opacity: 0.7, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(".n3-torta", { y: -8, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.25 }));
        });
        return entrada;
      },

      salir: detener
    },

          /* ============ Pantalla 3b: la card de las tortas sube y entra la de los usos ============ */
    {
      el: "#n3-adobe-usos",
      transicion: "ninguna",   // arranca igual que el final de la P3

      preparar: function () {
        // Copia de la P3 tal como quedó (que a su vez tiene adentro la copia de la P2)
        document.getElementById("n3-copia3").innerHTML = document.getElementById("p3").innerHTML;
        gsap.set("#n3-tarjeta-usos", { autoAlpha: 0, y: 260 * Infografia.direccion });
        gsap.set("#n3u2-titulo", { autoAlpha: 0, y: 20 });
        gsap.set("#n3u2-linea", { scaleX: 0 });
        gsap.set(".n3u2-caja", { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 50%" });
        gsap.set(".n3u2-pct, .n3u2-nombre", { autoAlpha: 0, y: 20 });
        document.querySelectorAll(".n3u2-pct").forEach(function (e) { e.textContent = "%0"; });
      },

      entrar: function () {
        var s = "#n3-copia3 ";
        entrada = gsap.timeline()
          // las cards de antes suben y pasan a segundo plano
          .to(s + "#n3-tarjeta3", { y: -270, scale: 0.94, opacity: 0.6, filter: "blur(2px)", duration: 1.1, ease: "power3.inOut" }, 0)
          .to(s + "#n3-copia #n3-tarjeta2", { y: "-=90", opacity: 0.35, duration: 1.1, ease: "power3.inOut" }, 0)
          // entra la card nueva desde abajo
          .to("#n3-tarjeta-usos", { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out" }, 0.4)
          .to("#n3u2-titulo", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
          .to(".n3u2-caja", { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.15, ease: "back.out(2)" }, "-=0.1")
          .to("#n3u2-linea", { scaleX: 1, duration: 0.8, ease: "power2.inOut" }, "<")
          .to(".n3u2-pct, .n3u2-nombre", { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" }, "-=0.4");

        // los porcentajes cuentan desde 0
        document.querySelectorAll(".n3u2-pct").forEach(function (e, i) {
          var c = { v: 0 }, n = +e.getAttribute("data-n");
          entrada.to(c, { v: n, duration: 1.2, ease: "power2.out",
            onUpdate: function () { e.textContent = "%" + Math.round(c.v); } }, "-=" + (1.1 - i * 0.1));
        });

        entrada.add(function () {
          bucles.push(gsap.to(s + "#n3-copia #n3-personaje2", { y: -20, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(".n3u2-caja", { y: -8, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.25 }));
          bucles.push(gsap.to("#n3u2-linea i", { scale: 1.4, opacity: 0.5, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4 }));
        });
        return entrada;
      },

      salir: detener
    },

    /* ============ Encuesta final: se vota arrastrando al personaje (como el juego de gatos y bicicletas) ============
       Mano derecha (roja, avanzar) → el personaje va a la izquierda: Sí.
       Mano izquierda (azul, volver) → el personaje va a la derecha: No.
       El voto lo guarda el contenedor (panel de la D: resumen y CSV). Después de votar, sigue solo. */
    (function () {
      var votado = false;
      var DESPLAZA = 560;   // cuánto se corre el personaje hasta quedar delante de la opción
      function tutorial() {
        var mano = document.getElementById("n3v-mano");
        // una vuelta por mano: aparece en el centro, arrastra al personaje un poco hacia su opción y vuelve
        function vuelta(tl, lado, dx, opcion) {
          tl.add(function () { mano.innerHTML = Manos.svg(lado, true, "100%"); })
            .set(mano, { x: -dx * 0.6, autoAlpha: 0 })
            .to(mano, { autoAlpha: 1, duration: 0.25 })
            .add(function () { document.querySelector(opcion).classList.add("brilla"); })
            .to(mano, { x: dx * 0.6, duration: 0.9, ease: "power2.inOut" })
            .to("#n3v-personaje", { x: dx * 0.35, rotation: dx > 0 ? 6 : -6, duration: 0.9, ease: "power2.inOut" }, "<")
            .to("#n3v-sombra-personaje", { x: dx * 0.35, duration: 0.9, ease: "power2.inOut" }, "<")
            .to(mano, { autoAlpha: 0, duration: 0.25 })
            .to("#n3v-personaje, #n3v-sombra-personaje", { x: 0, rotation: 0, duration: 0.6, ease: "power2.inOut" }, "<")
            .add(function () { document.querySelector(opcion).classList.remove("brilla"); });
        }
        var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
        vuelta(tl, "der", -DESPLAZA, "#n3v-si");   // la derecha (roja) se arrastra hacia la izquierda → Sí
        tl.to({}, { duration: 0.5 });
        vuelta(tl, "izq", DESPLAZA, "#n3v-no");    // la izquierda (azul) hacia la derecha → No
        return tl;
      }
      function votar(resp) {
        if (votado) return;
        votado = true;
        Infografia.votar("usa-ia-para-imagenes", resp);
        miVoto = resp;   // para marcar "Tu voto" en los resultados
        detener();
        document.querySelectorAll("#n3-encuesta .brilla").forEach(function (e) { e.classList.remove("brilla"); });
        var elegida = resp === "si" ? "#n3v-si" : "#n3v-no", otra = resp === "si" ? "#n3v-no" : "#n3v-si";
        var dx = resp === "si" ? -DESPLAZA : DESPLAZA;
        document.querySelector(elegida).classList.add("elegida");
        entrada = gsap.timeline()
          .to("#n3v-ayuda, #n3v-mano", { autoAlpha: 0, duration: 0.3 }, 0)
          // el personaje se va hasta la opción y se acomoda delante de ella
          .to("#n3v-personaje", { x: dx, y: -40, scale: 0.8, rotation: dx > 0 ? 8 : -8, duration: 0.7, ease: "power3.inOut" }, 0)
          .to("#n3v-sombra-personaje", { x: dx, scaleX: 0.7, duration: 0.7, ease: "power3.inOut" }, 0)
          .to("#n3v-personaje", { rotation: 0, duration: 0.3, ease: "back.out(2)" })
          .to(otra, { autoAlpha: 0.35, scale: 0.94, duration: 0.4 }, 0.3)
          .to(elegida, { scale: 1.05, duration: 0.5, ease: "back.out(2.5)" }, 0.5)
          .fromTo("#n3v-gracias", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" }, 0.7)
          .to("#n3v-personaje", { y: -90, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 }, 1)
          .add(function () { Infografia.avanzar(); }, "+=1.6");   // termina el núcleo
      }
      return {
        el: "#n3-encuesta",
        preparar: function () {
          var d = Infografia.direccion;
          votado = false;
          document.querySelectorAll("#n3-encuesta .elegida, #n3-encuesta .brilla").forEach(function (e) { e.classList.remove("elegida", "brilla"); });
          partidoEncuesta = partidoEncuesta || SplitText.create("#n3v-titulo", { type: "words" });
          gsap.set(partidoEncuesta.words, { autoAlpha: 0, y: 30 });
          gsap.set("#n3v-personaje", { autoAlpha: 0, scale: 0.85, x: 0, y: 40, rotation: 0, transformOrigin: "50% 100%" });
          gsap.set("#n3v-sombra-personaje", { autoAlpha: 0, x: 0, scaleX: 0.4 });
          gsap.set(".n3v-opcion", { autoAlpha: 0, scale: 0.8, x: function (i) { return (i ? 80 : -80) * d; } });
          gsap.set("#n3v-ayuda, #n3v-mano, #n3v-gracias", { autoAlpha: 0 });
        },
        entrar: function () {
          entrada = gsap.timeline()
            .to(partidoEncuesta.words, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.8)" })
            .to(".n3v-opcion", { autoAlpha: 1, scale: 1, x: 0, duration: 0.6, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.3")
            .to("#n3v-personaje", { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.6)" }, "-=0.4")
            .to("#n3v-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.7, ease: "power2.out" }, "<0.1")
            .to("#n3v-ayuda", { autoAlpha: 1, duration: 0.5 })
            .add(function () { bucles.push(tutorial()); });
          return entrada;
        },
        // los gestos votan (y no cambian de pantalla: la pantalla avanza sola después de votar)
        alSiguiente: function () { votar("si"); return true; },
        alAnterior: function () { votar("no"); return true; },
        salir: detener
      };
    })(),

    /* ============ Resultados de la encuesta (votos de todas las personas) ============
       Le pide los votos al contenedor; las barras crecen hasta su porcentaje y se marca "Tu voto". */
    (function () {
      var datos = { si: 0, no: 0 }, cuenta = { si: 0, no: 0, ps: 0, pn: 0, total: 0 };
      function pintar() {
        var q = function (s) { return document.querySelector(s); };
        q("#n3r-si .n3r-pct span").textContent = Math.round(cuenta.ps);
        q("#n3r-no .n3r-pct span").textContent = Math.round(cuenta.pn);
        q("#n3r-si .n3r-cant span").textContent = Math.round(cuenta.si);
        q("#n3r-no .n3r-cant span").textContent = Math.round(cuenta.no);
        q("#n3r-total").textContent = Math.round(cuenta.total);
        q("#n3r-si .n3r-barra").style.height = cuenta.ps + "%";
        q("#n3r-no .n3r-barra").style.height = cuenta.pn + "%";
      }
      return {
        el: "#n3-resultados",
        preparar: function () {
          var d = Infografia.direccion;
          cuenta.si = cuenta.no = cuenta.ps = cuenta.pn = cuenta.total = 0;
          pintar();
          document.getElementById("n3r-si").classList.toggle("mio", miVoto === "si");
          document.getElementById("n3r-no").classList.toggle("mio", miVoto === "no");
          Infografia.pedirVotos("usa-ia-para-imagenes", function (v) { datos = v; });
          partidoResultados = partidoResultados || SplitText.create("#n3r-titulo", { type: "words" });
          gsap.set(partidoResultados.words, { autoAlpha: 0, y: 30 });
          gsap.set("#n3r-sub", { autoAlpha: 0 });
          gsap.set("#n3r-tarjeta", { autoAlpha: 0, x: 80 * d });
          gsap.set(".n3r-col", { autoAlpha: 0, y: 30 });
          gsap.set(".n3r-tu", { scale: 0 });
          gsap.set("#n3r-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
          gsap.set("#n3r-sombra-personaje", { autoAlpha: 0, scaleX: 0.4 });
        },
        entrar: function () {
          entrada = gsap.timeline()
            .to(partidoResultados.words, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.8)" })
            .to("#n3r-sub", { autoAlpha: 1, duration: 0.5 }, "-=0.2")
            .to("#n3r-tarjeta", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.3")
            .to("#n3r-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.4)" }, "<")
            .to("#n3r-sombra-personaje", { autoAlpha: 1, scaleX: 1, duration: 0.8, ease: "power2.out" }, "<0.1")
            .to(".n3r-col", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.15, ease: "back.out(1.8)" }, "-=0.4")
            // las barras y los números crecen hasta los valores reales (los datos ya llegaron del contenedor)
            .add(function () {
              var total = datos.si + datos.no;
              gsap.to(cuenta, {
                si: datos.si, no: datos.no, total: total,
                ps: total ? datos.si / total * 100 : 0, pn: total ? datos.no / total * 100 : 0,
                duration: 1.6, ease: "power2.out", onUpdate: pintar
              });
            })
            .to(".n3r-col.mio .n3r-tu", { scale: 1, duration: 0.5, ease: "back.out(3)" }, "+=1.4")
            .add(function () {
              bucles.push(gsap.to("#n3r-personaje", { y: -14, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
              bucles.push(gsap.to("#n3r-sombra-personaje", { scaleX: 0.82, opacity: 0.6, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
              bucles.push(gsap.to(".n3r-col.mio .n3r-tu", { y: -6, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            });
          return entrada;
        },
        // desde los resultados no se vuelve a la encuesta (para no votar dos veces)
        alAnterior: function () { return true; },
        salir: detener
      };
    })(),

    /* ============ Final: llegaste al final ============ */
    {
      el: "#n3-final",
      preparar: function () {
        var d = Infografia.direccion;
        partidoFinal = partidoFinal || SplitText.create("#n3x-titulo", { type: "words" });
        gsap.set(partidoFinal.words, { autoAlpha: 0, y: 30 });
        gsap.set("#n3x-personaje", { autoAlpha: 0, scale: 0.6, y: 80, transformOrigin: "50% 100%" });
        gsap.set("#n3x-tarjeta", { autoAlpha: 0, y: 60, x: 40 * d });
      },
      entrar: function () {
        entrada = gsap.timeline()
          .to(partidoFinal.words, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "back.out(1.8)" })
          // el personaje aparece de un salto
          .to("#n3x-personaje", { autoAlpha: 1, scale: 1, y: 0, duration: 0.9, ease: "back.out(2)" }, "-=0.3")
          .to("#n3x-tarjeta", { autoAlpha: 1, y: 0, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
          .add(function () {
            // salta de alegría una y otra vez
            bucles.push(gsap.timeline({ repeat: -1, repeatDelay: 0.6 })
              .to("#n3x-personaje", { y: -40, duration: 0.35, ease: "power2.out" })
              .to("#n3x-personaje", { y: 0, duration: 0.35, ease: "power2.in" })
              .to("#n3x-personaje", { scaleY: 0.95, scaleX: 1.04, duration: 0.12, yoyo: true, repeat: 1 }));
            bucles.push(gsap.to("#n3x-tarjeta", { y: -8, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        return entrada;
      },
      salir: detener
    }

  ], { transicion: "deslizar", duracion: 0.8,
    // pantallas que pasan solas (segundos de lectura después de que termina la entrada)
    auto: { "#n3-intro": 7, "#n3-modelos": 6, "#n3-cifras": 6, "#n3-usos": 8, "#n3-evolucion": 6, "#p4": 7,
            "#n3-dif1": 5, "#n3-dif2": 5, "#n3-dif3": 6, "#n3-practica": 4, "#n3-cierre": 5, "#n3-resultados": 10, "#n3-final": 10 } });
}

// Esperamos a que carguen las tipografías para que SplitText mida bien
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(iniciar);
