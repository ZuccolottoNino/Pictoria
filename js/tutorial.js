/* tutorial.js: tutorial de los gestos.
   Empieza en espera; cuando la cámara ve una cara SEG_VER segundos seguidos se arma el personaje del visitante
   (caraUsuario, js/personaje.js) y ese personaje enseña los gestos, con las manos flotando a los costados.
   Visto DE FRENTE, como un espejo: su derecha queda a la izquierda de la pantalla.
   Mano derecha = roja = avanzar · mano izquierda = azul = volver.
   Práctica: primero un movimiento bien hecho, después 5 más; recién ahí pasa a la otra mano. */
Infografia.escalar("#escenario", 1920, 1080);

var ROJO = "#FF4554", AZUL = "#00C3E3";
var REPETICIONES = 5;
var SEG_RELOJ = 9;   // segundos de la pantalla del relojito (el de muestra y el de verdad)
var SEG_VER = 5;     // segundos seguidos viendo una cara para arrancar
var SEG_IDO = 10;    // segundos sin nadie frente a la cámara para volver a la espera
var RUTA_PJ = "../assets/carausuario/";

/* ---------- El personaje del visitante, con manos flotantes ----------
   viewBox 620x880. El personaje (canvas) va de fondo; encima, en un svg, sus dos manos flotan a los costados.
   Cada mano gira alrededor de un "hombro" invisible: 0° = abajo; la derecha se abre con grados positivos,
   la izquierda con negativos. (Cuando haya brazos separados, la línea invisible de cada brazo pasa a ser el brazo.) */
var HOMBRO = { der: [95, 430], izq: [525, 430] };
var rasgos = Personaje.PREDETERMINADO;   // se reemplaza con los de la cámara al armar el personaje
var ALTO_PJ = 760;
function dibujarPersonaje(canvas) {
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  Personaje.dibujar(ctx, rasgos, { x: (620 - Personaje.ancho(ALTO_PJ)) / 2, y: 60, alto: ALTO_PJ });
}
function persona(cont) {
  function brazo(lado, color) {
    var h = HOMBRO[lado];
    return '<g class="brazo-' + lado + '">' +
      '<line x1="' + h[0] + '" y1="' + h[1] + '" x2="' + h[0] + '" y2="' + (h[1] + 230) + '" stroke="none"/>' +
      '<circle class="mano-' + lado + '" cx="' + h[0] + '" cy="' + (h[1] + 262) + '" r="40" fill="' + color + '" filter="url(#brillo)"/></g>';
  }
  cont.innerHTML =
    '<canvas width="620" height="880"></canvas>' +
    '<svg viewBox="0 0 620 880" style="overflow:visible">' +
    '<defs><filter id="brillo" x="-80%" y="-80%" width="260%" height="260%">' +
    '<feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    '<ellipse cx="310" cy="850" rx="190" ry="22" fill="rgba(0,0,0,.08)"/>' +
    brazo("der", ROJO) + brazo("izq", AZUL) +
    // estela del movimiento (se ve sólo en la práctica), encima de todo
    '<path class="estela" d="" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 28" opacity="0"/>' +
    '</svg>';
  var svg = cont.querySelector("svg");
  return {
    svg: svg,
    canvas: cont.querySelector("canvas"),
    brazo: function (lado) { return svg.querySelector(".brazo-" + lado); },
    mano: function (lado) { return svg.querySelector(".mano-" + lado); },
    estela: svg.querySelector(".estela")
  };
}

// gira un brazo desde su hombro
function girar(p, lado, grados, extra) {
  var h = HOMBRO[lado];
  return Object.assign({ rotation: grados, svgOrigin: h[0] + " " + h[1] }, extra || {});
}

