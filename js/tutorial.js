/* tutorial.js: tutorial de los gestos (boceto).
   Una persona gris vista DE FRENTE, como un espejo: su derecha queda a la izquierda de la pantalla.
   Mano derecha = roja = avanzar · mano izquierda = azul = volver.
   Práctica: primero un movimiento bien hecho, después 5 más; recién ahí pasa a la otra mano. */
Infografia.escalar("#escenario", 1920, 1080);

var ROJO = "#FF4554", AZUL = "#00C3E3";
var REPETICIONES = 5;
var SEG_RELOJ = 9;   // segundos de la pantalla del relojito (el de muestra y el de verdad)

/* ---------- La persona ----------
   viewBox 620x880. Hombros en (220,300) derecho y (400,300) izquierdo (de frente: su derecha queda a la izquierda de la pantalla).
   Cada brazo es un grupo que gira desde el hombro: 0° = colgando; la derecha se abre con grados positivos, la izquierda con negativos. */
var HOMBRO = { der: [220, 300], izq: [400, 300] };
function persona(cont) {
  var gris = "#A9AFBA", oscuro = "#8E95A2";
  function brazo(lado, color) {
    var h = HOMBRO[lado];
    return '<g class="brazo-' + lado + '">' +
      '<line x1="' + h[0] + '" y1="' + h[1] + '" x2="' + h[0] + '" y2="' + (h[1] + 230) + '" stroke="' + gris + '" stroke-width="52" stroke-linecap="round"/>' +
      '<circle class="mano-' + lado + '" cx="' + h[0] + '" cy="' + (h[1] + 262) + '" r="40" fill="' + color + '" filter="url(#brillo)"/></g>';
  }
  cont.innerHTML =
    '<svg viewBox="0 0 620 880">' +
    '<defs><filter id="brillo" x="-80%" y="-80%" width="260%" height="260%">' +
    '<feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    '<ellipse cx="310" cy="850" rx="190" ry="22" fill="rgba(0,0,0,.08)"/>' +
    // piernas
    '<rect x="232" y="540" width="66" height="300" rx="33" fill="' + oscuro + '"/>' +
    '<rect x="322" y="540" width="66" height="300" rx="33" fill="' + oscuro + '"/>' +
    // torso y cabeza (sin cara)
    '<rect x="200" y="262" width="220" height="320" rx="80" fill="' + gris + '"/>' +
    '<circle cx="310" cy="180" r="78" fill="' + gris + '"/>' +
    brazo("der", ROJO) + brazo("izq", AZUL) +
    // estela del movimiento (se ve sólo en la práctica), encima de todo
    '<path class="estela" d="" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 28" opacity="0"/>' +
    '</svg>';
  var svg = cont.querySelector("svg");
  return {
    svg: svg,
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
      estado.textContent = "Hacé el movimiento como la persona de la izquierda.";
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

/* ---------- Pantallas ---------- */
Infografia.presentacion([
  // Inicio: los personajes de los núcleos "viven" hasta que alguien hace el gesto (provisorio hasta la animación)
  { el: "#t-inicio",
    preparar: function () {
      gsap.set(".ti-pj", { autoAlpha: 0, y: 60 });
      gsap.set("#ti-texto > *, #ti-empezar", { autoAlpha: 0, y: 20 });
    },
    entrar: function () {
      var pj = document.querySelectorAll(".ti-pj");
      bucles.push(gsap.to(pj[0], { rotation: -4, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
      bucles.push(gsap.to(pj[1], { y: -24, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1 }));
      bucles.push(gsap.to(pj[2], { y: -14, rotation: 3, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%", delay: 1 }));
      bucles.push(gsap.to("#ti-empezar .mano-icono", { x: -14, duration: 0.45, ease: "power2.inOut", yoyo: true, repeat: -1, repeatDelay: 0.4, delay: 1.6 }));
      return gsap.timeline()
        .to("#ti-texto > *", { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.15, ease: "back.out(1.6)" })
        .to(pj, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "back.out(1.6)" }, "-=0.3")
        .to("#ti-empezar", { autoAlpha: 1, y: 0, duration: 0.5 });
    },
    // en el inicio no se puede volver para atrás
    alAnterior: function () { return true; },
    salir: pararBucles },
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
      tl.from(p.svg, { y: 60, opacity: 0, duration: 0.7, ease: "power3.out" })
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
    alAnterior: function () { Infografia.irA("#t-reloj"); return true; },
    salir: pararBucles }
], { transicion: "deslizar", duracion: 0.8,
  // pantallas que pasan solas (segundos de lectura después de que termina la entrada)
  auto: { "#t1": 5, "#t2": 4, "#t3": 4, "#t-ok": 8, "#t-reloj": SEG_RELOJ, "#t6": 8 } });
