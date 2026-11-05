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
       Pantallas automáticas: Infografia.presentacion(pantallas, { auto: { "#p2": 8, ... } })
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
  var alVotos = null;   // respuesta pendiente de Infografia.pedirVotos
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
    /* Encuesta: el contenedor guarda la respuesta (ej. Infografia.votar("usa-ia", "si")) */
    votar:     function (pregunta, respuesta) { enviar("voto", { pregunta: pregunta, respuesta: respuesta }); },
    /* Pide al contenedor el resumen de votos de una pregunta; responde con alRecibir({ si, no }) */
    pedirVotos: function (pregunta, alRecibir) { alVotos = alRecibir; enviar("pedir-votos", { pregunta: pregunta }); },
    /* Prende/apaga la burbuja de "gesto detectado" del contenedor (ej. apagada en los juegos de dibujo) */
    confirmarGestos: function (activa) { enviar("confirmacion", { activa: !!activa }); },
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

      /* ---------- Pantallas automáticas ----------
         opciones.auto = { "#id": segundos, ... }: esas pantallas pasan solas a la siguiente.
         El reloj arranca cuando termina la animación de entrada y se ve como un relojito
         (aro que se vacía + segundos) abajo a la derecha. Los gestos siguen funcionando:
         avanzar la saltea, volver vuelve. Color del aro: variable CSS --auto-color de cada núcleo. */
      var AUTO = opciones.auto || {}, autoTween = null, reloj = null;
      function crearReloj() {
        var d = document.createElement("div");
        d.id = "auto-reloj";
        d.setAttribute("style", "position:fixed;right:2.2vmin;bottom:2.2vmin;width:9vmin;height:9vmin;z-index:40;pointer-events:none;" +
          "opacity:0;transition:opacity .3s;display:flex;align-items:center;justify-content:center;");
        d.innerHTML =
          '<svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)">' +
          '<circle cx="50" cy="50" r="44" fill="rgba(0,0,0,.55)" stroke="rgba(255,255,255,.25)" stroke-width="8"/>' +
          '<circle class="aro" cx="50" cy="50" r="44" fill="none" stroke="var(--auto-color, #fff)" stroke-width="8"' +
          ' stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg>' +
          '<span style="position:relative;font:700 3.4vmin/1 system-ui,sans-serif;color:#fff"></span>';
        document.body.appendChild(d);
        return d;
      }
      function pararAuto() {
        if (autoTween) { autoTween.kill(); autoTween = null; }
        if (reloj) reloj.style.opacity = 0;
      }
      function arrancarAuto(seg) {
        if (!hayGsap()) return;
        reloj = reloj || crearReloj();
        var aro = reloj.querySelector(".aro"), num = reloj.querySelector("span"), t = { v: 0 };
        reloj.style.opacity = 1;
        autoTween = gsap.to(t, { v: 1, duration: seg, ease: "none",
          onUpdate: function () {
            aro.setAttribute("stroke-dashoffset", (276.5 * t.v).toFixed(1));   // el aro se vacía
            num.textContent = Math.ceil(seg * (1 - t.v)) || "";
          },
          onComplete: function () { pararAuto(); Infografia.avanzar(); } });
      }

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
        pararAuto();
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
        var entrada = destino.entrar ? destino.entrar(els[n]) : null;
        // pantalla automática: el reloj arranca cuando termina su animación de entrada
        if (AUTO[destino.el]) {
          var esta = n;
          esperarA(entrada).then(function () { if (actual === esta) arrancarAuto(AUTO[destino.el]); });
        }
      }

      // ?inicio=<id de pantalla> en la URL arranca directo en esa pantalla (atajos de prueba del panel)
      var inicio = 0;
      try {
        var pedida = new URLSearchParams(location.search).get("inicio");
        for (var k = 0; pedida && k < pantallas.length; k++) if (pantallas[k].el === "#" + pedida) inicio = k;
      } catch (e) {}
      mostrar(inicio);

      /* Avanzar desde el propio núcleo (ej. un juego que pasa solo de etapa al terminar).
         Igual que el gesto de avanzar, pero sin pasar por alSiguiente. */
      Infografia.avanzar = function () {
        if (bloqueado) return;
        if (actual < pantallas.length - 1) mostrar(actual + 1);
        else Infografia.terminar();
      };
      // Ir a una pantalla por su selector (ej. reiniciar el tutorial con irA("#t1")). Entra como "volviendo".
      Infografia.irA = function (sel) {
        if (bloqueado) return;
        for (var k = 0; k < pantallas.length; k++) if (pantallas[k].el === sel) return mostrar(k, -1);
      };

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
    if (m.tipo === "votos" && alVotos) { alVotos({ si: m.si || 0, no: m.no || 0 }); alVotos = null; }
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
