/* recorrido.js: los mismos dos gestos sirven para recorrer los datos de una pantalla antes de pasar a la siguiente.
   - mano derecha (avanzar): selecciona el siguiente elemento (se resalta y se expande; el resto se atenúa).
     Desde el último, avanza de pantalla como siempre.
   - mano izquierda (volver): vuelve al elemento anterior; desde el primero, deselecciona; sin nada elegido, vuelve de pantalla.
   Abajo a la derecha, el recordatorio (js/pista.js) dice qué hace el gesto: "ver el siguiente dato" o "avanzar".
   Unos puntitos dentro de la pantalla muestran en qué elemento estás.

   Uso:  Recorrido.pantalla(pantalla, {
           items: ".clase",            // los elementos a recorrer, dentro de la pantalla
           puntos: "#contenedor",      // dónde van los puntitos (dentro de la pantalla)
           que: "dato",                // cómo se llama cada elemento en el cartel: "ver el siguiente <que>"
           marcar: function (i, items, el) {}   // opcional: qué más pasa al elegir el i (-1 = ninguno)
         })
   Modo revelar (líneas de tiempo): { revelar: true, mostrar: function (k, items, el) {}, ocultar: function (k, items, el) {} }
     La entrada de la pantalla muestra sólo el primer elemento; cada gesto derecho hace aparecer el siguiente
     (mostrar) y el izquierdo lo vuelve a ocultar (ocultar). Nada se atenúa: lo que ya apareció queda.
     Con unoPorVez: true se ve un solo elemento por vez: el gesto esconde el actual y muestra el siguiente (o el anterior). */
var Recorrido = (function () {
  // estilo de los puntitos (el color lo pone cada núcleo con --recorrido-color)
  var css = document.createElement("style");
  css.textContent =
    ".recorrido-puntos { display: flex; gap: 12px; justify-content: center; pointer-events: none; }" +
    ".recorrido-puntos i { width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--recorrido-color, #8E5BEA); opacity: .55;" +
    "  transition: background .25s, opacity .25s, transform .25s; }" +
    ".recorrido-puntos i.activo { background: var(--recorrido-color, #8E5BEA); opacity: 1; transform: scale(1.25); }" +
    // se atenúa con filter (no con opacity, que la fijan las animaciones de entrada de cada pantalla)
    ".recorrido-item { transition: filter .35s ease; }" +
    ".recorrido-con-eleccion .recorrido-item:not(.elegido) { filter: opacity(.35) saturate(.6); }";
  document.head.appendChild(css);

  function pantalla(p, cfg) {
    var MIN = cfg.inicio != null ? cfg.inicio : -1;   // elegido al entrar (-1 = ninguno)
    var i = MIN, items = [], el = null, puntos = null;
    var preparar = p.preparar, entrar = p.entrar, salir = p.salir;

    function pintar(animar) {
      if (cfg.revelar) {   // en las líneas de tiempo, los puntitos marcan hasta dónde llegaste
        if (puntos) Array.prototype.forEach.call(puntos.children, function (d, k) { d.classList.toggle("activo", cfg.unoPorVez ? k === i : k <= i); });
        if (window.Pista && Pista.refrescar) Pista.refrescar();
        return;
      }
      items.forEach(function (it, k) {
        it.classList.toggle("elegido", k === i);
        gsap.to(it, { scale: k === i ? (cfg.escala || 1.04) : 1, duration: animar ? 0.35 : 0, ease: "back.out(2)" });
      });
      el.classList.toggle("recorrido-con-eleccion", i >= 0);
      if (puntos) Array.prototype.forEach.call(puntos.children, function (d, k) { d.classList.toggle("activo", k === i); });
      if (cfg.marcar) cfg.marcar(i, items, el, animar);
      if (window.Pista && Pista.refrescar) Pista.refrescar();
    }

    p.preparar = function (e) {
      el = e; i = cfg.revelar ? 0 : MIN;
      items = Array.prototype.slice.call(e.querySelectorAll(cfg.items));
      items.forEach(function (it) { it.classList.add("recorrido-item"); });
      if (cfg.puntos && !puntos) {
        puntos = document.createElement("div");
        puntos.className = "recorrido-puntos";
        items.forEach(function () { puntos.appendChild(document.createElement("i")); });
        e.querySelector(cfg.puntos).appendChild(puntos);
      }
      var r = preparar ? preparar.apply(this, arguments) : undefined;
      pintar(false);   // después de que la pantalla dejó todo en su estado inicial
      return r;
    };
    p.entrar = function () { return entrar ? entrar.apply(this, arguments) : null; };
    // al salir queda sin selección (por si otra pantalla copia esta tal como quedó)
    p.salir = function () { i = cfg.revelar ? 0 : MIN; if (el) pintar(false); if (salir) return salir.apply(this, arguments); };
    p.alSiguiente = function () {
      if (i >= items.length - 1) return false;   // desde el último: avanza de pantalla
      i++;
      if (cfg.revelar && cfg.unoPorVez && cfg.ocultar) cfg.ocultar(i - 1, items, el);
      if (cfg.revelar && cfg.mostrar) cfg.mostrar(i, items, el);
      pintar(true); return true;
    };
    p.alAnterior = function () {
      if (cfg.revelar) {                          // oculta el último que apareció; desde el primero, vuelve de pantalla
        if (i <= 0) return false;
        if (cfg.ocultar) cfg.ocultar(i, items, el);
        i--;
        if (cfg.unoPorVez && cfg.mostrar) cfg.mostrar(i, items, el);
        pintar(true); return true;
      }
      if (i <= MIN) return false;                 // en el primero (o sin nada elegido): vuelve de pantalla
      i--; pintar(true); return true;
    };
    // texto del recordatorio: mientras queden elementos, dice que el gesto muestra el siguiente
    p.pista = function () {
      // cfg.siguiente: el texto completo cuando el elemento es femenino ("la siguiente etapa")
      return i < items.length - 1 ? "Traé la mano derecha hacia el centro para ver " + (cfg.siguiente || "el siguiente " + (cfg.que || "dato")) : null;
    };
    return p;
  }

  return { pantalla: pantalla };
})();
