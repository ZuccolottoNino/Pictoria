Infografia.escalar("#escenario", 1920, 1080);
FondoAero.iniciar("#fondo-aero");

var bucles = [];   // animaciones en bucle de la pantalla actual
function pararBucles() { bucles.forEach(function (t) { t.kill(); }); bucles = []; }

/* ---------- Redes antagónicas (dos pantallas con el mismo título) ----------
   Entre ellas el título queda quieto: sólo se va el resto de la pantalla que sale. */
var GAN = ["j2-gan", "j2-gan2", "j2-gan3"];
Infografia.transiciones.ganCambio = function (sale, entra, d, dir) {
  var resto = Array.prototype.filter.call(sale.children, function (e) { return !e.classList.contains("gan-titulo-caja"); });
  return gsap.timeline().to(resto, { autoAlpha: 0, x: -60 * dir, duration: 0.4, stagger: 0.05, ease: "power2.in" });
};
function transicionGAN(saliente) { return GAN.indexOf(saliente.id) >= 0 ? "ganCambio" : null; }
function tituloGAN(el, d) {   // si se viene de la otra pantalla de redes antagónicas, el título ya está
  var otra = GAN.filter(function (id) { var s = document.getElementById(id); return s !== el && !s.hidden; }).length > 0;
  gsap.set(el.querySelector(".gan-titulo-caja"), otra ? { autoAlpha: 1, x: 0 } : { autoAlpha: 0, x: 80 * d });
}

/* ---------- Línea de tiempo del Machine Learning (pantallas 2 y 3) ----------
   Las dos pantallas tienen el mismo título, caja, línea y personaje en el mismo lugar.
   Entre ellas no se mueve la pantalla: sólo se van las columnas viejas y entran las nuevas. */
