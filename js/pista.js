/* pista.js: recordatorio del gesto abajo a la derecha (compartido por los tres núcleos).
   - en todas las pantallas que no pasan solas aparece cuando terminan las animaciones de entrada;
   - en los juegos de dibujo, en vez del de avanzar aparece "Dibujá sobre la tableta" (y se va al apoyar el lápiz),
     y se apaga la burbuja de "gesto detectado" del contenedor.
   No aparece en las pantallas que ya tienen sus propias indicaciones ni en las que pasan solas (relojito).
   El estilo lo pone cada núcleo en su CSS: #pista-avance y #pista-avance .pista-mano.

   Uso:  Infografia.presentacion(Pista.envolver(pantallas, {
           nunca: ["#p1"], dibujar: ["#p7"], auto: { "#p2": 7 } }), opciones);

   Todas las indicaciones de gestos salen de este cartel (mismo lugar y estilo en todo el núcleo):
         Pista.avisar("Traé la mano derecha hacia el centro para generar")          → con la mano derecha
         Pista.avisar({ izq: "Reintentar", der: "Avanzar" }, " · seguimos en 5 s")   → con las dos manos
         Pista.quitar()
   Llamar de nuevo a avisar con lo mismo sólo actualiza el texto (sirve para cuentas regresivas). */
