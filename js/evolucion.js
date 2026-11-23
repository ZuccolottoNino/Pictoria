/* evolucion.js: la escena de evolución del personaje del visitante, al estilo de las evoluciones de los juegos.
   Es la primera pantalla de cada núcleo: el personaje que armó el tutorial (js/personaje.js, guardado por
   Evolucion.guardar) pasa de una etapa a la siguiente: se vuelve una silueta de luz, parpadea entre la forma vieja
   y la nueva cada vez más rápido, destello, y aparece la forma nueva (más grande y con otra ropa).

   Uso (en el html del núcleo, una <section id="evo" class="slide"></section> vacía; la arma este archivo):
     Evolucion.pantalla({ el: "#evo", desde: "molde" | "bebe" | "nino", hasta: "bebe" | "nino" | "adulto",
                          antes: "¿Qué está pasando?", titulo: "¡Despertaste!", texto: "Sos una IA recién nacida" })
   letra: { titulo: "60px", p: "30px", antes: "34px" } cambia los tamaños de letra (opcional).
   "molde" es el personaje blanco del tutorial (sin color ni ropa); "huevo", un huevo que se raja y del que sale el bebé. Pasa sola: va con auto en las opciones. */
var Evolucion = (function () {
  var CLAVE = "pictoria-personaje";
  var RUTA = "../assets/carausuario/";

  // el tutorial guarda los rasgos del visitante; los núcleos los leen (si no hay, el predeterminado)
  function guardar(rasgos) {
    rasgos = Object.assign({ id: Date.now() }, rasgos);   // id: para no guardar dos veces al mismo visitante en el historial
    try { localStorage.setItem(CLAVE, JSON.stringify(rasgos)); } catch (e) {}
  }
  function olvidar() { try { localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_PAISAJE); } catch (e) {} }

  /* Historial: los últimos HISTORIAL visitantes que terminaron el recorrido (su personaje y el paisaje que generaron),
     para mostrarle al siguiente "quiénes nacieron antes que vos". Queda guardado en el navegador de la muestra. */
  var CLAVE_PAISAJE = "pictoria-paisaje", CLAVE_HISTORIAL = "pictoria-historial", HISTORIAL = 3;
  // el paisaje que generó el visitante (núcleo 3, difusión): se guarda chico, en jpg
  function guardarPaisaje(canvas) {
    try {
      var c = document.createElement("canvas"), w = 480;
      c.width = w; c.height = Math.round(canvas.height * w / canvas.width);
      c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
      localStorage.setItem(CLAVE_PAISAJE, c.toDataURL("image/jpeg", 0.8));
    } catch (e) {}
  }
  function historial() {
    try { var h = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL)); if (Array.isArray(h)) return h; } catch (e) {}
    return [];
  }
  // suma al visitante actual al historial (una sola vez) y deja sólo los últimos HISTORIAL
  function sumarAlHistorial() {
    var yo = null, paisaje = null;
    try { yo = JSON.parse(localStorage.getItem(CLAVE)); paisaje = localStorage.getItem(CLAVE_PAISAJE); } catch (e) {}
    if (!yo || !yo.piel) return;
    var h = historial().filter(function (v) { return v.rasgos && v.rasgos.id !== yo.id; });
    h.unshift({ rasgos: yo, paisaje: paisaje });
    try { localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(h.slice(0, HISTORIAL))); } catch (e) {}
  }
  function leer() {
    try { var r = JSON.parse(localStorage.getItem(CLAVE)); if (r && r.piel) return r; } catch (e) {}
    return Object.assign({}, Personaje.PREDETERMINADO);
  }

  // mientras se ve una pantalla de evolución, toda la página va oscura (si no, a los costados se ve el fondo del núcleo)
  function fondoOscuro(si) { document.documentElement.classList.toggle("evo-activa", !!si); }

  var css = document.createElement("style");
  css.textContent =
    "html.evo-activa, html.evo-activa body { background: #0b1024 !important; }" +
    "html.evo-activa #fondo-aero { visibility: hidden; }" +
    ".evo { background: radial-gradient(ellipse at 50% 55%, #2b3a6b 0%, #141a33 55%, #070a17 100%) !important; overflow: hidden; color: #fff; }" +
    ".evo-rayos { position: absolute; left: 50%; top: 56%; width: 2600px; height: 2600px; margin: -1300px 0 0 -1300px; opacity: 0;" +
    "  background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.10) 0deg 6deg, rgba(255,255,255,0) 6deg 18deg);" +
    "  -webkit-mask: radial-gradient(circle, #000 0%, transparent 60%); mask: radial-gradient(circle, #000 0%, transparent 60%); }" +
    ".evo-halo { position: absolute; left: 50%; top: 58%; width: 900px; height: 900px; margin: -450px 0 0 -450px; border-radius: 50%; opacity: 0;" +
    "  background: radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(160,200,255,.18) 40%, rgba(255,255,255,0) 70%); }" +
    ".evo canvas { position: absolute; left: 50%; top: 175px; width: 900px; height: 900px; margin-left: -450px; }" +
    ".evo-antes, .evo-texto { position: absolute; left: 120px; right: 120px; text-align: center; }" +
    ".evo-antes { top: 60px; font-size: var(--evo-antes, 56px); line-height: 1.2; }" +
    ".evo-texto { top: 40px; }" +
    ".evo-texto h1 { font-size: var(--evo-titulo, 84px); line-height: 1.1; color: #ffe27a; text-shadow: 0 0 30px rgba(255,210,90,.6); }" +
    ".evo-texto p { margin-top: 14px; font-size: var(--evo-p, 44px); line-height: 1.2; }" +
    ".evo-cierre { position: absolute; left: 0; right: 0; top: 290px; text-align: center; color: #ffe27a; font-size: var(--evo-cierre, 34px); opacity: .85; }" +
    ".evo-tarjetas { position: absolute; left: 0; right: 0; top: 250px; display: flex; justify-content: center; gap: 44px; }" +
    ".evo-tarjeta { position: relative; width: 520px; height: 640px; margin: 0; border-radius: 30px;" +
    "  background: rgba(255,255,255,.08); box-shadow: inset 0 0 0 3px rgba(255,255,255,.25), 0 20px 60px rgba(0,0,0,.45); }" +
    ".evo-cuadro { position: absolute; left: 22px; top: 22px; width: 476px; height: 336px; border-radius: 18px; overflow: hidden;" +
    "  box-shadow: 0 0 0 5px #fff, 0 10px 30px rgba(0,0,0,.35); }" +
    ".evo-cuadro img, .evo-sin-paisaje { display: block; width: 100%; height: 100%; object-fit: cover; }" +
    ".evo-sin-paisaje { background: linear-gradient(180deg, #A9DBFF, #F1E6FF 60%, #6F95CF); }" +
    ".evo-cuadro span { position: absolute; left: 12px; top: 10px; padding: 4px 14px; border-radius: 999px; font-size: 22px;" +
    "  background: rgba(10,14,30,.6); color: #fff; }" +
    ".evo .evo-tarjeta canvas { position: absolute; left: 0; bottom: 0; top: auto; width: 520px; height: 420px; margin: 0; }" +
    ".evo-cierre-abajo { top: auto !important; bottom: 60px; }" +
    ".evo-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }" +
    ".evo-chispa { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 0 16px 6px rgba(255,240,180,.8); opacity: 0; }";
  document.head.appendChild(css);

  function pantalla(cfg) {
    var el, cv, ctx, rasgos, fuera = document.createElement("canvas"), bucles = [], terminado = false;
    var ALTO_MAX = 760;   // alto del adulto en el canvas (900x900); las otras etapas, más chicas

    function forma(nombre) {   // rasgos + tamaño de una etapa
      if (nombre === "molde") return { r: Personaje.enBlancoYNegro(Object.assign({}, rasgos, { etapa: null })), alto: ALTO_MAX * 0.72 };
      return { r: Object.assign({}, rasgos, { etapa: nombre, byn: false }), alto: ALTO_MAX * Personaje.ETAPAS[nombre].tamano };
    }
    /* El huevo (de donde sale el bebé en el núcleo 1): blanco con contorno negro, como el personaje del tutorial.
       huevo.ang = cuánto se tambalea (grados, gira desde la base); huevo.grietas = cuántas grietas tiene (0 a 3). */
    var huevo = { ang: 0, grietas: 0 };
    var GRIETAS = [
      [[-120, -250], [-85, -230], [-60, -262], [-25, -238], [5, -268]],
      [[5, -268], [40, -242], [65, -275], [100, -250], [128, -268]],
      [[-60, -200], [-38, -175], [-58, -150], [-34, -125]]
    ];
    function dibujarHuevo(c) {
      var W = 330, H = 430;
      c.save();
      c.translate(450, 870); c.rotate(huevo.ang * Math.PI / 180);
      var forma = new Path2D();   // forma de huevo: más ancho abajo, en punta arriba
      forma.moveTo(0, -H);
      forma.bezierCurveTo(W * 0.55, -H, W * 0.62, -H * 0.3, W * 0.5, -H * 0.16);
      forma.bezierCurveTo(W * 0.4, -H * 0.02, W * 0.22, 0, 0, 0);
      forma.bezierCurveTo(-W * 0.22, 0, -W * 0.4, -H * 0.02, -W * 0.5, -H * 0.16);
      forma.bezierCurveTo(-W * 0.62, -H * 0.3, -W * 0.55, -H, 0, -H);
      forma.closePath();
      c.fillStyle = "#fff"; c.fill(forma);
      c.save(); c.clip(forma);   // manchitas suaves
      c.fillStyle = "#e6e9f0";
      [[-70, -340, 30], [80, -270, 24], [-45, -150, 36], [90, -120, 20]].forEach(function (m) {
        c.beginPath(); c.arc(m[0], m[1], m[2], 0, Math.PI * 2); c.fill();
      });
      c.restore();
      c.lineWidth = 9; c.strokeStyle = "#000"; c.lineJoin = "round"; c.lineCap = "round"; c.stroke(forma);
      c.lineWidth = 6;
      GRIETAS.slice(0, huevo.grietas).forEach(function (g) {
        c.beginPath(); g.forEach(function (q, i) { if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke();
      });
      c.restore();
    }
    function dibujarForma(c, nombre, escala) {
      if (nombre === "huevo") { dibujarHuevo(c); return; }
      var f = forma(nombre), alto = f.alto * (escala || 1), x = (900 - Personaje.ancho(alto)) / 2, y = 870 - alto;
      Personaje.dibujar(c, f.r, { x: x, y: y, alto: alto });
    }
    // dibuja una etapa parada sobre el piso del canvas; silueta = toda blanca y brillante; escala = para el rebote
    function pintar(nombre, silueta, escala) {
      ctx.clearRect(0, 0, 900, 900);
      if (!silueta) { dibujarForma(ctx, nombre, escala); return; }
      fuera.width = fuera.height = 900;
      var o = fuera.getContext("2d");
      dibujarForma(o, nombre, escala);
      o.globalCompositeOperation = "source-in"; o.fillStyle = "#fff"; o.fillRect(0, 0, 900, 900);
      ctx.save(); ctx.shadowColor = "rgba(190,225,255,1)"; ctx.shadowBlur = 50;
      ctx.drawImage(fuera, 0, 0); ctx.drawImage(fuera, 0, 0);
      ctx.restore();
    }
    function parar() { bucles.forEach(function (b) { b.kill(); }); bucles = []; }

    return {
      el: cfg.el,
      preparar: function (e) {
        fondoOscuro(true);
        el = e; terminado = false;
        if (!el.querySelector("canvas")) {
          el.classList.add("evo");
          // tamaños de letra propios de cada núcleo (ej. la pixelada del núcleo 1 es mucho más ancha)
          Object.keys(cfg.letra || {}).forEach(function (k) { el.style.setProperty("--evo-" + k, cfg.letra[k]); });
          el.innerHTML = '<div class="evo-rayos"></div><div class="evo-halo"></div><canvas width="900" height="900"></canvas>' +
            '<p class="evo-antes"></p><div class="evo-texto"><h1></h1><p></p></div><div class="evo-flash"></div>';
          for (var i = 0; i < 18; i++) el.insertAdjacentHTML("beforeend", '<i class="evo-chispa"></i>');
        }
        cv = el.querySelector("canvas"); ctx = cv.getContext("2d");
        el.querySelector(".evo-antes").textContent = cfg.antes || "¿Qué? ¡Estás evolucionando!";
        el.querySelector(".evo-texto h1").textContent = cfg.titulo;
        el.querySelector(".evo-texto p").textContent = cfg.texto;
        rasgos = leer();
        huevo.ang = 0; huevo.grietas = 0;
        gsap.set(el.querySelectorAll(".evo-antes, .evo-texto, .evo-rayos, .evo-halo, .evo-flash, .evo-chispa"), { autoAlpha: 0 });
        gsap.set(cv, { autoAlpha: 0, y: 30 });
        Personaje.cargar(RUTA).then(function () { if (!terminado) pintar(cfg.desde, false); });
      },
      entrar: function () {
        var tl = gsap.timeline(), t = { k: 0 };
        tl.add(function () { pintar(cfg.desde, false); })
          .to(cv, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" })
          .to(el.querySelector(".evo-antes"), { autoAlpha: 1, duration: 0.5 }, "-=0.2");
        // del huevo: se tambalea tres veces, cada vez más fuerte, y en cada una se raja un poco más
        if (cfg.desde === "huevo") {
          [5, 9, 14].forEach(function (a, i) {
            var g = { v: 0 };
            tl.to(g, { v: 1, duration: 0.9, ease: "none", delay: i ? 0.35 : 0.5,
                onUpdate: function () { huevo.ang = Math.sin(g.v * Math.PI * 4) * a * (1 - g.v * 0.4); pintar("huevo", false); },
                onComplete: function () { huevo.ang = 0; huevo.grietas = i + 1; pintar("huevo", false); } });
          });
        }
        tl
          .to(el.querySelector(".evo-halo"), { autoAlpha: 1, duration: 1 }, "+=0.6")
          .add(function () { pintar(cfg.desde, true); }, "<0.3")
          .add(function () { bucles.push(gsap.to(el.querySelector(".evo-rayos"), { rotation: 360, duration: 14, ease: "none", repeat: -1 })); })
          .to(el.querySelector(".evo-rayos"), { autoAlpha: 1, duration: 0.8 }, "<");
        // parpadeo entre la forma vieja y la nueva, cada vez más rápido (como en los juegos)
        var cambios = [0.5, 0.45, 0.38, 0.32, 0.26, 0.2, 0.16, 0.12, 0.1, 0.08, 0.07, 0.06, 0.06, 0.05, 0.05, 0.05];
        cambios.forEach(function (d, i) {
          tl.add(function () { pintar(i % 2 ? cfg.desde : cfg.hasta, true); }, "+=" + d);
        });
        // destello: aparece la forma nueva con su color, con un rebote y chispas
        var chispas = el.querySelectorAll(".evo-chispa");
        tl.to(el.querySelector(".evo-flash"), { autoAlpha: 1, duration: 0.15 }, "+=0.05")
          .to(el.querySelector(".evo-antes"), { autoAlpha: 0, duration: 0.1 }, "<")
          .add(function () { pintar(cfg.hasta, false); })
          .to(el.querySelector(".evo-flash"), { autoAlpha: 0, duration: 0.9, ease: "power2.out" })
          .to(t, { k: 1, duration: 0.7, ease: "elastic.out(1, 0.45)", onUpdate: function () { pintar(cfg.hasta, false, 0.85 + 0.15 * t.k); } }, "<")
          .to(el.querySelector(".evo-halo"), { autoAlpha: 0.6, duration: 0.5 }, "<");
        chispas.forEach(function (c) {
          var a = Math.random() * Math.PI * 2, d = 250 + Math.random() * 320;
          tl.fromTo(c, { autoAlpha: 1, left: 960, top: 600, scale: 0.6 + Math.random() },
            { immediateRender: false, left: 960 + Math.cos(a) * d, top: 600 + Math.sin(a) * d * 0.8, autoAlpha: 0, duration: 1 + Math.random() * 0.6, ease: "power2.out" }, "<");
        });
        tl.to(el.querySelector(".evo-texto"), { autoAlpha: 1, duration: 0.6 }, "-=1.1")
          .from(el.querySelector(".evo-texto h1"), { scale: 0.6, duration: 0.6, ease: "back.out(2.5)" }, "<")
          .add(function () {
            terminado = true;
            bucles.push(gsap.to(cv, { y: -12, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 }));
          });
        Evolucion.animacion = tl;   // (para las capturas de prueba)
        return tl;
      },
      salir: function () { terminado = true; parar(); fondoOscuro(false); },
      // mientras evoluciona, los gestos no la cortan
      alSiguiente: function () { return !terminado; },
      alAnterior: function () { return true; }
    };
  }

  /* La pregunta del final (después del núcleo 3): tu IA adulta, y detrás la sombra de una forma que todavía no existe,
     que late como si fuera a evolucionar otra vez… pero no: queda la pregunta.
     Evolucion.pregunta({ el: "#evo-sigue", antes, titulo, texto, cierre }) */
  function pregunta(cfg) {
    var el, ctx, rasgos, bucles = [], fuera = document.createElement("canvas");
    function pintar(brillo) {
      ctx.clearRect(0, 0, 900, 900);
      var r = Object.assign({}, rasgos, { etapa: "adulto", byn: false });
      // la sombra de lo que vendría: más grande, sin cara, con un signo de pregunta
      var altoS = 860, xs = (900 - Personaje.ancho(altoS)) / 2;
      fuera.width = fuera.height = 900;
      var o = fuera.getContext("2d");
      Personaje.dibujar(o, Object.assign({}, r, { pelo: "ninguno", anteojos: false }), { x: xs, y: 880 - altoS, alto: altoS, capas: 2 });
      o.globalCompositeOperation = "source-in"; o.fillStyle = "rgba(120,150,255," + (0.18 + 0.5 * brillo) + ")"; o.fillRect(0, 0, 900, 900);
      ctx.save(); ctx.shadowColor = "rgba(150,190,255," + (0.3 + 0.7 * brillo) + ")"; ctx.shadowBlur = 40 + 40 * brillo;
      ctx.drawImage(fuera, 0, 0); ctx.restore();
      ctx.save(); ctx.font = "700 220px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255," + (0.25 + 0.6 * brillo) + ")"; ctx.fillText("?", 450, 330); ctx.restore();
      // adelante, la IA que sos ahora
      var alto = 560;
      Personaje.dibujar(ctx, r, { x: (900 - Personaje.ancho(alto)) / 2, y: 880 - alto, alto: alto });
    }
    return {
      el: cfg.el,
      preparar: function (e) {
        fondoOscuro(true);
        el = e;
        if (!el.querySelector("canvas")) {
          el.classList.add("evo");
          Object.keys(cfg.letra || {}).forEach(function (k) { el.style.setProperty("--evo-" + k, cfg.letra[k]); });
          el.innerHTML = '<div class="evo-rayos"></div><div class="evo-halo"></div><canvas width="900" height="900"></canvas>' +
            '<p class="evo-antes"></p><div class="evo-texto"><h1></h1><p></p></div><p class="evo-cierre"></p>';
        }
        ctx = el.querySelector("canvas").getContext("2d");
        el.querySelector(".evo-antes").textContent = cfg.antes;
        el.querySelector(".evo-texto h1").textContent = cfg.titulo;
        el.querySelector(".evo-texto p").textContent = cfg.texto;
        el.querySelector(".evo-cierre").textContent = cfg.cierre || "";
        rasgos = leer();
        gsap.set(el.querySelectorAll(".evo-antes, .evo-texto, .evo-cierre, .evo-rayos, .evo-halo"), { autoAlpha: 0 });
        gsap.set(el.querySelector("canvas"), { autoAlpha: 0, y: 30 });
        Personaje.cargar(RUTA).then(function () { pintar(0); });
      },
      entrar: function () {
        var cv = el.querySelector("canvas"), b = { v: 0 };
        var tl = gsap.timeline()
          .add(function () { pintar(0); })
          .to(cv, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" })
          .to(el.querySelector(".evo-antes"), { autoAlpha: 1, duration: 0.6 }, "-=0.2")
          .to(el.querySelector(".evo-halo"), { autoAlpha: 0.7, duration: 1 }, "+=0.8")
          .to(el.querySelector(".evo-rayos"), { autoAlpha: 0.6, duration: 1 }, "<")
          // la sombra late tres veces, como si fuera a evolucionar… y se queda en la duda
          .to(b, { v: 1, duration: 0.35, repeat: 5, yoyo: true, ease: "sine.inOut", onUpdate: function () { pintar(b.v); } }, "<")
          .to(el.querySelector(".evo-antes"), { autoAlpha: 0, duration: 0.4 })
          .to(el.querySelector(".evo-texto"), { autoAlpha: 1, duration: 0.6 })
          .from(el.querySelector(".evo-texto h1"), { scale: 0.7, duration: 0.7, ease: "back.out(2)" }, "<")
          .to(el.querySelector(".evo-cierre"), { autoAlpha: 1, duration: 0.6 }, "+=1.2")
          .add(function () {
            bucles.push(gsap.to(el.querySelector(".evo-rayos"), { rotation: 360, duration: 30, ease: "none", repeat: -1 }));
            bucles.push(gsap.to(b, { v: 0.45, duration: 1.8, yoyo: true, repeat: -1, ease: "sine.inOut", onUpdate: function () { pintar(b.v); } }));
          });
        Evolucion.animacion = tl;
        return tl;
      },
      salir: function () { bucles.forEach(function (x) { x.kill(); }); bucles = []; fondoOscuro(false); }
    };
  }

  /* Pantalla final: "Mirá quiénes nacieron antes que vos": los últimos visitantes (ya adultos), cada uno parado
     delante del paisaje que generó. Después de mostrarlos, el visitante actual pasa a ser parte del historial.
     Evolucion.recuerdos({ el, titulo, texto, vacio, cierre }) */
  function recuerdos(cfg) {
    var el, bucles = [];
    return {
      el: cfg.el,
      preparar: function (e) {
        fondoOscuro(true);
        el = e;
        if (!el.querySelector(".evo-tarjetas")) {
          el.classList.add("evo");
          Object.keys(cfg.letra || {}).forEach(function (k) { el.style.setProperty("--evo-" + k, cfg.letra[k]); });
          el.innerHTML = '<div class="evo-rayos"></div><div class="evo-texto"><h1></h1><p></p></div>' +
            '<div class="evo-tarjetas"></div><p class="evo-cierre evo-cierre-abajo"></p>';
        }
        var yo = leer();
        var anteriores = historial().filter(function (v) { return v.rasgos && !(yo.id && v.rasgos.id === yo.id); });
        el.querySelector(".evo-texto h1").textContent = anteriores.length ? cfg.titulo : cfg.vacio;
        el.querySelector(".evo-texto p").textContent = anteriores.length ? cfg.texto : "";
        el.querySelector(".evo-cierre").textContent = cfg.cierre || "";
        var caja = el.querySelector(".evo-tarjetas");
        caja.innerHTML = "";
        anteriores.slice(0, HISTORIAL).forEach(function (v) {
          var f = document.createElement("figure");
          f.className = "evo-tarjeta";
          f.innerHTML = '<div class="evo-cuadro">' + (v.paisaje ? '<img alt="" src="' + v.paisaje + '">' : '<div class="evo-sin-paisaje"></div>') +
            '<span>' + (v.paisaje ? cfg.rotulo || "Su paisaje" : cfg.sinPaisaje || "No llegó a generar su paisaje") + '</span></div>' +
            '<canvas width="520" height="420"></canvas>';
          caja.appendChild(f);
          var cv = f.querySelector("canvas");
          Personaje.cargar(RUTA).then(function () {
            var alto = 360, r = Object.assign({}, v.rasgos, { etapa: "adulto", byn: false });
            Personaje.dibujar(cv.getContext("2d"), r, { x: (520 - Personaje.ancho(alto)) / 2, y: 420 - alto - 8, alto: alto });
          });
        });
        gsap.set(el.querySelectorAll(".evo-texto, .evo-cierre, .evo-rayos"), { autoAlpha: 0 });
        gsap.set(el.querySelectorAll(".evo-tarjeta"), { autoAlpha: 0, y: 80, scale: 0.9 });
      },
      entrar: function () {
        var tl = gsap.timeline()
          .to(el.querySelector(".evo-rayos"), { autoAlpha: 0.5, duration: 1 })
          .to(el.querySelector(".evo-texto"), { autoAlpha: 1, duration: 0.6 }, "<0.2")
          .from(el.querySelector(".evo-texto h1"), { y: -20, duration: 0.6, ease: "back.out(2)" }, "<")
          .to(el.querySelectorAll(".evo-tarjeta"), { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.3, ease: "back.out(1.6)" }, "-=0.2")
          .to(el.querySelector(".evo-cierre"), { autoAlpha: 1, duration: 0.6 }, "+=0.4")
          .add(function () {
            bucles.push(gsap.to(el.querySelector(".evo-rayos"), { rotation: 360, duration: 40, ease: "none", repeat: -1 }));
            el.querySelectorAll(".evo-tarjeta canvas").forEach(function (c, i) {
              bucles.push(gsap.to(c, { y: -10, duration: 1.4 + i * 0.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            });
          });
        sumarAlHistorial();   // ahora vos también quedás para el próximo
        Evolucion.animacion = tl;
        return tl;
      },
      salir: function () { bucles.forEach(function (x) { x.kill(); }); bucles = []; fondoOscuro(false); }
    };
  }

  return { pantalla: pantalla, pregunta: pregunta, recuerdos: recuerdos, guardar: guardar, leer: leer, olvidar: olvidar,
           guardarPaisaje: guardarPaisaje, historial: historial };
})();