var figuras = {};
["t1", "t2", "t3", "t4", "t5", "t6"].forEach(function (id) {
  figuras[id] = persona(document.getElementById(id + "-fig"));
});
// lleva la mano de un brazo a (x, y) estirando la línea desde el hombro (para el gesto de arrastrar)
function llevarMano(p, lado, x, y, extra) {
  var g = p.brazo(lado), tl = gsap.timeline();
  tl.to(g.querySelector("line"), Object.assign({ attr: { x2: x, y2: y } }, extra || {}), 0)
    .to(p.mano(lado), Object.assign({ attr: { cx: x, cy: y } }, extra || {}), 0);
  return tl;
}
function reposo(p) {
  ["der", "izq"].forEach(function (lado) {
    var h = HOMBRO[lado];
    gsap.set(p.brazo(lado).querySelector("line"), { attr: { x2: h[0], y2: h[1] + 230 } });
    gsap.set(p.mano(lado), { attr: { cx: h[0], cy: h[1] + 262 } });
  });
  gsap.set(p.brazo("der"), girar(p, "der", 14));
  gsap.set(p.brazo("izq"), girar(p, "izq", -14));
}
Object.keys(figuras).forEach(function (k) { reposo(figuras[k]); });
function redibujarFiguras() { Object.keys(figuras).forEach(function (k) { dibujarPersonaje(figuras[k].canvas); }); }
Personaje.cargar(RUTA_PJ).then(redibujarFiguras);
Manos.llenar(document.getElementById("escenario"));   // la mano del cartel de ejemplo

/* ---------- Animaciones ---------- */
var bucles = [];
function pararBucles() { bucles.forEach(function (t) { t.kill(); }); bucles = []; }

function entradaTexto(el) {
  return gsap.from(el.querySelectorAll(".t-texto > *"), { y: 40, opacity: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" });
}

// levanta una mano y la deja saludando, con un pulso en la mano
function levantar(p, lado) {
  var s = lado === "der" ? 1 : -1;
  var tl = gsap.timeline();
  tl.to(p.brazo(lado), girar(p, lado, s * 160, { duration: 0.9, ease: "back.out(1.6)" }));
  var b = gsap.timeline({ repeat: -1, yoyo: true, delay: 0.9 });
  b.to(p.brazo(lado), girar(p, lado, s * 140, { duration: 0.5, ease: "sine.inOut" }));
  var pulso = gsap.to(p.mano(lado), { attr: { r: 48 }, duration: 0.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.9 });
  bucles.push(b, tl, pulso);
  return tl;
}

// demostración del gesto: la mano sube al costado y se arrastra en línea recta, a la misma altura,
// hasta el centro del cuerpo
function demo(p, lado) {
  var s = lado === "der" ? -1 : 1, h = HOMBRO[lado], color = lado === "der" ? ROJO : AZUL;
  var y = h[1] + 90, xCostado = h[0] + s * 230, xCentro = 310;
  p.estela.setAttribute("d", "M" + xCostado + " " + y + " L" + xCentro + " " + y);
  p.estela.setAttribute("stroke", color);
  var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });
  tl.set(p.estela, { opacity: 0 })
    .to(p.brazo(lado), girar(p, lado, 0, { duration: 0.3 }))
    .add(llevarMano(p, lado, xCostado, y, { duration: 0.6, ease: "power2.out" }), "<")
    .to(p.estela, { opacity: 0.8, duration: 0.2 })
    .add(llevarMano(p, lado, xCentro, y, { duration: 0.7, ease: "power2.inOut" }))
    .to(p.estela, { opacity: 0, duration: 0.4 }, "+=0.2")
    .add(llevarMano(p, lado, h[0], h[1] + 262, { duration: 0.5, ease: "power1.inOut" }), "<");
  bucles.push(tl);
  return tl;
}

