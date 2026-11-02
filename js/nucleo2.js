Infografia.escalar("#escenario", 1920, 1080);
FondoAero.iniciar("#fondo-aero");

var bucles = [];   // animaciones en bucle de la pantalla actual
function pararBucles() { bucles.forEach(function (t) { t.kill(); }); bucles = []; }

Infografia.presentacion([
  { el: "#p1" },
  { el: "#p2" },
  { el: "#p3" },

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
     Las cards aparecen de a una en el centro. Gesto de volver = Gatos (izquierda),
     gesto de avanzar = Bicicletas (derecha). Si va al lado correcto, la card vuela a su zona;
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
        .to("#j2c-mano", { autoAlpha: 1, duration: 0.25 })
        .to("#j2c-mano", { x: -420, rotation: -12, duration: 0.9, ease: "power2.inOut" })   // primero: izquierda = gato
        .add(function () { document.querySelector("#j2c-zona-gatos").classList.add("brilla"); }, "-=0.2")
        .to("#j2c-mano", { autoAlpha: 0, duration: 0.25 })
        .add(function () { document.querySelector("#j2c-zona-gatos").classList.remove("brilla"); })
        .set("#j2c-mano", { x: 0, rotation: 0 })
        .to("#j2c-mano", { autoAlpha: 1, duration: 0.25 }, "+=0.3")
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
      alAnterior: function () { if (termino) return false; clasificar("gato"); return true; },
      alSiguiente: function () { if (termino) return false; clasificar("bici"); return true; },
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

  /* ============ Juego 2.2: observá los peces y dibujá uno nuevo (js/juego-peces.js) ============ */
  ...JuegoPeces.pantallas()
], { transicion: "deslizar", duracion: 0.8 });
