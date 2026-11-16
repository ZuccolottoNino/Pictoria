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
  function guardar(rasgos) { try { localStorage.setItem(CLAVE, JSON.stringify(rasgos)); } catch (e) {} }
  function olvidar() { try { localStorage.removeItem(CLAVE); } catch (e) {} }
  function leer() {
    try { var r = JSON.parse(localStorage.getItem(CLAVE)); if (r && r.piel) return r; } catch (e) {}
    return Object.assign({}, Personaje.PREDETERMINADO);
  }

  var css = document.createElement("style");
  css.textContent =
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
      salir: function () { terminado = true; parar(); },
      // mientras evoluciona, los gestos no la cortan
      alSiguiente: function () { return !terminado; },
      alAnterior: function () { return true; }
    };
  }

  return { pantalla: pantalla, guardar: guardar, leer: leer, olvidar: olvidar };
})();