/* ---------- Práctica de una mano ---------- */
function practica(id, lado) {
  var el, estado, puntos, fin = false, intentos = 0, hecho = false;
  var nombre = lado === "der" ? "derecha (roja)" : "izquierda (azul)";
  var otra = lado === "der" ? "izquierda" : "derecha";
  function decir(txt, clase) {
    estado.className = "t-estado" + (clase ? " " + clase : "");
    estado.textContent = txt;
    gsap.fromTo(estado, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: "back.out(2)", transformOrigin: "left center" });
  }
  function bien() {
    if (fin) return;
    var p = figuras[id];
    gsap.fromTo(p.mano(lado), { attr: { r: 64 } }, { attr: { r: 40 }, duration: 0.5, ease: "power2.out" });
    if (!hecho) {   // primer movimiento bien hecho
      hecho = true;
      decir("¡Muy bien! Ahora probalo " + REPETICIONES + " veces más.", "bien");
      gsap.to(puntos, { opacity: 1, duration: 0.4 });
      return;
    }
    intentos++;
    var i = puntos.children[intentos - 1];
    i.classList.add("ok");
    gsap.fromTo(i, { scale: 1.5 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
    if (intentos >= REPETICIONES) {
      fin = true;
      decir(lado === "der" ? "¡Perfecto! Ahora la otra mano." : "¡Perfecto! Ya sabés usar las dos.", "bien");
      gsap.delayedCall(1.6, function () { Infografia.avanzar(); });
    } else {
      decir("¡Bien! Te faltan " + (REPETICIONES - intentos) + ".", "bien");
    }
  }
  function mal() {
    if (fin) return;
    decir("Esa es la mano " + otra + ". Usá la " + nombre + ".", "mal");
  }
  return {
    el: "#" + id,
    preparar: function (e) {
      el = e; estado = e.querySelector(".t-estado"); puntos = e.querySelector(".t-puntos");
      fin = false; hecho = false; intentos = 0;
      estado.className = "t-estado";
      estado.textContent = "Hacé el movimiento como tu IA de la izquierda.";
      gsap.set(puntos, { opacity: 0 });
      Array.prototype.forEach.call(puntos.children, function (i) { i.classList.remove("ok"); });
      reposo(figuras[id]);
    },
    entrar: function (e) { demo(figuras[id], lado); return entradaTexto(e); },
    salir: pararBucles,
    // la mano correcta cuenta; la otra muestra un aviso. En ambos casos no se cambia de pantalla.
    alSiguiente: function () { if (lado === "der") bien(); else mal(); return true; },
    alAnterior:  function () { if (lado === "izq") bien(); else mal(); return true; }
  };
}

/* ---------- Cámara: la cara del visitante (sensado/cara.py, por el mismo WebSocket que los gestos) ----------
   cara:{...} mientras hay alguien; cara:nadie cuando se va. */
var muestras = [];            // últimos rasgos recibidos (para armar el personaje con varios cuadros, no uno solo)
var viendoDesde = 0;          // desde cuándo se ve una cara sin cortes (0 = nadie)
var enInicio = true;          // en la espera o armando el personaje (ahí no se vuelve a la espera)
var vueltaAEspera = null;
function recibirCara(datos) {
  if (datos === "nadie") {
    viendoDesde = 0;
    document.getElementById("t-datos").textContent = "cámara · nadie";
    // si se fue en el medio del tutorial, después de un rato se vuelve a la espera para el próximo visitante
    if (!enInicio && !vueltaAEspera) vueltaAEspera = gsap.delayedCall(SEG_IDO, function () {
      vueltaAEspera = null; Infografia.irA("#t-espera");
    });
    return;
  }
  if (vueltaAEspera) { vueltaAEspera.kill(); vueltaAEspera = null; }
  try { muestras.push(JSON.parse(datos)); } catch (e) { return; }
  var m = muestras[muestras.length - 1];   // para calibrar: lo que detecta la cámara, abajo a la izquierda
  document.getElementById("t-datos").textContent = "cámara · piel " + m.piel + " · pelo " + m.pelo +
    (m.pelado ? " (pelado)" : "") + " · sonrisa " + m.sonrisa + " · ojos " + m.ojos;
  muestras = muestras.slice(-40);
  if (!viendoDesde) viendoDesde = Date.now();
}
var camara = false;            // hay sensado conectado (si no, con el teclado se puede saltear la espera)
(function conectar() {
  var ws;
  try { ws = new WebSocket("ws://localhost:9980"); } catch (e) { setTimeout(conectar, 3000); return; }
  ws.onopen = function () { camara = true; };
  ws.onmessage = function (e) {
    if (typeof e.data === "string" && e.data.indexOf("cara:") === 0) recibirCara(e.data.slice(5));
  };
  ws.onclose = function () { camara = false; setTimeout(conectar, 3000); };
})();

/* ---------- Pantallas ---------- */
Infografia.presentacion([
  // A. Espera: los personajes de los núcleos "viven" hasta que alguien se sienta y la cámara lo ve SEG_VER segundos.
  //    (Con el teclado, avanzar saltea la espera y arma el personaje con lo que haya, o el predeterminado.)
  (function () {
    var vigia = null;
    return {
      el: "#t-espera",
      preparar: function () {
        enInicio = true; muestras = []; viendoDesde = 0;
        gsap.set(".te-pj", { autoAlpha: 0, y: 60 });
        gsap.set("#te-texto h1", { autoAlpha: 0, y: -30 });
        gsap.set("#te-pide", { autoAlpha: 0 });
        gsap.set("#te-viendo", { autoAlpha: 0 });
      },
      entrar: function () {
        var tl = gsap.timeline()
          .to("#te-texto h1", { autoAlpha: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" })
          .to(".te-pj", { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.3")
          .to("#te-pide", { autoAlpha: 1, duration: 0.5 });
        // provisorio hasta el video: cada personaje "hace lo suyo"
        var pj = document.querySelectorAll(".te-pj");
        bucles.push(gsap.to(pj[0], { rotation: -4, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
        bucles.push(gsap.to(pj[1], { y: -24, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
        bucles.push(gsap.to(pj[2], { y: -14, rotation: 3, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
        // ¿hay alguien? el aro se llena mientras la cámara lo sigue viendo; si se va, vuelve a cero
        var aro = document.querySelector("#te-viendo .aro"), mostrando = false;
        vigia = setInterval(function () {
          var t = viendoDesde ? (Date.now() - viendoDesde) / 1000 : 0;
          if (t > 0 !== mostrando) {
            mostrando = t > 0;
            gsap.to("#te-viendo", { autoAlpha: mostrando ? 1 : 0, duration: 0.3 });
            gsap.to("#te-pide", { autoAlpha: mostrando ? 0 : 1, duration: 0.3 });
            gsap.to(pj, { y: mostrando ? -10 : 0, duration: 0.4 });
          }
          aro.setAttribute("stroke-dashoffset", (276.5 * (1 - Math.min(1, t / SEG_VER))).toFixed(1));
          if (t >= SEG_VER) { clearInterval(vigia); vigia = null; Infografia.avanzar(); }
        }, 100);
        return tl;
      },
      // con la cámara conectada sólo arranca al ver una cara (un gesto suelto no la saltea);
      // sin cámara, avanzar con el teclado arma el personaje predeterminado
      alSiguiente: function () { return camara; },
      alAnterior: function () { return true; },
      salir: function () { if (vigia) { clearInterval(vigia); vigia = null; } pararBucles(); }
    };
  })(),

  // B. Construcción: el personaje se arma capa por capa mientras una línea lo "escanea"; después arranca el tutorial
  (function () {
    var PASOS = ["Analizando tu cara", "Tu color de piel", "Tus ojos", "Tus cejas", "Tu pelo", "Tu sonrisa"];
    return {
      el: "#t-crea",
      preparar: function () {
        enInicio = true;
        rasgos = Personaje.desdeCamara(muestras.slice(-20));
        gsap.set("#tc-texto > *", { autoAlpha: 0, y: 30 });
        gsap.set("#tc-barra i", { scaleX: 0 });
        var c = document.getElementById("tc-lienzo");
        c.getContext("2d").clearRect(0, 0, c.width, c.height);
      },
      entrar: function () {
        var c = document.getElementById("tc-lienzo"), ctx = c.getContext("2d");
        var alto = 820, x = (c.width - Personaje.ancho(alto)) / 2, nivel = 0;
        function capas(n) {   // nunca vuelve atrás (por si las piezas terminan de cargar tarde)
          nivel = Math.max(nivel, n);
          ctx.clearRect(0, 0, c.width, c.height);
          Personaje.dibujar(ctx, rasgos, { x: x, y: 40, alto: alto, capas: nivel });
        }
        var tl = gsap.timeline();
        tl.to("#tc-texto > *", { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power3.out" })
          .add(function () { Personaje.cargar(RUTA_PJ).then(function () { capas(1); }); })
          .to("#tc-escaneo", { autoAlpha: 1, duration: 0.2 });
        // cada capa: la línea baja por el personaje y aparece la parte nueva
        PASOS.forEach(function (paso, i) {
          tl.add(function () { document.getElementById("tc-paso").textContent = paso; })
            .fromTo("#tc-escaneo", { y: 0 }, { y: 880, duration: 0.8, ease: "power1.inOut" })
            .add(function () { capas(i + 1); })
            .to("#tc-barra i", { scaleX: (i + 1) / PASOS.length, duration: 0.3 }, "<");
        });
        tl.to("#tc-escaneo", { autoAlpha: 0, duration: 0.3 })
          .add(function () {
            document.getElementById("tc-titulo").textContent = "¡Esta IA sos vos!";
            document.getElementById("tc-paso").textContent = "Ahora vamos a aprender juntos los movimientos";
            redibujarFiguras();   // el tutorial ya usa tu personaje
          })
          .fromTo("#tc-lienzo", { scale: 1 }, { scale: 1.05, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" })
          .add(function () { enInicio = false; Infografia.avanzar(); }, "+=1.8");
        return tl;
      },
      salir: function () { enInicio = false; pararBucles(); }
    };
  })(),


  // el relojito grande dura lo mismo que el de verdad y arranca a la vez (cuando termina la entrada)
  { el: "#t-reloj",
    preparar: function (e) {
      e.querySelector(".aro").setAttribute("stroke-dashoffset", 0);
      e.querySelector(".m-reloj span").textContent = SEG_RELOJ;
    },
    entrar: function (e) {
      var aro = e.querySelector(".aro"), num = e.querySelector(".m-reloj span"), t = { v: 0 };
      var entrada = entradaTexto(e);
      bucles.push(gsap.to(t, { v: 1, duration: SEG_RELOJ, ease: "none", delay: entrada.totalDuration(),
        onUpdate: function () {
          aro.setAttribute("stroke-dashoffset", (276.5 * t.v).toFixed(1));
          num.textContent = Math.ceil(SEG_RELOJ * (1 - t.v)) || "";
        } }));
      return entrada;
    },
    salir: pararBucles },
  { el: "#t1",
    preparar: function () { reposo(figuras.t1); },
    entrar: function (e) {
      var p = figuras.t1;
      var tl = gsap.timeline();
      tl.from([p.canvas, p.svg], { y: 60, opacity: 0, duration: 0.7, ease: "power3.out" })
        .add(entradaTexto(e), 0.2);
      // saluda con las dos manos
      bucles.push(gsap.timeline({ repeat: -1, yoyo: true, delay: 0.8 })
        .to(p.brazo("der"), girar(p, "der", 150, { duration: 0.7, ease: "sine.inOut" }), 0)
        .to(p.brazo("izq"), girar(p, "izq", -150, { duration: 0.7, ease: "sine.inOut" }), 0));
      return tl;
    },
    salir: pararBucles },
  { el: "#t2", preparar: function () { reposo(figuras.t2); },
    entrar: function (e) { levantar(figuras.t2, "der"); return entradaTexto(e); }, salir: pararBucles },
  { el: "#t3", preparar: function () { reposo(figuras.t3); },
    entrar: function (e) { levantar(figuras.t3, "izq"); return entradaTexto(e); }, salir: pararBucles },
  // los carteles de gesto detectado (derecha e izquierda): aparecen uno después del otro, en bucle
  { el: "#t-ok",
    entrar: function (e) {
      var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
      e.querySelectorAll(".m-ok").forEach(function (ok, i) {
        tl.fromTo(ok, { y: 80, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, i * 0.5)
          .fromTo(ok.querySelector(".m-ok-tilde"), { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, i * 0.5 + 0.35);
      });
      tl.to(e.querySelectorAll(".m-ok"), { y: 40, opacity: 0, duration: 0.35, ease: "power2.in", stagger: 0.1 }, "+=1.8");
      bucles.push(tl);
      return entradaTexto(e);
    },
    salir: pararBucles },
  practica("t4", "der"),
  practica("t5", "izq"),
  { el: "#t6",
    preparar: function () { reposo(figuras.t6); },
    entrar: function (e) {
      var p = figuras.t6;
      gsap.to(p.brazo("der"), girar(p, "der", 160, { duration: 0.8, ease: "back.out(1.6)" }));
      gsap.to(p.brazo("izq"), girar(p, "izq", -160, { duration: 0.8, ease: "back.out(1.6)", delay: 0.15 }));
      return entradaTexto(e);
    },
    // la izquierda acá reinicia el tutorial desde el principio
    alAnterior: function () { Infografia.irA("#t-reloj"); return true; },   // (el mismo personaje, sin volver a crearlo)
    salir: pararBucles }
], { transicion: "deslizar", duracion: 0.8,
  // pantallas que pasan solas (segundos de lectura después de que termina la entrada)
  auto: { "#t1": 5, "#t2": 4, "#t3": 4, "#t-ok": 8, "#t-reloj": SEG_RELOJ, "#t6": 8 } });
