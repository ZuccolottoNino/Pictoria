Infografia.escalar("#escenario", 1920, 1080);

var bucles = [];
function pararBucles() { bucles.forEach(function (b) { b.kill(); }); bucles = []; }

/* Parte el texto de un elemento en <span class="letra"> (una por carácter) para escribirlo
   letra por letra. Respeta los <span> de color y los <br>. Solo lo hace una vez. */
function letrasDe(selector) {
  var raiz = document.querySelector(selector);
  if (raiz.dataset.partido) return;
  raiz.dataset.partido = "1";
  (function partir(nodo) {
    Array.prototype.slice.call(nodo.childNodes).forEach(function (hijo) {
      if (hijo.nodeType === 3) {
        var frag = document.createDocumentFragment();
        hijo.textContent.split("").forEach(function (c) {
          var s = document.createElement("span");
          s.className = "letra";
          s.textContent = c;
          frag.appendChild(s);
        });
        nodo.replaceChild(frag, hijo);
      } else if (hijo.nodeType === 1) {
        partir(hijo);
      }
    });
  })(raiz);
}

/* Lienzo para dibujar (pantallas 7 y 8): la tableta Wacom funciona como mouse, así que
   se dibuja con eventos de puntero. "prefijo" es el de los ids: p7 → #p7-lienzo, #p7-canvas, #p7-cursor.
   Se arma una sola vez; "activo" decide si responde. */