var ML = ["p2", "p3"];
function otraML(el) {   // la pantalla de la línea de tiempo de la que se viene (todavía visible en preparar)
  for (var i = 0; i < ML.length; i++) {
    var s = document.getElementById(ML[i]);
    if (s !== el && !s.hidden) return s;
  }
  return null;
}
Infografia.transiciones.mlCambio = function (sale, entra, d, dir) {
  var cols = sale.querySelectorAll(".ml-col");
  return gsap.timeline()
    .to(cols, { autoAlpha: 0, x: -60 * dir, duration: 0.4, stagger: 0.06, ease: "power2.in" })
    .set(cols, { x: 0 });   // quedan ocultas pero en su lugar, para la próxima vez
};
function transicionML(saliente) { return ML.indexOf(saliente.id) >= 0 ? "mlCambio" : null; }
function prepararML(el, d) {
  var q = function (s) { return el.querySelectorAll(s); };
  var otra = otraML(el);
  el._sigue = !!otra;
  gsap.set(q(".ml-punto"), { scale: 0 });
  gsap.set(q(".ml-palo"), { scaleY: 0 });
  gsap.set(q(".ml-cabeza"), { autoAlpha: 0, y: -20 });
  gsap.set(q(".ml-card"), { autoAlpha: 0, y: 30 });
  gsap.set(q(".ml-foto"), { autoAlpha: 0, scale: 0.92 });
  gsap.set(q(".ml-col"), { autoAlpha: 1, x: 0 });
  if (otra) {   // título, caja, línea y personaje ya están: quedan como en la pantalla anterior
    gsap.set(q(".ml-titulo-caja, .ml-caja"), { autoAlpha: 1, x: 0 });
    gsap.set(q(".ml-linea-barra"), { scaleX: 1 });
    gsap.set(q(".ml-linea-punta"), { autoAlpha: 1, x: 0 });
    gsap.set(q(".ml-personaje"), { autoAlpha: 1, scale: 1, x: 0, transformOrigin: "50% 100%",
      y: gsap.getProperty(otra.querySelector(".ml-personaje"), "y") });
  } else {
    gsap.set(q(".ml-titulo-caja, .ml-caja"), { autoAlpha: 0, x: 80 * d });
    gsap.set(q(".ml-linea-barra"), { scaleX: 0 });
    gsap.set(q(".ml-linea-punta"), { autoAlpha: 0, x: -20 });
    gsap.set(q(".ml-personaje"), { autoAlpha: 0, scale: 0.85, x: -70 * d, y: 0, transformOrigin: "50% 100%" });
  }
}
function entrarML(el) {
  var q = function (s) { return el.querySelectorAll(s); };
  var tl = gsap.timeline(), inicio = 0.1;
  if (!el._sigue) {
    tl.to(q(".ml-titulo-caja"), { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
      .to(q(".ml-caja"), { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.45")
      .to(q(".ml-personaje"), { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.5")
      .to(q(".ml-linea-barra"), { scaleX: 1, duration: 1.6, ease: "power1.inOut" }, "-=0.4")
      .to(q(".ml-linea-punta"), { autoAlpha: 1, x: 0, duration: 0.3 }, "-=0.2");
    inicio = 1.7;   // cada hito aparece cuando la línea pasa por su año
  }
  q(".ml-col").forEach(function (col, i) {
    var c = function (s) { return col.querySelector(s); };
    tl.to(c(".ml-punto"), { scale: 1, duration: 0.4, ease: "back.out(3)" }, inicio + i * 0.5)
      .to(c(".ml-palo"), { scaleY: 1, duration: 0.25, ease: "power2.out" }, ">-0.1")
      .to(c(".ml-cabeza"), { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }, ">-0.05")
      .to(c(".ml-card"), { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, ">-0.15")
      .to(c(".ml-foto"), { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" }, ">-0.2");
  });
  return tl.add(function () {
    bucles.push(gsap.to(q(".ml-personaje"), { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
    bucles.push(gsap.to(q(".ml-punto"), { scale: 1.3, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 1,
      stagger: { each: 0.5, repeat: -1, repeatDelay: 1.5 } }));
  });
}

/* Recordatorio del gesto abajo a la derecha (js/pista.js). Las que pasan solas no lo muestran. */
var PISTA = {
  enseñar: ["#p2", "#p3"],                    // primeras pantallas manuales: aparece enseguida
  nunca: ["#j2-clasificar", "#j2-fin"],       // tienen sus propias indicaciones (el juego, insertar la memoria)
  dibujar: ["#j22-dibuja"]                    // juego de los peces: cartel de "Dibujá"
};
var AUTO2 = { "#p1": 13, "#j2-intro": 6, "#j22-observa": 6, "#j22-reconoce": 5 };   // información: mínimo 13 s; las del juego, más cortas

Infografia.presentacion(Pista.envolver([
  /* ============ Pantalla 1: bienvenida a la etapa 2 (Machine Learning) ============ */
  {
    el: "#p1",
    preparar: function () {
      var d = Infografia.direccion;
      gsap.set("#e2-titulo", { autoAlpha: 0, y: -30 });
      gsap.set("#e2-cabecera, #e2-cuerpo", { autoAlpha: 0, x: 80 * d });
      gsap.set("#e2-texto .linea", { autoAlpha: 0, x: 26 * d });
      gsap.set(".e2-burbuja", { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" });
      gsap.set(".e2-paso p", { autoAlpha: 0, y: 14 });
      gsap.set("#e2-flecha", { autoAlpha: 0, x: -16 });
      gsap.set("#e2-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, rotation: 0, transformOrigin: "50% 100%" });
    },
    entrar: function () {
      return gsap.timeline()
        .to("#e2-titulo", { autoAlpha: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" })
        .to("#e2-cabecera", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.3")
        .to("#e2-cuerpo", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "-=0.5")
        .to("#e2-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.5")
        .to("#e2-texto .linea", { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }, "-=0.5")
        // de las reglas a la experiencia
        .to("#e2-reglas .e2-burbuja", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, "+=0.1")
        .to("#e2-reglas p", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.3")
        .to("#e2-flecha", { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" })
        .to("#e2-experiencia .e2-burbuja", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" })
        .to("#e2-experiencia p", { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.3")
        .add(function () {
          bucles.push(gsap.to("#e2-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          // las burbujas laten de a una y la flecha empuja hacia la experiencia
          bucles.push(gsap.to(".e2-burbuja", { scale: 1.06, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.8 }));
          bucles.push(gsap.to("#e2-flecha", { x: 8, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
        });
    },
    salir: pararBucles
  },
  /* ============ Pantalla 2: línea de tiempo del Machine Learning ============
     La línea se dibuja y en cada año baja un hito: año → texto → foto. */
  {
    el: "#p2",
    transicion: transicionML,
    preparar: function (el) { prepararML(el, Infografia.direccion); },
    entrar: function (el) { return entrarML(el); },
    salir: pararBucles
  },
  /* ============ Pantalla 3: línea de tiempo, segunda parte (2012 y 2014) ============
     Viniendo de la pantalla 2 (o volviendo a ella) título, caja, línea y personaje quedan quietos:
     sólo se van las columnas viejas y entran las nuevas (ver transiciones.mlCambio). */
  {
    el: "#p3",
    transicion: transicionML,
    preparar: function (el) {
      var d = Infografia.direccion;
      prepararML(el, d);
    },
    entrar: function (el) { return entrarML(el); },
    salir: pararBucles
  },

  /* ============ Juego 2 · intro: dos tipos de datos (gatos y bicicletas) ============ */
  {
    el: "#j2-intro",
    preparar: function () {
      var d = Infografia.direccion;
      gsap.set("#j2i-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
      gsap.set("#j2i-panel", { autoAlpha: 0, x: 90 * d, scale: 0.97 });
      gsap.set("#j2i-texto", { autoAlpha: 0, y: 20 });
      gsap.set(".j2i-tipo .j2-etiqueta", { autoAlpha: 0, y: -14 });
      gsap.set(".j2i-tipo .j2-foto", { autoAlpha: 0, scale: 0.8, rotation: function (i) { return i ? 6 : -6; } });
    },
    entrar: function () {
      return gsap.timeline()
        .to("#j2i-panel", { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: "power3.out" })
        .to("#j2i-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.5")
        .to("#j2i-texto", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.5")
        .to(".j2i-tipo .j2-foto", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, stagger: 0.2, ease: "back.out(1.8)" }, "-=0.2")
        .to(".j2i-tipo .j2-etiqueta", { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.2, ease: "back.out(2)" }, "<0.2")
        .add(function () {
          bucles.push(gsap.to("#j2i-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(".j2i-tipo .j2-foto", { y: -8, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.6 }));
        });
    },
    salir: pararBucles
  },

  /* ============ Juego 2 · clasificar con gestos ============
     Las cards aparecen de a una en el centro. Gesto de AVANZAR = Gatos (izquierda),
     gesto de VOLVER = Bicicletas (derecha). Si va al lado correcto, la card vuela a su zona;
     si no, se sacude y vuelve. Al clasificar las 4, pasa sola a la siguiente pantalla. */
  (function () {
    var ZONA = { gato: { slot0: 130, borde: "#j2c-zona-gatos" }, bici: { slot0: 1270, borde: "#j2c-zona-bicis" } };
    var CARD = { left: 770, top: 300, lado: 380 }, MINI = 220, FILA_TOP = 400;
    var cards = [], actual = 0, ubicadas = { gato: 0, bici: 0 }, ocupado = false, termino = false, tutorial = null;

    function mostrarActual() {
      ocupado = true;
      document.querySelector("#j2c-contador span").textContent = actual + 1;
      gsap.fromTo(cards[actual], { autoAlpha: 0, scale: 0.6, y: 40 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.8)", onComplete: function () { ocupado = false; } });
    }

    function arrancarTutorial() {
      if (tutorial) return;
      gsap.set("#j2c-ayuda", { autoAlpha: 1 });
      tutorial = gsap.timeline({ repeat: -1, repeatDelay: 0.4 })
        .set("#j2c-mano", { x: 0, rotation: 0 })
        .add(function () { document.getElementById("j2c-mano").innerHTML = Manos.svg("der", false, "100%"); })   // mano derecha (roja)
        .to("#j2c-mano", { autoAlpha: 1, duration: 0.25 })
        .to("#j2c-mano", { x: -420, rotation: -12, duration: 0.9, ease: "power2.inOut" })   // primero: izquierda = gato
        .add(function () { document.querySelector("#j2c-zona-gatos").classList.add("brilla"); }, "-=0.2")
        .to("#j2c-mano", { autoAlpha: 0, duration: 0.25 })
        .add(function () { document.querySelector("#j2c-zona-gatos").classList.remove("brilla"); })
        .set("#j2c-mano", { x: 0, rotation: 0 })
        .add(function () { document.getElementById("j2c-mano").innerHTML = Manos.svg("izq", false, "100%"); }, "+=0.3")   // mano izquierda (azul)
        .to("#j2c-mano", { autoAlpha: 1, duration: 0.25 })
        .to("#j2c-mano", { x: 420, rotation: 12, duration: 0.9, ease: "power2.inOut" })     // después: derecha = bici
        .add(function () { document.querySelector("#j2c-zona-bicis").classList.add("brilla"); }, "-=0.2")
        .to("#j2c-mano", { autoAlpha: 0, duration: 0.25 })
        .add(function () { document.querySelector("#j2c-zona-bicis").classList.remove("brilla"); });
    }
    function pararTutorial() {
      if (tutorial) { tutorial.kill(); tutorial = null; }
      gsap.set("#j2c-mano", { autoAlpha: 0 });
      document.querySelectorAll(".j2c-zona").forEach(function (z) { z.classList.remove("brilla"); });
    }

    function clasificar(lado) {   // lado: "gato" (izquierda) o "bici" (derecha)
      if (ocupado || termino) return;
      var card = cards[actual], zona = document.querySelector(ZONA[lado].borde);
      pararTutorial();
      gsap.to("#j2c-ayuda", { autoAlpha: 0, duration: 0.2 });
      ocupado = true;

      if (card.getAttribute("data-tipo") !== lado) {
        // equivocado: la card se sacude hacia ese lado y vuelve; la zona se marca en rojo
        zona.classList.add("mal");
        gsap.timeline({ onComplete: function () { zona.classList.remove("mal"); ocupado = false; } })
          .to("#j2c-error", { autoAlpha: 1, duration: 0.2 }, 0)
          .to(card, { x: lado === "gato" ? -60 : 60, duration: 0.15, ease: "power2.out" }, 0)
          .to(card, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.35)" })
          .to("#j2c-error", { autoAlpha: 0, duration: 0.3 }, "+=0.6")
          .add(arrancarTutorial);   // vuelve a mostrar cómo es
        return;
      }

      // correcto: la card vuela achicándose a su lugar dentro de la zona
      var k = ubicadas[lado]++, escala = MINI / CARD.lado;
      var x = ZONA[lado].slot0 + k * (MINI + 40) - CARD.left, y = FILA_TOP - CARD.top;
      zona.classList.add("brilla");
      gsap.timeline({ onComplete: function () {
          zona.classList.remove("brilla");
          actual++;
          if (actual < cards.length) mostrarActual();
          else terminar();
        } })
        .to(zona.querySelector(".j2c-solta"), { autoAlpha: 0, duration: 0.2 }, 0)
        .to(card, { x: x, y: y, scale: escala, rotation: lado === "gato" ? -4 : 4, duration: 0.6, ease: "power3.inOut" }, 0)
        .to(card, { rotation: 0, duration: 0.3, ease: "back.out(2)" });
    }

    function terminar() {
      termino = true;
      gsap.timeline()
        .to("#j2c-bien", { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" })
        .to(cards, { y: "-=12", duration: 0.25, stagger: 0.08, ease: "power2.out", yoyo: true, repeat: 1 }, "<")
        .add(function () { Infografia.avanzar(); }, "+=1.6");   // siguiente pantalla
    }

    return {
      el: "#j2-clasificar",
      preparar: function () {
        cards = gsap.utils.shuffle(gsap.utils.toArray("#j2-clasificar .j2c-card"));   // cada vez en otro orden
        actual = 0; ubicadas = { gato: 0, bici: 0 }; ocupado = true; termino = false;
        pararTutorial();
        gsap.set(cards, { autoAlpha: 0, x: 0, y: 0, scale: 1, rotation: 0 });
        gsap.set(".j2c-solta", { autoAlpha: 1 });
        gsap.set("#j2c-ayuda, #j2c-mano, #j2c-error", { autoAlpha: 0 });
        gsap.set("#j2c-bien", { autoAlpha: 0, y: 20 });
        gsap.set("#j2c-titulo-caja", { autoAlpha: 0, y: -40 });
        gsap.set("#j2c-contador", { autoAlpha: 0 });
        gsap.set(".j2c-zona", { autoAlpha: 0, scale: 0.9 });
      },
      entrar: function () {
        return gsap.timeline()
          .to("#j2c-titulo-caja", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" })
          .to(".j2c-zona", { autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.3")
          .to("#j2c-contador", { autoAlpha: 1, duration: 0.4 })
          .add(mostrarActual)
          .add(arrancarTutorial, "+=0.5")
          .add(function () {
            bucles.push(gsap.to(".j2c-pildora", { y: -5, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4 }));
          });
      },
      // los gestos clasifican la card (no cambian de pantalla hasta terminar)
      // invertido a pedido: con la cámara, avanzar es deslizar la mano hacia la izquierda (→ Gatos)
      alSiguiente: function () { if (termino) return false; clasificar("gato"); return true; },
      alAnterior: function () { if (termino) return false; clasificar("bici"); return true; },
      salir: function () { pararBucles(); pararTutorial(); }
    };
  })(),

  /* ============ Juego 2 · explicación: así aprende la computadora ============ */
  {
    el: "#j2-explica",
    preparar: function () {
      var d = Infografia.direccion;
      gsap.set("#j2e-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
      gsap.set("#j2e-panel", { autoAlpha: 0, x: 90 * d, scale: 0.97 });
      gsap.set("#j2e-titulo, #j2e-texto", { autoAlpha: 0, y: 20 });
      gsap.set(".j2e-paso", { autoAlpha: 0, scale: 0.7, y: 30 });
      gsap.set(".j2e-flecha", { autoAlpha: 0, x: -20 });
    },
    entrar: function () {
      return gsap.timeline()
        .to("#j2e-panel", { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: "power3.out" })
        .to("#j2e-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.5")
        .to("#j2e-titulo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.8)" }, "-=0.5")
        .to("#j2e-texto", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.2")
        // los 3 pasos del machine learning, uno tras otro, unidos por flechas
        .to(".j2e-paso", { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.45, ease: "back.out(2)" }, "+=0.2")
        .to(".j2e-flecha", { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.45, ease: "power2.out" }, "<0.3")
        .add(function () {
          bucles.push(gsap.to("#j2e-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          // un brillo recorre los pasos en orden: ejemplos → patrones → reconoce
          bucles.push(gsap.to(".j2e-icono", { scale: 1.12, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: 1,
            stagger: { each: 0.5, repeat: -1, repeatDelay: 1.2 } }));
          bucles.push(gsap.to(".j2e-flecha", { x: 8, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
        });
    },
    salir: pararBucles
  },

  /* ============ Redes antagónicas (GANs): analizaste miles de imágenes ============
     Se dibuja la línea hasta 2014 y los gatos van apareciendo de a uno, en desorden. */
  {
    el: "#j2-gan",
    transicion: transicionGAN,
    preparar: function (el) {
      var d = Infografia.direccion;
      tituloGAN(el, d);
      gsap.set("#gan-caja", { autoAlpha: 0, x: 80 * d });
      gsap.set("#gan-linea .ml-linea-barra", { scaleX: 0 });
      gsap.set("#gan-linea .ml-linea-punta", { autoAlpha: 0, x: -20 });
      gsap.set("#gan-hito .ml-punto", { scale: 0 });
      gsap.set("#gan-hito .ml-palo", { scaleY: 0 });
      gsap.set("#gan-hito .ml-cabeza", { autoAlpha: 0, y: -20 });
      gsap.set("#gan-galeria", { autoAlpha: 0, y: 30 });
      gsap.set(".gan-gato", { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 80%" });
      gsap.set("#gan-globo", { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 100%" });
      gsap.set("#gan-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
    },
    entrar: function () {
      return gsap.timeline()
        .to("#gan-titulo-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
        .to("#gan-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, 0.25)
        .to("#gan-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.5")
        .to("#gan-linea .ml-linea-barra", { scaleX: 1, duration: 1.2, ease: "power1.inOut" }, "-=0.4")
        .to("#gan-linea .ml-linea-punta", { autoAlpha: 1, x: 0, duration: 0.3 }, "-=0.2")
        .to("#gan-hito .ml-punto", { scale: 1, duration: 0.4, ease: "back.out(3)" }, "-=1")
        .to("#gan-hito .ml-palo", { scaleY: 1, duration: 0.25, ease: "power2.out" }, ">-0.1")
        .to("#gan-hito .ml-cabeza", { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }, ">-0.05")
        .to("#gan-galeria", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" })
        // los gatos aparecen en desorden, como si los fuera "analizando" de a uno
        .to(".gan-gato", { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)", stagger: { each: 0.12, from: "random" } })
        .to("#gan-globo", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "-=0.8")
        .add(function () {
          bucles.push(gsap.to("#gan-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(".gan-gato", { y: -8, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1,
            stagger: { each: 0.2, from: "random" } }));
        });
    },
    salir: pararBucles
  },

  /* ============ Redes antagónicas · estructura interna de una imagen ============
     Las partes del gato aparecen de a una debajo de su descripción. */
  {
    el: "#j2-gan2",
    transicion: transicionGAN,
    preparar: function (el) {
      var d = Infografia.direccion;
      tituloGAN(el, d);
      gsap.set("#gan2-caja", { autoAlpha: 0, x: 80 * d });
      gsap.set(".gan2-cabeza", { autoAlpha: 0, y: -20 });
      gsap.set("#gan2-galeria", { autoAlpha: 0, y: 30 });
      gsap.set(".gan2-parte", { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 60%" });
      gsap.set("#gan2-globo", { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 100%" });
      gsap.set("#gan2-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
    },
    entrar: function () {
      var tl = gsap.timeline()
        .to("#gan2-titulo-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
        .to("#gan2-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, 0.25)
        .to("#gan2-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, 0.35)
        .to("#gan2-galeria", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.7);
      // cabeza, torso y cola: primero su descripción y después la parte
      document.querySelectorAll(".gan2-cabeza").forEach(function (c, i) {
        tl.to(c, { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }, 1 + i * 0.6)
          .to(document.querySelectorAll(".gan2-parte")[i], { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(2)" }, ">-0.1");
      });
      return tl
        .to("#gan2-globo", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "-=0.2")
        .add(function () {
          bucles.push(gsap.to("#gan2-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to(".gan2-parte", { y: -10, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.35 }));
        });
    },
    salir: pararBucles
  },

  /* ============ Redes antagónicas · ahora podés… ============
     Izquierda: la cara, el cuerpo y la cola llegan desde lados distintos y se combinan en un gato.
     Derecha: al gato le falta la cola: sólo está la guía punteada de lo que hay que reconstruir. */
  {
    el: "#j2-gan3",
    transicion: transicionGAN,
    preparar: function (el) {
      var d = Infografia.direccion;
      tituloGAN(el, d);
      gsap.set("#gan3-caja", { autoAlpha: 0, x: 80 * d });
      gsap.set(".gan3-cabeza", { autoAlpha: 0, y: -20 });
      gsap.set("#gan3-galeria", { autoAlpha: 0, y: 30 });
      gsap.set("#gan3-combina .g3-cara", { autoAlpha: 0, x: -160, y: -60, rotation: -20 });
      gsap.set("#gan3-combina .g3-cuerpo", { autoAlpha: 0, y: 140 });
      gsap.set("#gan3-combina .g3-cola", { autoAlpha: 0, x: 160, rotation: 25 });
      gsap.set("#gan3-reconstruye > *", { autoAlpha: 0 });
      gsap.set("#gan3-globo", { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 100%" });
      gsap.set("#gan3-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
    },
    entrar: function () {
      return gsap.timeline()
        .to("#gan3-titulo-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" })
        .to("#gan3-caja", { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, 0.25)
        .to("#gan3-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, 0.35)
        .to("#gan3-globo", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.8)
        .to("#gan3-galeria", { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.7)
        // combinar patrones: las tres partes se juntan
        .to(".gan3-cabeza", { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(1.8)" }, 1.1)
        .to("#gan3-combina .g3-cuerpo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.6)" }, 1.4)
        .to("#gan3-combina .g3-cara", { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.6)" }, 1.6)
        .to("#gan3-combina .g3-cola", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.6, ease: "back.out(1.6)" }, 1.8)
        // reconstruir: aparece el gato sin cola y la guía punteada
        .to("#gan3-reconstruye .g3-cuerpo, #gan3-reconstruye .g3-cara", { autoAlpha: 1, duration: 0.5 }, 1.6)
        .to("#gan3-reconstruye .g3-cola-guia", { autoAlpha: 1, duration: 0.5 }, 2.1)
        .add(function () {
          bucles.push(gsap.to("#gan3-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          // la cola que falta queda sólo como guía punteada, que late suave
          bucles.push(gsap.to("#gan3-reconstruye .g3-cola-guia", { opacity: 0.45, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to("#gan3-combina", { y: -8, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 }));
        });
    },
    salir: pararBucles
  },

  /* ============ Juego 2.2: observá los peces y dibujá uno nuevo (js/juego-peces.js) ============ */
  ...JuegoPeces.pantallas(),

  /* ============ Fin del núcleo 2: insertar la memoria TRES ============
     La memoria (tecla del núcleo 3) arranca el núcleo 3 directamente desde el contenedor. */
  {
    el: "#j2-fin",
    preparar: function () {
      var d = Infografia.direccion;
      gsap.set("#j2f-personaje", { autoAlpha: 0, scale: 0.85, x: -70 * d, transformOrigin: "50% 100%" });
      gsap.set("#j2f-panel", { autoAlpha: 0, x: 90 * d, scale: 0.97 });
      gsap.set("#j2f-titulo", { autoAlpha: 0, y: -20 });
      gsap.set("#j2f-memoria", { autoAlpha: 0, scale: 0.85 });
      gsap.set("#j2f-flecha", { autoAlpha: 0, y: -20 });
    },
    entrar: function () {
      return gsap.timeline()
        .to("#j2f-panel", { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: "power3.out" })
        .to("#j2f-personaje", { autoAlpha: 1, scale: 1, x: 0, duration: 0.9, ease: "back.out(1.5)" }, "-=0.5")
        .to("#j2f-titulo", { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.8)" }, "-=0.5")
        .to("#j2f-memoria", { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, "-=0.2")
        .to("#j2f-flecha", { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" })
        .add(function () {
          bucles.push(gsap.to("#j2f-personaje", { y: -16, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          // "TRES" late y la flecha señala hacia abajo, hacia la ranura
          bucles.push(gsap.to("#j2f-memoria b", { opacity: 0.4, duration: 0.6, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.3 }));
          bucles.push(gsap.to("#j2f-flecha", { y: 16, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 }));
        });
    },
    salir: pararBucles
  }
], Object.assign({ auto: AUTO2 }, PISTA)), { transicion: "deslizar", duracion: 0.8,
  // pantallas que pasan solas (segundos de lectura después de que termina la entrada)
  auto: AUTO2 });
