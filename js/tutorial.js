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
var SEG_VER = 5;
var PRACTICA_INICIO = 1.5;   // segundos al entrar a una práctica en los que todavía no se cuentan gestos
var PRACTICA_PAUSA = 1.6;    // segundos mínimos entre dos gestos contados en la práctica     // segundos seguidos viendo una cara para arrancar
var SEG_IDO = 10;    // segundos sin nadie frente a la cámara para volver a la espera
var RUTA_PJ = "../assets/carausuario/";

/* ---------- El personaje del visitante (bebé) con sus brazos ----------
   viewBox 620x880. El cuerpo va en un canvas de fondo; encima, en un svg, los dos brazos (js/personaje.js → Personaje.brazo)
   giran enteros desde el hombro: 0° = colgando derecho; la derecha se abre con grados positivos, la izquierda con negativos.
   En la punta de cada brazo, un brillo del color de su mano (roja = derecha, azul = izquierda). */
// en el tutorial el personaje es siempre el mismo, blanco y sin rasgos del visitante (todavía no "nació");
// lo que detecta la cámara se guarda para los núcleos, donde sale del huevo con su cara
var rasgos = Personaje.enBlancoYNegro(Personaje.PREDETERMINADO);
var ALTO_PJ = 760;
var OP_PJ = { x: (620 - Personaje.ancho(ALTO_PJ)) / 2, y: 60, alto: ALTO_PJ, brazos: false };
var BRAZO = Personaje.brazo(rasgos, OP_PJ);    // medidas del brazo (el png entero, a escala)
var HOMBRO = BRAZO.hombros, LARGO = BRAZO.largo, R_MANO = 26;
var ARRIBA = 125;                              // brazo levantado (grados)
// la cabeza va en el canvas de atrás, los brazos en el medio y el cuerpo con la cara en el de adelante
function dibujarPersonaje(p) {
  [[p.fondo, "fondo"], [p.canvas, "frente"]].forEach(function (c) {
    var ctx = c[0].getContext("2d");
    ctx.clearRect(0, 0, c[0].width, c[0].height);
    Personaje.dibujar(ctx, rasgos, Object.assign({ parte: c[1] }, OP_PJ));
  });
}
/* Capas: canvas de la cabeza, svg de los brazos, canvas del cuerpo y la cara, svg de adelante.
   Dos svg iguales: el de atrás (debajo del cuerpo) tiene los brazos; el de adelante, los puntos de las manos y la estela.
   Los dos giran juntos (p.brazo devuelve el grupo de cada uno). */
function persona(cont) {
  function grupo(lado, dentro) { return '<g class="brazo-' + lado + '">' + dentro + '</g>'; }
  function brazo(lado) {
    var h = HOMBRO[lado], s = lado === "der" ? 1 : -1;
    return grupo(lado,
      '<g transform="translate(' + h[0] + ' ' + h[1] + ') scale(' + s + ' 1) rotate(' + (-BRAZO.inclinacion) + ')">' +
      '<image class="img-brazo" href="' + RUTA_PJ + BRAZO.src + '" filter="url(#piel-' + cont.id + ')" x="' + (-BRAZO.pivote[0]) + '" y="' + (-BRAZO.pivote[1]) +
      '" width="' + BRAZO.ancho + '" height="' + BRAZO.alto + '"/></g>');
  }
  // la mano: halo grande de su color + punto con borde blanco, bien visible sobre la piel
  function mano(lado, color) {
    var h = HOMBRO[lado];
    return grupo(lado,
      '<circle class="halo-' + lado + '" cx="' + h[0] + '" cy="' + (h[1] + LARGO) + '" r="' + (R_MANO * 2) + '" fill="' + color + '" opacity=".35" filter="url(#brillo-' + cont.id + ')"/>' +
      '<circle class="mano-' + lado + '" cx="' + h[0] + '" cy="' + (h[1] + LARGO) + '" r="' + R_MANO + '" fill="' + color + '" stroke="#fff" stroke-width="7"/>');
  }
  cont.innerHTML =
    '<canvas class="fondo" width="620" height="880"></canvas>' +
    '<svg class="atras" viewBox="0 0 620 880" style="overflow:visible">' +
    // el brazo toma el color de piel: lo blanco se tiñe y lo negro queda negro (multiplicar), con su misma transparencia
    '<defs><filter id="piel-' + cont.id + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
    '<feFlood class="color-piel" flood-color="' + rasgos.piel + '" result="c"/><feBlend in="SourceGraphic" in2="c" mode="multiply" result="m"/>' +
    '<feComposite in="m" in2="SourceGraphic" operator="in"/></filter></defs>' +
    '<ellipse cx="310" cy="850" rx="190" ry="22" fill="rgba(0,0,0,.08)"/>' +
    brazo("der") + brazo("izq") + '</svg>' +
    '<canvas class="frente" width="620" height="880"></canvas>' +
    '<svg class="adelante" viewBox="0 0 620 880" style="overflow:visible">' +
    '<defs><filter id="brillo-' + cont.id + '" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10"/></filter></defs>' +
    mano("der", ROJO) + mano("izq", AZUL) +
    // estela del movimiento (se ve sólo en la práctica), encima de todo
    '<path class="estela" d="" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="2 28" opacity="0"/>' +
    '</svg>';
  var atras = cont.querySelector("svg.atras"), svg = cont.querySelector("svg.adelante");
  return {
    svg: svg,
    atras: atras,
    fondo: cont.querySelector("canvas.fondo"),
    canvas: cont.querySelector("canvas.frente"),
    brazo: function (lado) { return cont.querySelectorAll(".brazo-" + lado); },
    mano: function (lado) { return svg.querySelector(".mano-" + lado); },
    estela: svg.querySelector(".estela")
  };
}