var Pista = (function () {
  // lápiz pixelado (el mismo del cursor de los juegos del núcleo 1); cada núcleo puede pasar el suyo en cfg.lapiz
  var LAPIZ = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" style="width:1.6em;height:1.6em;vertical-align:middle">' +
    '<path fill="#fff" d="M11 0H13V1H14V2H15V3H16V5H15V6H14V7H13V8H12V9H11V10H10V11H9V12H8V13H7V14H5V15H3V16H0V13H1V11H2V9H3V8H4V7H5V6H6V5H7V4H8V3H9V2H10V1H11Z"/>' +
    '<path fill="#c6ff34" d="M11 1H13V2H14V3H15V5H14V6H13V7H12V8H11V9H10V10H9V11H8V12H7V13H6V12H5V11H4V10H3V9H4V8H5V7H6V6H7V5H8V4H9V3H10V2H11Z"/>' +
    '<path fill="#8a38f5" d="M11 1H13V2H14V3H15V5H14V6H13V5H12V4H11V3H10V2H11Z"/></svg>';

  function envolver(pantallas, cfg) {
    cfg = cfg || {};
    var dibujar = cfg.dibujar || [];
    var nunca = (cfg.nunca || []).concat(Object.keys(cfg.auto || {}));   // las que pasan solas ya tienen su relojito
    var demora = cfg.demoraEnseñar != null ? cfg.demoraEnseñar : 0.4;     // s después de terminar la entrada
    var CONTENIDO = {
      avanzar: '<span class="pista-mano">' + Manos.svg("der") + '</span> Traé la mano derecha hacia el centro para avanzar',
      dibujar: '<span class="pista-mano">' + (cfg.lapiz || LAPIZ) + '</span> Dibujá sobre la tableta con el lápiz'
    };

    var el = document.createElement("div"), espera = null, latido = null, modo = "", actual = null, visible = false;
    // texto del cartel: el de la pantalla (p.pista, por ejemplo "ver el siguiente dato" en un recorrido) o el de avanzar
    function contenido() {
      var propio = modo === "avanzar" && actual && actual.pista ? actual.pista() : null;
      return propio ? '<span class="pista-mano">' + Manos.svg("der") + '</span> ' + propio : CONTENIDO[modo];
    }
    el.id = "pista-avance";
    document.getElementById("escenario").appendChild(el);
    gsap.set(el, { autoAlpha: 0 });

    function mostrar() {
      visible = true;
      gsap.fromTo(el, { autoAlpha: 0, y: 30, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" });
      // avanzar: la mano "arrastra" hacia el centro; dibujar: el lápiz hace un garabato
      latido = modo === "dibujar"
        ? gsap.fromTo(el.querySelector(".pista-mano"), { x: 0, y: 0 }, { keyframes: [{ x: 6, y: -4 }, { x: -4, y: 3 }, { x: 0, y: 0 }], duration: 0.8, repeat: -1, repeatDelay: 0.3 })
        : gsap.fromTo(el.querySelector(".pista-mano"), { x: 0 }, { x: -14, duration: 0.45, ease: "power2.inOut", yoyo: true, repeat: -1, repeatDelay: 0.4 });
    }
    function ocultar() {
      visible = false; ultimoAviso = "";
      if (espera) { espera.kill(); espera = null; }
      if (latido) { latido.kill(); latido = null; }
      gsap.to(el, { autoAlpha: 0, duration: 0.2 });
    }
    function programar(selector, p) {
      actual = p;
      // si la pantalla ya puso su propia indicación (Pista.avisar) durante la entrada, se respeta
      if (ultimoAviso && visible) return;
      ocultar();
      if (nunca.indexOf(selector) !== -1) return;
      modo = dibujar.indexOf(selector) !== -1 ? "dibujar" : "avanzar";
      el.innerHTML = contenido();
      espera = gsap.delayedCall(demora, mostrar);   // apenas termina la entrada, en todas las manuales
    }
    refrescarActual = function () {
      if (modo !== "avanzar" || !actual) return;
      el.innerHTML = contenido();
      if (visible) {
        if (latido) latido.kill();
        latido = gsap.fromTo(el.querySelector(".pista-mano"), { x: 0 }, { x: -14, duration: 0.45, ease: "power2.inOut", yoyo: true, repeat: -1, repeatDelay: 0.4 });
        gsap.fromTo(el, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)" });
      }
    };
    // indicación propia (Pista.avisar): una mano o las dos, con su animación de arrastrar hacia el centro
    var ultimoAviso = "";
    avisarActual = function (que, extra) {
      var clave = typeof que === "string" ? "der:" + que : "ambas:" + que.izq + "|" + que.der;
      var texto = typeof que === "string"
        ? '<span class="pista-mano" data-lado="der">' + Manos.svg("der") + '</span> <span class="pista-texto">' + que + extra + '</span>'
        : '<span class="pista-opcion"><span class="pista-mano" data-lado="izq">' + Manos.svg("izq") + '</span> ' + que.izq + '</span>' +
          '<span class="pista-opcion">' + que.der + ' <span class="pista-mano" data-lado="der">' + Manos.svg("der") + '</span></span>' +
          '<span class="pista-texto pista-nota">' + extra.replace(/^ · /, "") + '</span>';
      if (clave === ultimoAviso && visible) {   // mismo aviso: sólo cambia el texto (cuenta regresiva)
        var t = el.querySelector(".pista-texto");
        if (t) t.innerHTML = typeof que === "string" ? que + extra : extra.replace(/^ · /, "");
        return;
      }
      ultimoAviso = clave;
      if (espera) { espera.kill(); espera = null; }
      if (latido) { latido.kill(); latido = null; }
      modo = "aviso";
      el.innerHTML = texto;
      visible = true;
      gsap.fromTo(el, { autoAlpha: 0, y: 30, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" });
      // cada mano "arrastra" hacia el centro: la derecha hacia la izquierda, la izquierda hacia la derecha
      latido = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
      el.querySelectorAll(".pista-mano").forEach(function (m) {
        latido.fromTo(m, { x: 0 }, { x: m.getAttribute("data-lado") === "izq" ? 14 : -14, duration: 0.45, ease: "power2.inOut", yoyo: true, repeat: 1 }, 0);
      });
    };
    quitarActual = function () { ultimoAviso = ""; ocultar(); };
    // en los juegos, el cartel de "Dibujá" se va cuando la persona apoya el lápiz
    document.getElementById("escenario").addEventListener("pointerdown", function () {
      if (modo === "dibujar") ocultar();
    });

    // envuelve cada pantalla: al terminar su entrada se programa el recordatorio; al salir, se oculta
    return pantallas.map(function (p) {
      var entrar = p.entrar, salir = p.salir;
      p.entrar = function (e) {
        Infografia.confirmarGestos(dibujar.indexOf(p.el) === -1);
        var r = entrar ? entrar(e) : null;
        // se programa cuando terminan las animaciones de entrada de la pantalla
        if (r && typeof r.eventCallback === "function") {
          var fin = r.eventCallback("onComplete");
          r.eventCallback("onComplete", function () { if (fin) fin(); programar(p.el, p); });
        } else programar(p.el, p);
        return r;
      };
      p.salir = function (e) { ocultar(); actual = null; if (salir) return salir(e); };
      return p;
    });
  }
  // cambió lo que hace el gesto en esta pantalla (js/recorrido.js): se actualiza el texto del cartel
  function refrescar() {
    if (!refrescarActual) return;
    refrescarActual();
  }
  var refrescarActual = null;

  // indicación propia de una pantalla o juego, en el mismo cartel (ver arriba)
  function avisar(que, extra) { if (avisarActual) avisarActual(que, extra || ""); }
  function quitar() { if (quitarActual) quitarActual(); }
  var avisarActual = null, quitarActual = null;

  // con dos manos, cada acción va en su propio recuadro y la cuenta regresiva abajo (el resto del estilo es de cada núcleo)
  var estilo = document.createElement("style");
  estilo.textContent =
    "#pista-avance:has(.pista-opcion) { flex-wrap: wrap; justify-content: center; gap: 12px 18px; }" +
    "#pista-avance .pista-opcion { display: inline-flex; align-items: center; gap: 12px; padding: 8px 18px;" +
    "  border: 2px solid currentColor; border-radius: inherit; }" +
    "#pista-avance .pista-nota { flex-basis: 100%; text-align: center; font-size: .75em; opacity: .8; }" +
    "#pista-avance .pista-nota:empty { display: none; }";
  document.head.appendChild(estilo);

  return { envolver: envolver, refrescar: refrescar, avisar: avisar, quitar: quitar };
})();
