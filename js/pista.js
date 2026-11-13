/* pista.js: recordatorio del gesto abajo a la derecha (compartido por los tres núcleos).
   - en las primeras pantallas manuales aparece enseguida, cuando terminan las animaciones de entrada;
   - en los juegos de dibujo, en vez del de avanzar aparece "Dibujá sobre la tableta" (y se va al apoyar el lápiz),
     y se apaga la burbuja de "gesto detectado" del contenedor;
   - en el resto, aparece solo si la persona pasa un rato sin avanzar.
   No aparece en las pantallas que ya tienen sus propias indicaciones ni en las que pasan solas (relojito).
   El estilo lo pone cada núcleo en su CSS: #pista-avance y #pista-avance .pista-mano.

   Uso:  Infografia.presentacion(Pista.envolver(pantallas, {
           enseñar: ["#p3"], nunca: ["#p1"], dibujar: ["#p7"], auto: { "#p2": 7 } }), opciones);   */
var Pista = (function () {
  // lápiz pixelado (el mismo del cursor de los juegos del núcleo 1); cada núcleo puede pasar el suyo en cfg.lapiz
  var LAPIZ = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" style="width:1.6em;height:1.6em;vertical-align:middle">' +
    '<path fill="#fff" d="M11 0H13V1H14V2H15V3H16V5H15V6H14V7H13V8H12V9H11V10H10V11H9V12H8V13H7V14H5V15H3V16H0V13H1V11H2V9H3V8H4V7H5V6H6V5H7V4H8V3H9V2H10V1H11Z"/>' +
    '<path fill="#c6ff34" d="M11 1H13V2H14V3H15V5H14V6H13V7H12V8H11V9H10V10H9V11H8V12H7V13H6V12H5V11H4V10H3V9H4V8H5V7H6V6H7V5H8V4H9V3H10V2H11Z"/>' +
    '<path fill="#8a38f5" d="M11 1H13V2H14V3H15V5H14V6H13V5H12V4H11V3H10V2H11Z"/></svg>';

  function envolver(pantallas, cfg) {
    cfg = cfg || {};
    var enseñar = cfg.enseñar || [], dibujar = cfg.dibujar || [];
    var nunca = (cfg.nunca || []).concat(Object.keys(cfg.auto || {}));   // las que pasan solas ya tienen su relojito
    var demora = cfg.demoraEnseñar != null ? cfg.demoraEnseñar : 0.4;     // s después de terminar la entrada
    var inactividad = cfg.inactividad != null ? cfg.inactividad : 20;     // s sin avanzar en el resto
    var CONTENIDO = {
      avanzar: '<span class="pista-mano">' + Manos.svg("der") + '</span> Traé la mano derecha hacia el centro para avanzar',
      dibujar: '<span class="pista-mano">' + (cfg.lapiz || LAPIZ) + '</span> Dibujá sobre la tableta con el lápiz'
    };

    var el = document.createElement("div"), espera = null, latido = null, modo = "";
    el.id = "pista-avance";
    document.getElementById("escenario").appendChild(el);
    gsap.set(el, { autoAlpha: 0 });

    function mostrar() {
      gsap.fromTo(el, { autoAlpha: 0, y: 30, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2.2)" });
      // avanzar: la mano "arrastra" hacia el centro; dibujar: el lápiz hace un garabato
      latido = modo === "dibujar"
        ? gsap.fromTo(el.querySelector(".pista-mano"), { x: 0, y: 0 }, { keyframes: [{ x: 6, y: -4 }, { x: -4, y: 3 }, { x: 0, y: 0 }], duration: 0.8, repeat: -1, repeatDelay: 0.3 })
        : gsap.fromTo(el.querySelector(".pista-mano"), { x: 0 }, { x: -14, duration: 0.45, ease: "power2.inOut", yoyo: true, repeat: -1, repeatDelay: 0.4 });
    }
    function ocultar() {
      if (espera) { espera.kill(); espera = null; }
      if (latido) { latido.kill(); latido = null; }
      gsap.to(el, { autoAlpha: 0, duration: 0.2 });
    }
    function programar(selector) {
      ocultar();
      if (nunca.indexOf(selector) !== -1) return;
      modo = dibujar.indexOf(selector) !== -1 ? "dibujar" : "avanzar";
      el.innerHTML = CONTENIDO[modo];
      var seg = modo === "dibujar" || enseñar.indexOf(selector) !== -1 ? demora : inactividad;
      espera = gsap.delayedCall(seg, mostrar);
    }
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
          r.eventCallback("onComplete", function () { if (fin) fin(); programar(p.el); });
        } else programar(p.el);
        return r;
      };
      p.salir = function (e) { ocultar(); if (salir) return salir(e); };
      return p;
    });
  }

  return { envolver: envolver };
})();