// gira un brazo entero desde su hombro
function girar(p, lado, grados, extra) {
  var h = HOMBRO[lado];
  return Object.assign({ rotation: grados, svgOrigin: h[0] + " " + h[1] }, extra || {});
}
// dónde queda la mano con el brazo girado tantos grados
function puntaBrazo(lado, grados) {
  var h = HOMBRO[lado], a = grados * Math.PI / 180;
  return [h[0] - LARGO * Math.sin(a), h[1] + LARGO * Math.cos(a)];
}

var figuras = {};
["t1", "t2", "t3", "t4", "t5", "t6"].forEach(function (id) {
  figuras[id] = persona(document.getElementById(id + "-fig"));
});
function reposo(p) {
  gsap.set(p.brazo("der"), girar(p, "der", BRAZO.reposo));
  gsap.set(p.brazo("izq"), girar(p, "izq", -BRAZO.reposo));
  gsap.set([p.mano("der"), p.mano("izq")], { attr: { r: R_MANO } });
  manoNormal(p, "der"); manoNormal(p, "izq");
}
Object.keys(figuras).forEach(function (k) { reposo(figuras[k]); });
function redibujarFiguras() {
  Object.keys(figuras).forEach(function (k) {
    dibujarPersonaje(figuras[k]);
    figuras[k].atras.querySelector(".color-piel").setAttribute("flood-color", rasgos.piel);   // los brazos, del color de piel del visitante
  });
}
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
  tl.to(p.brazo(lado), girar(p, lado, s * ARRIBA, { duration: 0.9, ease: "back.out(1.6)" }));
  var b = gsap.timeline({ repeat: -1, yoyo: true, delay: 0.9 });
  b.to(p.brazo(lado), girar(p, lado, s * (ARRIBA - 25), { duration: 0.5, ease: "sine.inOut" }));
  var pulso = gsap.to(p.mano(lado), { attr: { r: R_MANO * 1.3 }, duration: 0.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.9 });
  bucles.push(b, tl, pulso);
  return tl;
}

// lleva la mano a (x, y): el brazo gira hacia ese punto y se estira o se acorta (como si se acercara a la cámara)
function manoEn(p, lado, x, y) {
  var h = HOMBRO[lado], dx = x - h[0], dy = y - h[1], d = Math.max(1, Math.hypot(dx, dy));
  var a = Math.atan2(-dx, dy) * 180 / Math.PI, g = p.brazo(lado), o = h[0] + " " + h[1];
  gsap.set(g[0], { rotation: a, scaleY: d / LARGO, svgOrigin: o });   // el brazo (atrás)
  gsap.set(g[1], { rotation: a, svgOrigin: o });                      // el punto de la mano (adelante), sin deformarse
  g[1].querySelectorAll("circle").forEach(function (c) { c.setAttribute("cy", h[1] + d); });
}
// en la práctica, el brazo que se usa pasa por delante del cuerpo (al svg de adelante, debajo del punto de la mano);
// con adelante = false vuelve atrás
function brazoAdelante(p, lado, adelante) {
  var g = p.brazo(lado)[0];   // el grupo con la imagen del brazo (siempre es el primero en el documento)
  if (adelante) p.svg.insertBefore(g, p.svg.querySelector('[class^="brazo-"]'));
  else p.atras.appendChild(g);
}
function manoNormal(p, lado) {
  var h = HOMBRO[lado], g = p.brazo(lado);
  gsap.set(g[0], { scaleY: 1, svgOrigin: h[0] + " " + h[1] });
  g[1].querySelectorAll("circle").forEach(function (c) { c.setAttribute("cy", h[1] + LARGO); });
}

