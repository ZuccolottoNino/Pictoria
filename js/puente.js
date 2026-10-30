/* puente.js: lo incluye cada núcleo para hablar con la página contenedora.

   El núcleo NUNCA escucha teclas, cámara ni sensores. Solo recibe acciones:
     SIGUIENTE     → pasar a la siguiente pantalla del núcleo
     ANTERIOR      → volver a la pantalla anterior (desde la primera, vuelve al paso anterior del contenedor)
     INTERACTUAR   → el botón; el efecto depende de la pantalla actual (tipo: "corto" | "largo")

   Uso típico (con GSAP cargado antes que este archivo):
     Infografia.escalar("#escenario", 1920, 1080);
     Infografia.presentacion([
       { el: "#p1", preparar(el){}, entrar(el){}, salir(el){}, interactuar(tipo, el){}, transicion: "deslizar" },
       Opcionales: alSiguiente(el) / alAnterior(el) → devolver true para "quedarse" con la acción.
       { el: "#p2", ... }
     ], { transicion: "fundido", duracion: 0.8 });

   Orden en cada cambio de pantalla:
     salir(saliente) → preparar(entrante) → transición entre pantallas → entrar(entrante)
   - preparar: deja los elementos del entrante en su estado inicial (ocultos) ANTES de la transición.
   - entrar:   anima los elementos internos (textos, gráficos). Puede devolver un timeline de GSAP.
   - salir:    limpieza de la pantalla que se va (por ejemplo, matar animaciones en bucle).

   Transiciones disponibles: "fundido", "deslizar", "deslizarVertical", "zoom", "cortina", "ninguna".
*/
(function () {
  function enviar(tipo, extra) {
    try { window.parent.postMessage(Object.assign({ origen: "infografia", tipo: tipo }, extra || {}), "*"); } catch (e) {}
  }

  var manejador = null;
  var hayGsap = function () { return typeof window.gsap !== "undefined"; };
  var hayFlip = function () { return hayGsap() && typeof window.Flip !== "undefined"; };
  if (hayFlip()) gsap.registerPlugin(Flip);

  /* ---------------- Transiciones entre pantallas ----------------
     Cada una recibe (saliente, entrante, duracion) y devuelve un timeline de GSAP.
     Las dos pantallas están visibles a la vez mientras dura la transición. */
  var transiciones = {
    fundido: function (sale, entra, d) {
      var tl = gsap.timeline();
      gsap.set(entra, { autoAlpha: 0, zIndex: 2 });
      return tl.to(entra, { autoAlpha: 1, duration: d, ease: "power1.inOut" });
    },
    deslizar: function (sale, entra, d, dir) {
      gsap.set(entra, { xPercent: 100 * dir, zIndex: 2 });
      return gsap.timeline({ defaults: { duration: d, ease: "power3.inOut" } })
        .to(sale,  { xPercent: -35 * dir, autoAlpha: 0.4 }, 0)
        .to(entra, { xPercent: 0 }, 0);
    },
    deslizarVertical: function (sale, entra, d) {
      gsap.set(entra, { yPercent: 100, zIndex: 2 });
      return gsap.timeline({ defaults: { duration: d, ease: "power3.inOut" } })
        .to(sale,  { yPercent: -35, autoAlpha: 0.4 }, 0)
        .to(entra, { yPercent: 0 }, 0);
    },
    zoom: function (sale, entra, d) {
      gsap.set(entra, { autoAlpha: 0, scale: 0.88, zIndex: 2 });
      return gsap.timeline({ defaults: { duration: d, ease: "power2.inOut" } })
        .to(sale,  { scale: 1.18, autoAlpha: 0 }, 0)
        .to(entra, { scale: 1, autoAlpha: 1 }, d * 0.2);
    },
    cortina: function (sale, entra, d, dir) {
      gsap.set(entra, { clipPath: dir > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)", zIndex: 2 });
      return gsap.timeline()
        .to(entra, { clipPath: "inset(0% 0% 0% 0%)", duration: d, ease: "power3.inOut" }, 0)
        .to(sale,  { xPercent: -8 * dir, duration: d, ease: "power3.inOut" }, 0);
    },
    ninguna: function () { return gsap.timeline(); }
  };

  function limpiar(el) {
    if (hayGsap()) gsap.set(el, { clearProps: "transform,opacity,visibility,clipPath,zIndex" });
  }

  var Infografia = {
    transiciones: transiciones,
    /* 1 = avanzando, -1 = volviendo. Úsenlo en preparar() para que las cosas entren
       desde la derecha al avanzar y desde la izquierda al volver:  x: 60 * Infografia.direccion */
    direccion: 1,
    terminar:  function () { enviar("terminado"); },
    volver:    function () { enviar("volver"); },
    actividad: function () { enviar("actividad"); },
    reiniciar: function () { enviar("reiniciar"); },

    /* Registra una función (accion, datos) para recibir acciones a mano (uso avanzado) */
    alAccion: function (fn) { manejador = fn; enviar("listo"); },

    /* Escala un "escenario" de tamaño fijo (ej. 1920x1080) para que entre en cualquier pantalla,
       manteniendo la proporción. Así diseñás en píxeles fijos y se ve igual en todos lados. */
    escalar: function (selector, ancho, alto) {
      var el = document.querySelector(selector);
      el.style.position = "absolute";
      el.style.width = ancho + "px";
      el.style.height = alto + "px";
      el.style.left = "50%";
      el.style.top = "50%";
      el.style.overflow = "hidden";
      function ajustar() {
        var k = Math.min(window.innerWidth / ancho, window.innerHeight / alto);
        el.style.transform = "translate(-50%, -50%) scale(" + k + ")";
      }
      window.addEventListener("resize", ajustar);
      ajustar();
    },

    /* Motor de presentación: una lista de pantallas, una visible a la vez. */
    presentacion: function (pantallas, opciones) {
      opciones = opciones || {};
      var duracionBase = opciones.duracion || 0.8;
      var transicionBase = opciones.transicion || "fundido";

      var els = pantallas.map(function (p) { return document.querySelector(p.el); });
      els.forEach(function (el) {
        el.hidden = true;
        el.style.position = "absolute";
        el.style.inset = "0";
      });

      var actual = -1, bloqueado = false;

      function esperarA(r) {
        if (r && typeof r.then === "function") return r;
        if (r && typeof r.eventCallback === "function") return new Promise(function (ok) { r.eventCallback("onComplete", ok); });
        return Promise.resolve();
      }

      /* Elementos compartidos (Flip): viven FUERA de las pantallas, en el escenario.
         Cada pantalla declara en qué "pose" va cada uno:  flip: { "#mascota": "p2" }
         y el CSS define la pose con  #mascota[data-pose="p2"] { left:...; top:...; width:... }
         Al cambiar de pantalla, Flip anima el elemento de su pose anterior a la nueva. */
      function aplicarPoses(destino, conAnimacion) {
        if (!destino.flip) return null;
        var sels = Object.keys(destino.flip);
        var estado = (conAnimacion && hayFlip()) ? Flip.getState(sels.join(",")) : null;
        sels.forEach(function (s) {
          var e = document.querySelector(s);
          if (e) e.setAttribute("data-pose", destino.flip[s]);
        });
        return estado;
      }

      async function mostrar(n, dir) {
        bloqueado = true;
        Infografia.direccion = dir || 1;
        var saliente = actual >= 0 ? els[actual] : null;
        var destino = pantallas[n];

        if (saliente && pantallas[actual].salir) pantallas[actual].salir(saliente);
        // Primero se muestra y recién después se prepara: SplitText necesita medir el texto visible
        els[n].hidden = false;
        if (destino.preparar) destino.preparar(els[n]);

        var estadoFlip = aplicarPoses(destino, !!saliente);

        if (saliente) {
          var nombre = destino.transicion || transicionBase;
          var d = destino.duracion || duracionBase;
          if (hayGsap()) {
            var todo = gsap.timeline();
            if (transiciones[nombre]) todo.add(transiciones[nombre](saliente, els[n], d, Infografia.direccion), 0);
            if (estadoFlip) todo.add(Flip.from(estadoFlip, { duration: d, ease: destino.flipEase || "power3.inOut", scale: true }), 0);
            await esperarA(todo);
          }
          saliente.hidden = true;
          limpiar(saliente);
          limpiar(els[n]);
        }

        actual = n;
        bloqueado = false;   // se puede seguir usando mientras corre la animación interna
        if (destino.entrar) destino.entrar(els[n]);
      }

      mostrar(0);

      Infografia.alAccion(function (accion, datos) {
        if (bloqueado) return;
        // Una pantalla puede quedarse con Siguiente/Anterior (ej. un juego):
        // si alSiguiente / alAnterior devuelve true, la acción ya se usó y no se cambia de pantalla.
        var pa = pantallas[actual];
        if (accion === "SIGUIENTE" && pa.alSiguiente && pa.alSiguiente(els[actual]) === true) return;
        if (accion === "ANTERIOR"  && pa.alAnterior  && pa.alAnterior(els[actual]) === true) return;
        if (accion === "SIGUIENTE") {
          if (actual < pantallas.length - 1) mostrar(actual + 1);
          else Infografia.terminar();
        } else if (accion === "ANTERIOR") {
          if (actual > 0) mostrar(actual - 1, -1);
          else Infografia.volver();
        } else if (accion === "INTERACTUAR") {
          var p = pantallas[actual];
          if (p && p.interactuar) p.interactuar((datos && datos.tipo) || "corto", els[actual]);
        }
      });
    }
  };

  window.Infografia = Infografia;

  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var m = e.data;
    if (!m || m.origen !== "contenedor") return;
    if (m.tipo === "accion" && manejador) manejador(m.accion, m.datos || {});
  });

  /* Reenvía el teclado al contenedor (el foco puede estar dentro del núcleo) */
  ["keydown", "keyup"].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      enviar("tecla", { code: e.code, abajo: ev === "keydown" });
    });
  });

  /* Avisa que hay gente usando el núcleo (tableta incluida) para no reiniciar por inactividad */
  var ultimoAviso = 0;
  ["pointerdown", "pointermove", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () {
      var t = Date.now();
      if (t - ultimoAviso > 1000) { ultimoAviso = t; enviar("actividad"); }
    }, { passive: true });
  });
})();