function crearLienzo(prefijo) {
  var activo = false, dibujando = false, ultimo = null, trazo = [];
  var alDibujar = null, alTerminarTrazo = null;
  var caja, canvas, ctx, cursor;

  function armar() {
    if (canvas) return;
    caja = document.getElementById(prefijo + "-lienzo");
    canvas = document.getElementById(prefijo + "-canvas");
    cursor = document.getElementById(prefijo + "-cursor");
    ctx = canvas.getContext("2d");

    // de coordenadas de pantalla (escenario escalado) a coordenadas del canvas
    function punto(e) {
      var r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * canvas.width / r.width,
               y: (e.clientY - r.top) * canvas.height / r.height };
    }
    function moverCursor(p) {
      cursor.style.left = p.x + "px";
      cursor.style.top = p.y + "px";
    }
    function soltar() {
      if (!dibujando) return;
      dibujando = false; ultimo = null;
      if (alTerminarTrazo && trazo.length) alTerminarTrazo(trazo);
      trazo = [];
    }

    caja.addEventListener("pointermove", function (e) {
      if (!activo) return;
      var p = punto(e);
      moverCursor(p);
      cursor.hidden = false;
      if (dibujando && ultimo) {
        ctx.beginPath();
        ctx.moveTo(ultimo.x, ultimo.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ultimo = p;
        trazo.push(p);
      }
    });
    caja.addEventListener("pointerdown", function (e) {
      if (!activo) return;
      dibujando = true;
      ultimo = punto(e);
      trazo = [ultimo];
      try { caja.setPointerCapture(e.pointerId); } catch (err) {}
      ctx.beginPath();
      ctx.arc(ultimo.x, ultimo.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      if (alDibujar) { alDibujar(); alDibujar = null; }
    });
    ["pointerup", "pointercancel"].forEach(function (ev) { caja.addEventListener(ev, soltar); });
    caja.addEventListener("pointerleave", function () { if (!dibujando) cursor.hidden = true; });
  }

  return {
    /* empezar: limpia el lienzo y lo activa.
       op.primerTrazo(): avisa una vez cuando el usuario empieza a dibujar.
       op.alTerminarTrazo(puntos): cada vez que levanta el lápiz, con los puntos del trazo. */
    empezar: function (op) {
      op = op || {};
      armar();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = ctx.fillStyle = "#1b1b1b";
      cursor.hidden = true;
      alDibujar = op.primerTrazo || null;
      alTerminarTrazo = op.alTerminarTrazo || null;
      activo = true;
    },
    parar: function () { activo = false; dibujando = false; ultimo = null; trazo = []; if (cursor) cursor.hidden = true; }
  };
}
var lienzo7 = crearLienzo("p7");
var p7Probado = false;   // pantalla 7: si ya probó el lápiz
var lienzo8 = crearLienzo("p8");
var lienzo10 = crearLienzo("p10");

/* Juego de unir puntos con el lápiz (pantallas 8 y 10). Devuelve una pantalla para Infografia.presentacion.
   Cuando el dibujo está "completo" (o se acaba el tiempo) aparecen las opciones:
   gesto de avanzar → sigue; gesto de volver → borra y se reintenta.
   Mientras no termine, avanzar no hace nada (y volver va a la pantalla anterior).
   cfg: id ("p8"), lienzo, puntos [{x,y}] (en coordenadas del canvas, iguales al HTML),
        completo(trazos, cerca, puntos) → true cuando el dibujo cumple la consigna,
        tolerancia (px, 70), segundos (20, desde el primer trazo).
   Ids que usa: #id-caja, #id-dialogo, #id-lienzo, .id-punto, #id-tiempo, #id-opciones */
function juegoDePuntos(cfg) {
  var id = cfg.id, P = cfg.puntos;
  var TOLERANCIA = cfg.tolerancia || 70;
  var SEGUNDOS = cfg.segundos || 20;
  var terminado = false, reloj = null, trazos = [];

  function cerca(p, q) { return Math.hypot(p.x - q.x, p.y - q.y) <= TOLERANCIA; }
  function pararReloj() { if (reloj) { reloj.kill(); reloj = null; } }

  // fin del juego: se corta el dibujo y aparecen las opciones
  function terminar() {
    if (terminado) return;
    terminado = true;
    pararReloj();
    cfg.lienzo.parar();
    gsap.timeline()
      .to("." + id + "-punto", { scale: 1.4, duration: 0.15, ease: "steps(2)", yoyo: true, repeat: 1 })
      .to("#" + id + "-tiempo", { autoAlpha: 0, duration: 0.2, ease: "steps(2)" }, 0)
      .to("#" + id + "-opciones", { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" });
  }

  // cuenta regresiva que arranca con el primer trazo
  function arrancarReloj() {
    var el = document.getElementById(id + "-tiempo");
    var cuenta = { t: SEGUNDOS };
    el.textContent = SEGUNDOS;
    gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" });
    reloj = gsap.to(cuenta, {
      t: 0, duration: SEGUNDOS, ease: "none",
      onUpdate: function () {
        var s = Math.ceil(cuenta.t);
        if (el.textContent != s) {
          el.textContent = s;
          el.classList.toggle("apurado", s <= 5);
          if (s <= 5) gsap.fromTo(el, { scale: 1.3 }, { scale: 1, duration: 0.3, ease: "steps(3)" });
        }
      },
      onComplete: terminar
    });
  }

  function jugar() {
    terminado = false;
    trazos = [];
    pararReloj();
    gsap.set("#" + id + "-opciones", { autoAlpha: 0, y: 30 });
    gsap.set("#" + id + "-tiempo", { autoAlpha: 0, scale: 0 });
    document.getElementById(id + "-tiempo").classList.remove("apurado");
    cfg.lienzo.empezar({
      primerTrazo: arrancarReloj,
      alTerminarTrazo: function (trazo) {
        trazos.push(trazo);
        if (!terminado && cfg.completo(trazos, cerca, P)) terminar();
      }
    });
  }

  return {
    el: "#" + id,
    preparar: function () {
      var d = Infografia.direccion;
      letrasDe("#" + id + "-dialogo");
      gsap.set("#" + id + "-caja",   { autoAlpha: 0, x: 120 * d });
      gsap.set("#" + id + " .caja-profe-img", { autoAlpha: 0, x: -60 * d, rotation: -6, transformOrigin: "50% 100%" });
      gsap.set("#" + id + "-dialogo .letra", { autoAlpha: 0 });
      gsap.set("#" + id + "-lienzo", { autoAlpha: 0, x: -120 * d });
      gsap.set("." + id + "-punto",  { autoAlpha: 0, scale: 0 });
      gsap.set("#" + id + "-opciones", { autoAlpha: 0, y: 30 });
    },
    entrar: function () {
      jugar();
      return gsap.timeline()
        .to("#" + id + "-caja", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" })
        .to("#" + id + " .caja-profe-img", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, ease: "back.out(1.8)" }, "-=0.2")
        .to("#" + id + "-dialogo .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.02 }, "-=0.2")
        .to("#" + id + "-lienzo", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, 0.6)
        .to("." + id + "-punto",  { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(3)", stagger: 0.2 })
        .add(function () {
          bucles.push(gsap.to("#" + id + " .caja-profe-img", { y: -6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          // los puntos laten para que se vea dónde hay que dibujar
          bucles.push(gsap.to("." + id + "-punto", { scale: 1.15, duration: 0.5, ease: "steps(2)", yoyo: true, repeat: -1, stagger: 0.25 }));
        });
    },
    alSiguiente: function () {
      return !terminado;   // sin terminar no se avanza
    },
    alAnterior: function () {
      if (!terminado) return false;   // todavía no jugó: volver funciona normal
      jugar();                        // ya jugó: volver = reintentar
      return true;
    },
    salir: function () { pararBucles(); pararReloj(); cfg.lienzo.parar(); }
  };
}

/* Pantalla de comparación (9 y 11): "El tuyo" copia el dibujo del juego anterior y
   "Lo que yo esperaba" traza solo el recorrido correcto.
   cfg: id ("p9"), origen (id del canvas del juego), puntos [{x, y, color?, num?}],
        esperado [{x,y}] (recorrido, en coordenadas del canvas 1428 x 656).
   Ids que usa: #id-caja, #id-profe, #id-texto, #id-etiqueta-tuyo/-esperado,
                #id-flecha-tuyo/-esperado, #id-tuyo, #id-esperado, #id-canvas-tuyo/-esperado */
function comparacion(cfg) {
  var id = cfg.id, P = cfg.puntos, E = cfg.esperado;
  function $(s) { return "#" + id + "-" + s; }

  function ctxDe(nombre) {
    var c = document.getElementById(id + "-canvas-" + nombre).getContext("2d");
    c.lineWidth = 10; c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = "#000";
    return c;
  }
  function dibujarPuntos(c) {
    P.forEach(function (p) {
      c.fillStyle = p.color || "#8a38f5";
      c.beginPath(); c.arc(p.x, p.y, 31, 0, Math.PI * 2); c.fill();
      if (p.num) {
        c.fillStyle = "#fff";
        c.font = '28px "Press Start 2P"';
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(p.num, p.x + 2, p.y + 2);
      }
    });
  }
  // dibuja el recorrido esperado hasta "avance" (0 a 1), para animarlo como si se trazara
  function dibujarEsperado(c, avance) {
    var tramos = E.length - 1, hasta = avance * tramos;
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    c.beginPath();
    c.moveTo(E[0].x, E[0].y);
    for (var i = 1; i <= tramos && i - 1 < hasta; i++) {
      var a = E[i - 1], b = E[i], f = Math.min(1, hasta - (i - 1));
      c.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    }
    c.stroke();
    dibujarPuntos(c);
  }

  return {
    el: "#" + id,
    preparar: function () {
      var d = Infografia.direccion;
      // copia lo que dibujó la persona en el juego
      var tuyo = ctxDe("tuyo");
      tuyo.clearRect(0, 0, tuyo.canvas.width, tuyo.canvas.height);
      tuyo.drawImage(document.getElementById(cfg.origen), 0, 0);
      dibujarPuntos(tuyo);
      dibujarEsperado(ctxDe("esperado"), 0);

      gsap.set($("caja"),  { autoAlpha: 0, x: -100 * d });
      gsap.set($("profe"), { autoAlpha: 0, rotation: -6, transformOrigin: "50% 100%" });
      gsap.set($("texto"), { autoAlpha: 0 });
      gsap.set("#" + id + " .p9-etiqueta", { autoAlpha: 0, x: 60 * d });
      gsap.set("#" + id + " .p9-flecha",   { autoAlpha: 0 });
      gsap.set($("tuyo"),     { autoAlpha: 0, x: 120 * d });
      gsap.set($("esperado"), { autoAlpha: 0, x: -120 * d });
    },
    entrar: function () {
      var esperado = ctxDe("esperado"), trazo = { v: 0 };
      return gsap.timeline()
        .to($("caja"),  { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
        .to($("profe"), { autoAlpha: 1, rotation: 0, duration: 0.6, ease: "back.out(1.8)" }, "-=0.2")
        .to($("texto"), { autoAlpha: 1, duration: 0.4, ease: "steps(4)" }, "-=0.2")
        // el tuyo
        .to($("etiqueta-tuyo"), { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out" })
        .to($("flecha-tuyo"),   { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
        .to($("tuyo"),          { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
        // lo esperado: el recorrido se traza solo
        .to($("esperado"),          { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, "+=0.2")
        .to($("flecha-esperado"),   { autoAlpha: 1, duration: 0.3, ease: "steps(3)" }, "<0.2")
        .to($("etiqueta-esperado"), { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out" }, "<")
        .to(trazo, { v: 1, duration: 1.6, ease: "none", onUpdate: function () { dibujarEsperado(esperado, trazo.v); } })
        .add(function () {
          bucles.push(gsap.to($("profe"), { y: -6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          bucles.push(gsap.to($("flecha-tuyo"), { x: 12, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
          bucles.push(gsap.to($("flecha-esperado"), { x: -12, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
        });
    },
    salir: pararBucles
  };
}

function iniciar() {
  Infografia.presentacion([

    /* ============ Pantalla 1: Pictoria cargando ============ */
    {
      el: "#p1",
      preparar: function () {
        var d = Infografia.direccion;
        gsap.set("#p1-adn",            { autoAlpha: 0, x: 80 * d, rotation: 0 });
        gsap.set("#p1-titulo span",    { autoAlpha: 0, x: 60 * d });
        gsap.set("#p1-barra",          { autoAlpha: 0, x: 120 * d });
        gsap.set("#p1-relleno",        { width: 0 });
        gsap.set("#p1-estado",         { autoAlpha: 0 });
        gsap.set("#p1-birrete",        { autoAlpha: 0, x: -40 * d, rotation: -20 });
        gsap.set("#p1-subtitulo",      { autoAlpha: 0, x: 60 * d, "--subrayado": 0 });
        gsap.set("#p1-aviso",          { autoAlpha: 0, x: 60 * d });
        document.getElementById("p1-estado").textContent = "Creando la explicación";
      },
      entrar: function () {
        var estado = document.getElementById("p1-estado");
        var textos = ["Creando la explicación", "Generando ejemplos"];

        return gsap.timeline()
          // título letra por letra, con saltos tipo pixel
          .to("#p1-titulo span", { autoAlpha: 1, x: 0, duration: 0.35, ease: "steps(4)", stagger: 0.07 })
          .to("#p1-adn",         { autoAlpha: 1, x: 0, duration: 0.6, ease: "back.out(1.6)" }, "-=0.4")
          .to("#p1-barra",       { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "-=0.2")
          .to("#p1-estado",      { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
          .to("#p1-birrete",     { autoAlpha: 1, x: 0, rotation: 0, duration: 0.6, ease: "back.out(2)" }, "-=0.1")
          .to("#p1-subtitulo",   { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, "<0.1")
          .to("#p1-subtitulo",   { "--subrayado": 1, duration: 0.6, ease: "steps(12)" })
          .add(function () {
            // la barra se carga hasta el final a saltos, como una carga retro;
            // a la mitad, el texto cambia una sola vez (con un parpadeo)
            // al llenarse aparece el aviso de deslizar
            bucles.push(gsap.timeline()
              .to("#p1-relleno", { width: 1306, duration: 8, ease: "steps(32)" })
              .addLabel("mitad", 4)
              .to(estado, { autoAlpha: 0, duration: 0.2, ease: "steps(2)" }, "mitad")
              .add(function () { estado.textContent = textos[1]; }, "mitad+=0.2")
              .to(estado, { autoAlpha: 1, duration: 0.2, ease: "steps(2)" }, "mitad+=0.2")
              .to("#p1-aviso", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, 8)
              .add(function () {
                bucles.push(gsap.to("#p1-aviso", { opacity: 0.3, duration: 0.6, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.3 }));
              }));

            // ADN girando (se "aplana" y vuelve, como si rotara sobre su eje)
            bucles.push(gsap.to("#p1-adn", { scaleX: -1, duration: 1.4, ease: "steps(8)", yoyo: true, repeat: -1 }));
            // título: onda suave letra por letra
            bucles.push(gsap.to("#p1-titulo span", { y: -10, duration: 0.5, ease: "steps(3)", stagger: { each: 0.1, repeat: -1, yoyo: true } }));
            // birrete balanceándose
            bucles.push(gsap.to("#p1-birrete", { rotation: 8, y: -4, duration: 1, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 2: bienvenida del profe ============ */
    {
      el: "#p2",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p2-dialogo");
        gsap.set("#p2-caja",         { autoAlpha: 0, x: 120 * d });
        gsap.set("#p2-profe",        { autoAlpha: 0, x: -60 * d, rotation: -6, transformOrigin: "50% 100%" });
        gsap.set("#p2-dialogo .letra", { autoAlpha: 0 });
        gsap.set("#p2-progreso",     { autoAlpha: 0, x: 120 * d });
        gsap.set("#p2-relleno",      { scaleX: 0 });
        gsap.set(".p2-marca",        { autoAlpha: 0, y: 0 });
        gsap.set("#p2-uno",          { autoAlpha: 0, x: -80 * d });
        gsap.set("#p2-birrete",      { autoAlpha: 0, x: -60 * d, rotation: -20 });
        gsap.set(".p2-linea",        { autoAlpha: 0, x: 100 * d });
      },
      entrar: function () {
        return gsap.timeline()
          .to("#p2-caja",  { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" })
          .to("#p2-profe", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, ease: "back.out(1.8)" }, "-=0.2")
          // el diálogo se escribe letra por letra, como en un juego
          .to("#p2-dialogo .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.025 }, "-=0.2")
          .to("#p2-progreso", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, 0.9)
          .to("#p2-relleno",  { scaleX: 1, duration: 0.8, ease: "steps(10)" }, ">-0.1")
          .to(".p2-marca",    { autoAlpha: 1, duration: 0.2, ease: "steps(2)", stagger: 0.15 }, "<0.2")
          .to("#p2-uno",      { autoAlpha: 1, x: 0, duration: 0.5, ease: "steps(5)" }, 1.4)
          .to("#p2-birrete",  { autoAlpha: 1, x: 0, rotation: 0, duration: 0.6, ease: "back.out(2)" }, "<0.15")
          .to(".p2-linea",    { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out", stagger: 0.15 }, "<0.1")
          .add(function () {
            // el profe "habla" mientras escribe y después queda flotando
            bucles.push(gsap.to("#p2-profe", { y: -6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // el robot (vos) salta en el 0%
            bucles.push(gsap.to("#p2-robot", { y: -10, duration: 0.35, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.6 }));
            // el círculo del porcentaje titila
            bucles.push(gsap.to("#p2-porcentaje", { opacity: 0.35, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.5 }));
            // el "1" late suave
            bucles.push(gsap.to("#p2-uno", { scale: 1.04, duration: 0.8, ease: "steps(2)", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
            bucles.push(gsap.to("#p2-birrete", { rotation: 8, y: -4, duration: 1, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 100%" }));
          }, ">");
      },
      salir: pararBucles
    },

    /* ============ Pantalla 3: ¿Qué es un sistema experto? ============ */
    {
      el: "#p3",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p3-definicion p");
        letrasDe("#p3-funcion p");
        gsap.set("#p3-titulo span",   { autoAlpha: 0, x: 80 * d });
        gsap.set("#p3-linea",         { scaleX: 0, transformOrigin: d > 0 ? "0 50%" : "100% 50%" });
        gsap.set(".p3-guiones",       { scaleX: 0 });
        gsap.set("#p3-reloj",         { autoAlpha: 0, scale: 0, rotation: -180 });
        gsap.set(".p3-punto, .p3-flecha", { autoAlpha: 0, scale: 0 });
        gsap.set(".p3-palo",          { scaleY: 0, transformOrigin: "50% 0" });
        gsap.set(".p3-etiqueta",      { autoAlpha: 0, y: -10 });
        gsap.set("#p3-definicion",    { autoAlpha: 0, x: -120 * d });
        gsap.set("#p3-funcion",       { autoAlpha: 0, x: 120 * d });
        gsap.set(".p3-tarjeta h2",    { autoAlpha: 0 });
        gsap.set(".p3-tarjeta .letra", { autoAlpha: 0 });
        gsap.set(".p3-sep",           { scaleX: 0 });
        gsap.set(".p3-icono",         { autoAlpha: 0, scale: 0 });
        gsap.set("#p3-profe",         { autoAlpha: 0, y: 60, scale: 0.9, transformOrigin: "50% 100%" });
      },
      entrar: function () {
        return gsap.timeline()
          .to("#p3-titulo span", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out", stagger: 0.15 })
          // la línea de tiempo se dibuja y aparecen los hitos
          .to("#p3-linea",    { scaleX: 1, duration: 0.8, ease: "steps(16)" }, "-=0.2")
          .to(".p3-guiones",  { scaleX: 1, duration: 0.6, ease: "steps(8)" }, "<0.2")
          .to("#p3-reloj",    { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.8)" }, "<")
          .to("#p3-hito-inicio .p3-punto",     { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, "-=0.2")
          .to("#p3-hito-inicio .p3-palo",      { scaleY: 1, duration: 0.25, ease: "steps(4)" })
          .to("#p3-hito-inicio .p3-etiqueta",  { autoAlpha: 1, y: 0, duration: 0.3, ease: "steps(3)" })
          .to("#p3-hito-fin .p3-flecha",       { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, "-=0.1")
          .to("#p3-hito-fin .p3-palo",         { scaleY: 1, duration: 0.25, ease: "steps(4)" })
          .to("#p3-hito-fin .p3-etiqueta",     { autoAlpha: 1, y: 0, duration: 0.3, ease: "steps(3)" })
          // tarjetas y profe
          .to("#p3-definicion", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, 1.2)
          .to("#p3-funcion",    { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "<")
          .to("#p3-profe",      { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, "<0.2")
          .to(".p3-tarjeta h2", { autoAlpha: 1, duration: 0.3, ease: "steps(3)" }, "-=0.2")
          .to("#p3-definicion .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.02 })
          .to("#p3-funcion .letra",    { autoAlpha: 1, duration: 0.01, stagger: 0.02 })
          .to(".p3-sep",        { scaleX: 1, duration: 0.5, ease: "steps(10)" })
          .to(".p3-icono",      { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)", stagger: 0.12 })
          .add(function () {
            // el reloj hace tic-tac
            bucles.push(gsap.to("#p3-reloj", { rotation: 360, duration: 6, ease: "steps(12)", repeat: -1 }));
            // la flecha de "Actualidad" empuja hacia adelante
            bucles.push(gsap.to("#p3-hito-fin .p3-flecha", { x: 10, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.5 }));
            // el punto de 1960 titila
            bucles.push(gsap.to("#p3-hito-inicio .p3-punto", { opacity: 0.3, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.5 }));
            bucles.push(gsap.to("#p3-profe", { y: -12, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // los íconos saltan de a uno, en ola
            bucles.push(gsap.to(".p3-icono", { y: -8, duration: 0.3, ease: "steps(2)", stagger: { each: 0.2, repeat: -1, yoyo: true, repeatDelay: 1.2 } }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 4: ejemplo del libro de recetas ============ */
    {
      el: "#p4",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p4-base .p4-texto");
        letrasDe("#p4-motor .p4-texto");
        letrasDe("#p4-reglas .p4-texto");
        letrasDe("#p4 .p4-regla");
        gsap.set("#p4-titulo",        { autoAlpha: 0, x: 80 * d });
        gsap.set(".p4-card",          { autoAlpha: 0, x: 100 * d });
        gsap.set("#p4 .letra",        { autoAlpha: 0 });
        gsap.set("#p4 .guiones-n1",   { scaleX: 0 });
        gsap.set(".p4-icono",         { autoAlpha: 0, scale: 0 });
        gsap.set(".p4-nombre",        { autoAlpha: 0, x: 40 * d });
        gsap.set("#p4-ilustracion",   { autoAlpha: 0, x: 120 * d, rotation: 4 });
      },
      entrar: function () {
        // cada tarjeta: entra, se escribe el texto, se dibuja el punteado y aparece su concepto
        function tarjeta(sel) {
          return gsap.timeline()
            .to(sel,                     { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
            .to(sel + " .p4-texto .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.018 })
            .to(sel + " .guiones-n1",    { scaleX: 1, duration: 0.4, ease: "steps(10)" })
            .to(sel + " .p4-icono",      { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" })
            .to(sel + " .p4-nombre",     { autoAlpha: 1, x: 0, duration: 0.3, ease: "steps(3)" }, "<0.1")
            .to(sel + " .p4-regla .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.018 }, "<");
        }
        return gsap.timeline()
          .to("#p4-titulo", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
          .add(tarjeta("#p4-base"))
          .add(tarjeta("#p4-reglas"), "-=0.3")
          .add(tarjeta("#p4-motor"), "-=0.3")
          .to("#p4-ilustracion", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, ease: "back.out(1.6)" }, "-=0.4")
          .add(function () {
            bucles.push(gsap.to("#p4-ilustracion", { y: -12, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // el robot (motor de inferencia) "procesa"
            bucles.push(gsap.to("#p4-motor .p4-icono", { rotation: 6, duration: 0.25, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 1 }));
            // la base de conocimientos late
            bucles.push(gsap.to("#p4-base .p4-icono", { scale: 1.06, duration: 0.6, ease: "steps(2)", yoyo: true, repeat: -1 }));
            // SI / ENTONCES titilan
            bucles.push(gsap.to("#p4 .p4-regla .violeta", { opacity: 0.35, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.5 }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 5: fortalezas vs debilidades ============ */
    {
      el: "#p5",
      preparar: function () {
        var d = Infografia.direccion;
        document.querySelectorAll("#p5 .p5-item p").forEach(function (p, i) {
          p.id = p.id || "p5-texto-" + i;
          letrasDe("#" + p.id);
        });
        gsap.set("#p5-titulo",       { autoAlpha: 0, x: 80 * d });
        gsap.set("#p5-pulgar-arriba", { autoAlpha: 0, scale: 0, rotation: -30, transformOrigin: "50% 100%" });
        gsap.set("#p5-pulgar-abajo",  { autoAlpha: 0, scale: 0, rotation: 30, transformOrigin: "50% 0" });
        gsap.set(".p5-flecha",       { autoAlpha: 0 });
        gsap.set("#p5-fortalezas",   { autoAlpha: 0, x: 120 * d });
        gsap.set("#p5-debilidades",  { autoAlpha: 0, x: -120 * d });
        gsap.set(".p5-card h2",      { autoAlpha: 0 });
        gsap.set("#p5 .guiones-n1",  { scaleX: 0 });
        gsap.set("#p5 .guiones-n1-v", { scaleY: 0 });
        gsap.set(".p5-item h3",      { autoAlpha: 0, x: 30 * d });
        gsap.set("#p5 .letra",       { autoAlpha: 0 });
      },
      entrar: function () {
        // contenido de una tarjeta: título, punteados, ítems y texto letra por letra
        function contenido(sel) {
          return gsap.timeline()
            .to(sel + " h2",            { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
            .to(sel + " .guiones-n1",   { scaleX: 1, duration: 0.4, ease: "steps(10)" })
            .to(sel + " .guiones-n1-v", { scaleY: 1, duration: 0.3, ease: "steps(6)" })
            .to(sel + " h3",            { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out", stagger: 0.15 }, "<")
            .to(sel + " .letra",        { autoAlpha: 1, duration: 0.01, stagger: 0.015 });
        }
        return gsap.timeline()
          .to("#p5-titulo", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
          // fortalezas: pulgar arriba → flecha → tarjeta
          .to("#p5-pulgar-arriba", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }, "-=0.1")
          .to("#p5-flecha-der",    { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
          .to("#p5-fortalezas",    { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, "-=0.1")
          .add(contenido("#p5-fortalezas"))
          // debilidades: pulgar abajo → flecha → tarjeta
          .to("#p5-pulgar-abajo",  { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }, "-=0.6")
          .to("#p5-flecha-izq",    { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
          .to("#p5-debilidades",   { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, "-=0.1")
          .add(contenido("#p5-debilidades"))
          .add(function () {
            // las flechas empujan hacia su tarjeta
            bucles.push(gsap.to("#p5-flecha-der", { x: 14, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
            bucles.push(gsap.to("#p5-flecha-izq", { x: -14, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
            // los pulgares se mueven como diciendo "sí" y "no"
            bucles.push(gsap.to("#p5-pulgar-arriba", { y: -12, duration: 0.5, ease: "steps(3)", yoyo: true, repeat: -1, repeatDelay: 0.8 }));
            bucles.push(gsap.to("#p5-pulgar-abajo",  { y: 12, duration: 0.5, ease: "steps(3)", yoyo: true, repeat: -1, repeatDelay: 0.8, delay: 0.6 }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 6: ¿y si el libro fuera de dibujo? ============ */
    {
      el: "#p6",
      preparar: function () {
        var d = Infografia.direccion;
        document.querySelectorAll("#p6 .p6-regla").forEach(function (p, i) {
          p.id = p.id || "p6-regla-" + i;
          letrasDe("#" + p.id);
        });
        gsap.set("#p6-titulo",   { autoAlpha: 0, x: 80 * d });
        gsap.set("#p6-cuaderno", { autoAlpha: 0, x: -120 * d, rotation: -4 });
        gsap.set("#p6 .letra",   { autoAlpha: 0 });
        gsap.set(".p6-flecha",   { autoAlpha: 0, x: -20 });
        gsap.set(".p6-foto img", { autoAlpha: 0, scale: 0.8 });
        gsap.set(".p6-foto figcaption", { autoAlpha: 0, x: 30 * d });
        gsap.set("#p6-mas",      { autoAlpha: 0, scale: 0, rotation: -90 });
        gsap.set("#p6-dibujo",   { autoAlpha: 0, clipPath: "inset(0% 100% 0% 0%)" });
      },
      entrar: function () {
        return gsap.timeline()
          .to("#p6-titulo",   { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
          .to("#p6-cuaderno", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, ease: "back.out(1.4)" }, "-=0.2")
          // las reglas se escriben como en el cuaderno
          .to("#p6 .letra",   { autoAlpha: 1, duration: 0.01, stagger: 0.015 })
          // proceso: reglas → compu + plotter → dibujo
          .to("#p6-flecha-1", { autoAlpha: 1, x: 0, duration: 0.3, ease: "steps(3)" }, "-=1.6")
          .to("#p6-compu img", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" })
          .to("#p6-compu figcaption", { autoAlpha: 1, x: 0, duration: 0.3, ease: "steps(3)" })
          .to("#p6-mas",      { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.4, ease: "back.out(2.5)" })
          .to("#p6-plotter img", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" })
          .to("#p6-plotter figcaption", { autoAlpha: 1, x: 0, duration: 0.3, ease: "steps(3)" })
          .to("#p6-flecha-2", { autoAlpha: 1, x: 0, duration: 0.3, ease: "steps(3)" })
          // el dibujo "se traza" de izquierda a derecha, como la pluma del plotter
          .to("#p6-dibujo",   { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "steps(14)" })
          .add(function () {
            bucles.push(gsap.to(".p6-flecha", { x: 12, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.4, stagger: 0.3 }));
            // el plotter se sacude como si estuviera dibujando
            bucles.push(gsap.to("#p6-plotter img", { x: 3, duration: 0.08, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.9 }));
            bucles.push(gsap.to("#p6-mas", { scale: 1.15, duration: 0.5, ease: "steps(2)", yoyo: true, repeat: -1 }));
            bucles.push(gsap.to("#p6-cuaderno", { y: -8, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 7: probar la tableta (intro al juego) ============ */
    {
      el: "#p7",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p7-dialogo");
        gsap.set("#p7-caja",   { autoAlpha: 0, x: 120 * d });
        gsap.set("#p7-profe",  { autoAlpha: 0, x: -60 * d, rotation: -6, transformOrigin: "50% 100%" });
        gsap.set("#p7-dialogo .letra", { autoAlpha: 0 });
        gsap.set("#p7-lienzo", { autoAlpha: 0, x: -120 * d });
        gsap.set("#p7-guia",   { autoAlpha: 0, scale: 0.9 });
        gsap.set("#p7-cartel", { autoAlpha: 0, xPercent: -50, y: 40 });
      },
      entrar: function () {
        var SEGUNDOS_PARA_CARTEL = 8;   // tiempo de prueba antes de pedir el gesto
        var tiempoCumplido = false;
        p7Probado = false;

        // el cartel aparece cuando pasó el tiempo Y ya probó dibujar (lo que pase último)
        function mostrarCartel() {
          if (!tiempoCumplido || !p7Probado) return;
          bucles.push(gsap.timeline()
            .to("#p7-cartel", { autoAlpha: 1, y: 0, duration: 0.5, ease: "back.out(2)" })
            .to("#p7-cartel", { opacity: 0.4, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
        }

        // apenas dibuja, la guía de fondo se va
        lienzo7.empezar({ primerTrazo: function () {
          p7Probado = true;
          gsap.to("#p7-guia", { autoAlpha: 0, duration: 0.4, ease: "steps(4)", overwrite: true });
          mostrarCartel();
        } });

        return gsap.timeline()
          .to("#p7-caja",  { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" })
          .to("#p7-profe", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, ease: "back.out(1.8)" }, "-=0.2")
          .to("#p7-dialogo .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.02 }, "-=0.2")
          .to("#p7-lienzo", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, 0.6)
          .to("#p7-guia",   { autoAlpha: 0.12, scale: 1, duration: 0.5, ease: "steps(5)" })
          .add(function () {
            bucles.push(gsap.to("#p7-profe", { y: -6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // la guía (tableta + mano) "late" mientras espera que alguien dibuje
            bucles.push(gsap.to("#p7-guia", { scale: 1.04, duration: 0.6, ease: "steps(2)", yoyo: true, repeat: -1 }));
            // al rato aparece el cartel para pasar a la actividad
            bucles.push(gsap.delayedCall(SEGUNDOS_PARA_CARTEL, function () { tiempoCumplido = true; mostrarCartel(); }));
          });
      },
      alSiguiente: function () {
        return !p7Probado;   // no se avanza hasta haber probado el lápiz al menos una vez
      },
      salir: function () { pararBucles(); lienzo7.parar(); }
    },

    /* ============ Pantalla 8: juego, línea zigzagueante entre dos puntos ============ */
    juegoDePuntos({
      id: "p8", lienzo: lienzo8,
      puntos: [{ x: 156, y: 330 }, { x: 1247, y: 330 }],   // mismos valores que en el HTML
      // completo si un trazo empieza cerca de un punto y termina cerca del otro (en cualquier sentido)
      completo: function (trazos, cerca, P) {
        var t = trazos[trazos.length - 1], a = t[0], b = t[t.length - 1];
        return (cerca(a, P[0]) && cerca(b, P[1])) || (cerca(a, P[1]) && cerca(b, P[0]));
      }
    }),

    /* ============ Pantalla 9: comparación, el tuyo vs lo que esperaba ============ */
    comparacion({
      id: "p9", origen: "p8-canvas",
      puntos: [{ x: 156, y: 330 }, { x: 1247, y: 330 }],
      esperado: [{ x: 156, y: 330 }, { x: 163, y: 527 }, { x: 358, y: 20 }, { x: 320, y: 393 },
                 { x: 488, y: 74 }, { x: 913, y: 540 }, { x: 1124, y: 60 }, { x: 1247, y: 330 }]
    }),

    /* ============ Pantalla 10: juego, líneas rectas 1 → 2 → 3 → 4 ============ */
    juegoDePuntos({
      id: "p10", lienzo: lienzo10,
      puntos: [{ x: 156, y: 330 }, { x: 280, y: 572 }, { x: 872, y: 106 }, { x: 1247, y: 330 }],   // 1, 2, 3, 4
      // completo cuando entre todos los trazos pasó por los cuatro puntos
      completo: function (trazos, cerca, P) {
        return P.every(function (pt) {
          return trazos.some(function (t) { return t.some(function (q) { return cerca(q, pt); }); });
        });
      }
    }),

    /* ============ Pantalla 11: comparación de las líneas rectas ============ */
    comparacion({
      id: "p11", origen: "p10-canvas",
      puntos: [{ x: 156, y: 330, color: "#ff1a1a", num: "1" }, { x: 280, y: 572, color: "#2f74f0", num: "2" },
               { x: 872, y: 106, color: "#a9d062", num: "3" }, { x: 1247, y: 330, color: "#ffcc00", num: "4" }],
      esperado: [{ x: 156, y: 330 }, { x: 280, y: 572 }, { x: 872, y: 106 }, { x: 1247, y: 330 }]
    }),

    /* ============ Pantalla 12: Harold Cohen ============ */
    {
      el: "#p12",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p12-cita");
        gsap.set(".p12-linea",        { autoAlpha: 0, x: 80 * d });
        gsap.set("#p12-profe",        { autoAlpha: 0, y: 60, scale: 0.9, transformOrigin: "50% 100%" });
        gsap.set("#p12-card",         { autoAlpha: 0, x: 120 * d });
        gsap.set("#p12-foto",         { autoAlpha: 0, clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set("#p12-info h2",      { autoAlpha: 0 });
        gsap.set("#p12 .guiones-n1",  { scaleX: 0 });
        gsap.set("#p12-datos li",     { autoAlpha: 0, x: 40 * d });
        gsap.set("#p12-cita .letra",  { autoAlpha: 0 });
        gsap.set("#p12-sello",        { autoAlpha: 0, scale: 0 });
      },
      entrar: function () {
        var g = gsap.utils.toArray("#p12 .guiones-n1");
        return gsap.timeline()
          .to(".p12-linea", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out", stagger: 0.15 })
          .to("#p12-profe", { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, "-=0.2")
          .to("#p12-card",  { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "<")
          // la foto se "imprime" de arriba hacia abajo, a saltos
          .to("#p12-foto",  { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "steps(10)" })
          .to("#p12-info h2", { autoAlpha: 1, duration: 0.3, ease: "steps(3)" }, "<0.2")
          .to(g[0], { scaleX: 1, duration: 0.4, ease: "steps(10)" })
          .to("#p12-datos li", { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out", stagger: 0.2 })
          .to(g[1], { scaleX: 1, duration: 0.4, ease: "steps(10)" })
          .to("#p12-cita .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.02 })
          .to(g[2], { scaleX: 1, duration: 0.4, ease: "steps(10)" })
          .to("#p12-sello", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(3)" })
          .add(function () {
            bucles.push(gsap.to("#p12-profe", { y: -12, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // los íconos saltan de a uno
            bucles.push(gsap.to("#p12-datos li img", { y: -6, duration: 0.3, ease: "steps(2)", stagger: { each: 0.25, repeat: -1, yoyo: true, repeatDelay: 1.2 } }));
            // el sello titila como un cartel
            bucles.push(gsap.to("#p12-sello", { scale: 1.06, duration: 0.5, ease: "steps(2)", yoyo: true, repeat: -1 }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 13: arte con sistemas expertos ============ */
    {
      el: "#p13",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p13-aaron p");   // solo el primer párrafo (la descripción de AARON)
        gsap.set("#p13-titulo",     { autoAlpha: 0, x: 80 * d });
        gsap.set("#p13-linea",      { scaleX: 0, transformOrigin: d > 0 ? "0 50%" : "100% 50%" });
        gsap.set("#p13 .p3-guiones", { scaleX: 0 });
        gsap.set("#p13-reloj",      { autoAlpha: 0, scale: 0, rotation: -180 });
        gsap.set("#p13 .p3-punto, #p13 .p3-flecha", { autoAlpha: 0, scale: 0 });
        gsap.set("#p13 .p3-palo",   { scaleY: 0, transformOrigin: "50% 0" });
        gsap.set("#p13 .p3-etiqueta", { autoAlpha: 0, y: -10 });
        gsap.set("#p13-codo",       { clipPath: "inset(0% 100% 100% 0%)" });
        gsap.set(".p13-card",       { autoAlpha: 0, y: 40 });
        gsap.set(".p13-card h2, .p13-card p", { autoAlpha: 0 });
        gsap.set("#p13 .letra",     { autoAlpha: 0 });
        gsap.set("#p13 .guiones-n1", { scaleX: 0 });
        gsap.set(".p13-obras img",  { autoAlpha: 0, clipPath: "inset(0% 0% 100% 0%)" });
      },
      entrar: function () {
        var hitos = gsap.utils.toArray("#p13 .p13-hito");
        var cards = ["#p13-aaron", "#p13-1980", "#p13-1990"];

        // un hito: aparece el punto, bajan los palitos y cae la etiqueta
        function hito(h) {
          return gsap.timeline()
            .to(h.querySelector(".p3-punto, .p3-flecha"), { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" })
            .to(h.querySelectorAll(".p3-palo")[0], { scaleY: 1, duration: 0.2, ease: "steps(4)" })
            .to(h.querySelector(".p3-etiqueta"), { autoAlpha: 1, y: 0, duration: 0.3, ease: "steps(3)" })
            .to(h.querySelectorAll(".p3-palo")[1] || {}, { scaleY: 1, duration: 0.3, ease: "steps(5)" });
        }
        // una etapa: la tarjeta sube, el texto aparece y las obras se "pintan" de arriba hacia abajo
        function etapa(sel) {
          return gsap.timeline()
            .to(sel, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" })
            .to(sel + " h2", { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
            .to(sel + " p", { autoAlpha: 1, duration: 0.01 }, "<")
            .to(sel + " .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.02 })
            .to(sel + " .guiones-n1", { scaleX: 1, duration: 0.4, ease: "steps(10)" })
            .to(sel + " .p13-obras img", { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "steps(8)", stagger: 0.25 });
        }

        return gsap.timeline()
          .to("#p13-titulo", { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
          .to("#p13-linea", { scaleX: 1, duration: 0.8, ease: "steps(16)" }, "-=0.2")
          .to("#p13 .p3-guiones", { scaleX: 1, duration: 0.6, ease: "steps(8)" }, "<0.2")
          .to("#p13-reloj", { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.8)" }, "<")
          // 1960/70 → AARON
          .add(hito(hitos[0]))
          .to("#p13-codo", { clipPath: "inset(0% 0% 0% 0%)", duration: 0.4, ease: "steps(6)" })
          .add(etapa(cards[0]))
          // 1980
          .add(hito(hitos[1]), "-=0.6")
          .add(etapa(cards[1]))
          // 1990
          .add(hito(hitos[2]), "-=0.6")
          .add(etapa(cards[2]))
          // actualidad
          .add(hito(hitos[3]), "-=0.4")
          .add(function () {
            bucles.push(gsap.to("#p13-reloj", { rotation: 360, duration: 6, ease: "steps(12)", repeat: -1 }));
            bucles.push(gsap.to("#p13 .p3-flecha", { x: 10, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.5 }));
            // los puntos de la línea titilan en orden, como recorriendo el tiempo
            bucles.push(gsap.to("#p13 .p3-punto", { opacity: 0.3, duration: 0.3, ease: "steps(1)", stagger: { each: 0.4, repeat: -1, yoyo: true, repeatDelay: 1 } }));
          });
      },
      salir: pararBucles
    },

    /* ============ Pantalla 14: cuánta memoria ocupan (gráfico que cambia de escala) ============
       Las barras aparecen de a una y en cada una la escala crece para que entre:
       así la barra anterior se "achica" y se ve lo enorme que es la diferencia. */
    (function () {
      var ALTO = 560;   // alto del gráfico en px (igual que #p14-grafico)
      var MODELOS = [
        { id: "aaron", mb: 1.5,   escala: 2 },
        { id: "sd",    mb: 2000,  escala: 2000 },
        { id: "dalle", mb: 24000, escala: 24000 }
      ];
      // estado que anima GSAP: el máximo de la escala y cuánto "creció" cada barra (0 a 1)
      var estado = { max: 2, aaron: 0, sd: 0, dalle: 0 };
      var respira = { aaron: 0, sd: 0, dalle: 0 };   // 0 a 1: cuánto "inflada" está cada barra
      var RESPIRO = 6;                               // px que sube y baja al respirar

      function formato(mb) {
        if (mb >= 1000) return (mb / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " GB";
        return mb.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " MB";
      }
      function dibujar() {
        document.getElementById("p14-escala-max").textContent = formato(estado.max);
        var guias = document.querySelectorAll("#p14 .p14-guia span");
        [1, 0.75, 0.5, 0.25].forEach(function (f, i) { guias[i].textContent = formato(estado.max * f); });
        MODELOS.forEach(function (m) {
          // mínimo 4 px para que la barra chiquita no desaparezca del todo
          var alto = estado[m.id] > 0 ? Math.max(4, Math.min(1, m.mb / estado.max) * ALTO * estado[m.id]) + respira[m.id] * RESPIRO : 0;
          document.getElementById("p14-barra-" + m.id).style.height = alto + "px";
          document.getElementById("p14-valor-" + m.id).style.bottom = (alto + 6 + 14) + "px";
        });
      }
      return {
        el: "#p14",
        preparar: function () {
          var d = Infografia.direccion;
          estado.max = 2; estado.aaron = estado.sd = estado.dalle = 0;
          respira.aaron = respira.sd = respira.dalle = 0;
          dibujar();
          gsap.set("#p14-titulo",     { autoAlpha: 0, x: 80 * d });
          gsap.set("#p14-grafico",    { autoAlpha: 0 });
          gsap.set(".p14-valor, .p14-nombre", { autoAlpha: 0 });
          gsap.set("#p14-importante", { autoAlpha: 0, x: 120 * d });
        },
        entrar: function () {
          var tl = gsap.timeline({ onUpdate: dibujar })
            .to("#p14-titulo",  { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" })
            .to("#p14-grafico", { autoAlpha: 1, duration: 0.4, ease: "steps(4)" });

          MODELOS.forEach(function (m, i) {
            var col = "#p14-barra-" + m.id;
            if (i > 0) {
              // la escala crece hasta que entre la barra nueva (y la anterior se aplasta)
              tl.to("#p14-escala", { scale: 1.15, color: "#fff", duration: 0.2, ease: "steps(2)", yoyo: true, repeat: 1 }, "+=1.2")
                .to(estado, { max: m.escala, duration: 1.8, ease: "expo.inOut" }, "<");
            }
            tl.to(document.querySelector(col).parentNode.querySelector(".p14-nombre"), { autoAlpha: 1, duration: 0.3, ease: "steps(3)" })
              .to(estado, { [m.id]: 1, duration: 1, ease: "steps(12)" }, "<")
              .to(document.getElementById("p14-valor-" + m.id), { autoAlpha: 1, duration: 0.3, ease: "steps(3)" });
          });

          tl.to("#p14-importante", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "+=0.4")
            .add(function () {
              // las barras "respiran": suben y bajan unos px, cada una a su ritmo
              MODELOS.forEach(function (m, i) {
                bucles.push(gsap.to(respira, { [m.id]: 1, duration: 1.1 + i * 0.2, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: dibujar }));
              });
            });
          return tl;
        },
        salir: pararBucles
      };
    })(),

    /* ============ Pantalla 15: fin de la etapa uno → núcleo 2 ============ */
    {
      el: "#p15",
      preparar: function () {
        var d = Infografia.direccion;
        letrasDe("#p15-dialogo");
        gsap.set(".p15-linea",   { autoAlpha: 0, x: 80 * d });
        gsap.set("#p15-caja",    { autoAlpha: 0, x: 120 * d });
        gsap.set("#p15-profe",   { autoAlpha: 0, x: -60 * d, rotation: -6, transformOrigin: "50% 100%" });
        gsap.set("#p15-dialogo .letra", { autoAlpha: 0 });
        gsap.set("#p15-memoria", { autoAlpha: 0, x: -120 * d });
        gsap.set("#p15-flecha",  { autoAlpha: 0, y: -20 });
      },
      entrar: function () {
        return gsap.timeline()
          // "Felicidades" entra con un rebote, como un logro de videojuego
          .to(".p15-linea", { autoAlpha: 1, x: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.2 })
          .to("#p15-caja",  { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "-=0.1")
          .to("#p15-profe", { autoAlpha: 1, x: 0, rotation: 0, duration: 0.7, ease: "back.out(1.8)" }, "-=0.2")
          .to("#p15-dialogo .letra", { autoAlpha: 1, duration: 0.01, stagger: 0.02 }, "-=0.2")
          .to("#p15-memoria", { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" })
          .to("#p15-flecha",  { autoAlpha: 1, y: 0, duration: 0.4, ease: "steps(4)" })
          .add(function () {
            bucles.push(gsap.to("#p15-profe", { y: -6, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // "DOS" y "VERDE" titilan como en la pantalla de la memoria UNO
            bucles.push(gsap.to("#p15-memoria .verde-memoria", { opacity: 0.25, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
            // la flecha señala hacia abajo, hacia la ranura
            bucles.push(gsap.to("#p15-flecha", { y: 14, duration: 0.4, ease: "steps(2)", yoyo: true, repeat: -1, repeatDelay: 0.3 }));
          });
      },
      salir: pararBucles
    }

  ], { transicion: "deslizar", duracion: 0.8 });
}
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(iniciar);