// demostración del gesto: la mano sube al costado y va en línea recta, a la misma altura, hasta el centro del cuerpo
// (la estela marca el recorrido de la mano)
function demo(p, lado) {
  var s = lado === "der" ? 1 : -1, color = lado === "der" ? ROJO : AZUL, h = HOMBRO[lado];
  var y = h[1] + LARGO * 0.6, x0 = h[0] - s * LARGO * 0.8, x1 = 310;   // del costado al centro, recto
  var reposoXY = puntaBrazo(lado, s * BRAZO.reposo);
  p.estela.setAttribute("d", "M" + x0.toFixed(1) + " " + y.toFixed(1) + " L" + x1 + " " + y.toFixed(1));
  p.estela.setAttribute("stroke", color);
  var m = { x: reposoXY[0], y: reposoXY[1] };
  function pintar() { manoEn(p, lado, m.x, m.y); }
  var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5, onRepeat: function () { manoNormal(p, lado); } });
  tl.set(p.estela, { opacity: 0 })
    .set(m, { x: reposoXY[0], y: reposoXY[1], onComplete: pintar })
    .to(m, { x: x0, y: y, duration: 0.7, ease: "power2.out", onUpdate: pintar })
    .to(p.estela, { opacity: 0.8, duration: 0.2 })
    .to(m, { x: x1, duration: 0.8, ease: "power2.inOut", onUpdate: pintar })
    .to(p.estela, { opacity: 0, duration: 0.4 }, "+=0.2")
    .to(m, { x: reposoXY[0], y: reposoXY[1], duration: 0.5, ease: "power1.inOut", onUpdate: pintar }, "<");
  bucles.push(tl);
  return tl;
}

