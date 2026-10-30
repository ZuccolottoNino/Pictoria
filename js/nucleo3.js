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
  Infografia.presentacion([

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

          /* ============ Pantalla 4: ¿Qué sos ahora? ============ */
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
    }

  ], { transicion: "deslizar", duracion: 0.8 });
}

// Esperamos a que carguen las tipografías para que SplitText mida bien
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(iniciar);