/* ---------- Práctica de una mano ---------- */
function practica(id, lado) {
  var el, estado, puntos, fin = false, intentos = 0, hecho = false;
  // la cámara puede mandar varios gestos seguidos con un solo movimiento (o seguir mandando desde la pantalla anterior):
  // no se cuenta nada hasta PRACTICA_INICIO segundos después de entrar, y entre gesto y gesto tiene que pasar PRACTICA_PAUSA
  var desde = 0, ultimo = 0, pasar = null;
  function sirve() {
    var t = Date.now();
    if (t < desde || t - ultimo < PRACTICA_PAUSA * 1000) return false;
    ultimo = t; return true;
  }
  var nombre = lado === "der" ? "derecha (roja)" : "izquierda (azul)";
  var otra = lado === "der" ? "izquierda" : "derecha";
  function decir(txt, clase) {
    estado.className = "t-estado" + (clase ? " " + clase : "");
    estado.textContent = txt;
    gsap.fromTo(estado, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: "back.out(2)", transformOrigin: "left center" });
  }
  function bien() {
    if (fin || !sirve()) return;
    var p = figuras[id];
    gsap.fromTo(p.mano(lado), { attr: { r: R_MANO * 1.8 } }, { attr: { r: R_MANO }, duration: 0.5, ease: "power2.out" });
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
      pasar = gsap.delayedCall(1.6, function () { pasar = null; Infografia.avanzar(); });
    } else {
      decir("¡Bien! Te faltan " + (REPETICIONES - intentos) + ".", "bien");
    }
  }
  function mal() {
    if (fin || !sirve()) return;
    decir("Esa es la mano " + otra + ". Usá la " + nombre + ".", "mal");
  }
  return {
    el: "#" + id,
    preparar: function (e) {
      el = e; estado = e.querySelector(".t-estado"); puntos = e.querySelector(".t-puntos");
      fin = false; hecho = false; intentos = 0;
      desde = Date.now() + PRACTICA_INICIO * 1000; ultimo = 0;
      estado.className = "t-estado";
      estado.textContent = "Hacé el movimiento que ves a la izquierda.";
      gsap.set(puntos, { opacity: 0 });
      Array.prototype.forEach.call(puntos.children, function (i) { i.classList.remove("ok"); });
      reposo(figuras[id]);
      brazoAdelante(figuras[id], lado, true);   // el brazo que se practica, por delante del cuerpo
    },
    entrar: function (e) { demo(figuras[id], lado); return entradaTexto(e); },
    salir: function () { if (pasar) { pasar.kill(); pasar = null; } pararBucles(); brazoAdelante(figuras[id], lado, false); },
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
    (m.pelado ? " (pelado)" : "") + " · sonrisa " + m.sonrisa + " · ojos " + m.ojos + " · anteojos " + m.anteojos;
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
        Evolucion.olvidar();   // visitante nuevo
        var v = document.getElementById("te-video");
        try { v.currentTime = 0; } catch (e) {}
        gsap.set("#te-pide", { autoAlpha: 0 });
        gsap.set("#te-viendo", { autoAlpha: 0 });
      },
      entrar: function () {
        // el video de la intro, en bucle, hasta que la cámara ve a alguien
        var v = document.getElementById("te-video"), pr = v.play();
        if (pr && pr.catch) pr.catch(function () {});
        var tl = gsap.timeline().to("#te-pide", { autoAlpha: 1, duration: 0.5, delay: 0.3 });
        // ¿hay alguien? el aro se llena mientras la cámara lo sigue viendo; si se va, vuelve a cero
        var aro = document.querySelector("#te-viendo .aro"), mostrando = false;
        vigia = setInterval(function () {
          var t = viendoDesde ? (Date.now() - viendoDesde) / 1000 : 0;
          if (t > 0 !== mostrando) {
            mostrando = t > 0;
            // un cartel reemplaza al otro: mientras te ve, sólo "Te estoy viendo…"
            gsap.killTweensOf(["#te-viendo", "#te-pide"]);
            gsap.to("#te-viendo", { autoAlpha: mostrando ? 1 : 0, duration: 0.3 });
            gsap.to("#te-pide", { autoAlpha: mostrando ? 0 : 1, duration: mostrando ? 0.15 : 0.3 });
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
      salir: function () { if (vigia) { clearInterval(vigia); vigia = null; } document.getElementById("te-video").pause(); pararBucles(); }
    };
  })(),

  // B. Construcción: el personaje se arma capa por capa mientras una línea lo "escanea"; después arranca el tutorial
  (function () {
    var PASOS = ["Analizando tu cara", "Tu cuerpo", "Tus ojos", "Tus cejas", "Guardando tus rasgos", "Tu boca"];
    return {
      el: "#t-crea",
      preparar: function () {
        enInicio = true;
        var visitante = Personaje.desdeCamara(muestras.slice(-20));
        Evolucion.guardar(visitante);   // en color: los núcleos lo hacen evolucionar
        rasgos = Personaje.enBlancoYNegro(Personaje.PREDETERMINADO);
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
            document.getElementById("tc-titulo").textContent = "¡Ya casi!";
            document.getElementById("tc-paso").textContent = "Antes de nacer, vas a aprender a moverte";
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
      tl.from([p.fondo, p.atras, p.canvas, p.svg], { y: 60, opacity: 0, duration: 0.7, ease: "power3.out" })
        .add(entradaTexto(e), 0.2);
      // saluda con las dos manos
      bucles.push(gsap.timeline({ repeat: -1, yoyo: true, delay: 0.8 })
        .to(p.brazo("der"), girar(p, "der", ARRIBA, { duration: 0.7, ease: "sine.inOut" }), 0)
        .to(p.brazo("izq"), girar(p, "izq", -ARRIBA, { duration: 0.7, ease: "sine.inOut" }), 0));
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
      gsap.to(p.brazo("der"), girar(p, "der", ARRIBA, { duration: 0.8, ease: "back.out(1.6)" }));
      gsap.to(p.brazo("izq"), girar(p, "izq", -ARRIBA, { duration: 0.8, ease: "back.out(1.6)", delay: 0.15 }));
      return entradaTexto(e);
    },
    // la izquierda acá reinicia el tutorial desde el principio
    alAnterior: function () { Infografia.irA("#t-reloj"); return true; },   // (el mismo personaje, sin volver a crearlo)
    salir: pararBucles }
], { transicion: "deslizar", duracion: 0.8,
  // pantallas que pasan solas (segundos de lectura después de que termina la entrada)
  auto: { "#t1": 5, "#t2": 4, "#t3": 4, "#t-ok": 8, "#t-reloj": SEG_RELOJ, "#t6": 8 } });
