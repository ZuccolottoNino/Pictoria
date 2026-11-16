/* personaje.js: arma el personaje del visitante (caraUsuario) con las piezas de assets/carausuario.
   Lo usan el tutorial y la página de prueba. No guarda ninguna foto: sólo colores y medidas.

   Personaje.cargar(ruta)                → promesa; carga las piezas (ruta = carpeta de assets/carausuario/)
   Personaje.dibujar(ctx, rasgos, op)    → dibuja en un canvas. op: { x, y, alto, capas }
                                           x, y = esquina superior izquierda; alto = alto del personaje en px;
                                           capas = cuántas capas dibujar (para la animación de construcción)
   Personaje.desdeCamara(muestras)       → rasgos a partir de varios mensajes cara:{...} del sensado
   Personaje.PREDETERMINADO              → rasgos para cuando no hay cámara
   Personaje.enBlancoYNegro(rasgos)      → los mismos rasgos sin color (piel y pelo blancos, contorno negro)
   Personaje.brazo(rasgos, op)           → un brazo suelto (imagen + hombros) para moverlo aparte; op como en dibujar
                                           (dibujar con op.brazos = false no dibuja los brazos;
                                           op.parte = "fondo" | "frente": lo que va debajo / encima de los brazos)

   rasgos = { cuerpo: "bebe" | "base", piel, colorPelo, pelo: "pelo2" | "pelo10" | "ninguno", cejas: bool, boca: "neutra" | "sonrisa", apertura: 0.35..1 } */
var Personaje = (function () {
  /* Cada pieza: recorte útil del png (x, y, ancho, alto, en el archivo) y dónde va su centro sobre el cuerpo
     (coordenadas del cuerpo, 2048x2048), con qué ancho. */
  /* Las piezas nuevas vienen en un lienzo de 800x800, todas alineadas con el cuerpo: se pasan a las coordenadas
     del cuerpo (2048) escalando la cabeza para que coincida con la de los ojos y cejas (x3.62, centro 400,310 → 1024,800). */
  var K800 = 3.62;
  function de800(src, rec) {
    return { src: src, recorte: rec, ancho: rec[2] * K800,
             centro: [1024 + (rec[0] + rec[2] / 2 - 400) * K800, 800 + (rec[1] + rec[3] / 2 - 310) * K800] };
  }
  var PIEZAS = {
    // el cuerpo base viene en dos capas: la cabeza (abajo de todo) y el cuerpo (arriba de los brazos)
    cara:      de800("cara_base.png",   [255, 175, 288, 264]),
    base:      de800("cuerpo_base.png", [322, 399, 164, 224]),
    bebe:      de800("cuerpo_bebe.png", [256, 176, 288, 431]),
    // un brazo (el de la izquierda de la pantalla); el otro es el mismo espejado
    brazoBase: de800("brazo_base.png",  [284, 412, 78, 135]),
    brazoBebe: de800("brazo_bebe.png",  [369, 318, 70, 107]),
    ojos:   { src: "ojos1.png",      recorte: [163, 394, 2074, 963],  centro: [1020, 790],  ancho: 520 },
    cejas:  { src: "cejas1.png",     recorte: [183, 705, 2033, 321],  centro: [1020, 610],  ancho: 500 },
    // pelo2 no viene alineado con el cuerpo: va donde iba pelo1 (más arriba, sobre la frente)
    pelo2:  Object.assign(de800("pelo2.png", [248, 229, 304, 229]), { centro: [1020, 520] }),
    pelo10: { src: "pelo10.png",     recorte: [462, 65, 1487, 1647],  centro: [990, 880],   ancho: 1330 }
  };
  /* Ropa y accesorios: vienen centrados en su lienzo de 800 (no sobre el cuerpo). Cada uno dice dónde va su centro
     sobre el cuerpo (coordenadas del lienzo de 800 del cuerpo) y a qué escala. */
  function prenda(src, rec, centro800, escala) {
    return { src: src, recorte: rec, ancho: rec[2] * escala * K800,
             centro: [1024 + (centro800[0] - 400) * K800, 800 + (centro800[1] - 310) * K800] };
  }
  [
    ["bebe_enterito", [312, 306, 175, 192], [405, 508], 0.98],
    ["bebe_babero",   [333, 327, 135, 151], [405, 468], 0.62],
    ["bebe_remera",   [299, 329, 201, 147], [405, 478], 0.95],
    ["nino_remera",   [312, 331, 175, 143], [404, 486], 0.98],
    ["nino_pantalon", [333, 316, 133, 172], [404, 562], 0.86],
    ["nino_buzo",     [277, 321, 246, 162], [404, 490], 1.0],
    ["adulto_camisa", [276, 323, 238, 156], [403, 488], 1.0],
    ["adulto_pantalon", [333, 311, 133, 173], [404, 562], 0.86],
    ["adulto_traje",  [282, 326, 234, 152], [404, 490], 1.0],
    ["anteojos",      [313, 364, 173, 66],  [400, 307], 0.98]
  ].forEach(function (a) { PIEZAS[a[0]] = prenda(a[0] + ".png", a[1], a[2], a[3]); });

  /* Etapas de la evolución: el mismo visitante (piel, pelo, ojos, boca), cambia el cuerpo, el tamaño y la ropa.
     ropa: [pieza, color] en el orden en que se dibuja (lo de abajo primero). */
  var ETAPAS = {
    bebe:   { cuerpo: "bebe", tamano: 0.62, ropa: [["bebe_enterito", "#9fd3f2"], ["bebe_babero", "#fff6c8"]] },
    nino:   { cuerpo: "base", tamano: 0.82, brazos: false, ropa: [["nino_pantalon", "#5b7fc4"], ["nino_remera", "#ffd166"], ["nino_buzo", "#ef6f6c"]] },
    adulto: { cuerpo: "base", tamano: 1, brazos: false,  ropa: [["adulto_pantalon", "#3c4252"], ["adulto_camisa", "#ffffff"], ["adulto_traje", "#4a5878"]] }
  };

  // la caja del personaje dentro del cuerpo (lo que se ve), en coordenadas del cuerpo
  var CAJA = { x: 380, y: 160, w: 1300, h: 1760 };
  var PALETA = {
    piel: ["#ffe3cf", "#f5c9a5", "#d9a074", "#a8704a", "#6e4630"],
    pelo: ["#2b1d14", "#6b4226", "#c28a4a", "#e8c76a", "#9a9a9a", "#b8452d"]
  };
  // medida de la cámara (alto/ancho del ojo): con la cámara de la muestra, ojos comunes dan ~0.40
  var OJOS_ACHINADOS = 0.26, OJOS_REDONDOS = 0.42;
  var SONRISA = 0.15;        // desde cuánto se toma como sonrisa (0 … 1)
  var ACLARAR_PIEL = 1.3;
  var ANTEOJOS = 0.35;       // desde cuánto borde sobre el puente de la nariz se toma como anteojos (calibrar con la cámara)    // la cámara ve la piel más oscura de lo que es
  var OJOS = [{ x: 881, y: 790 }, { x: 1159, y: 790 }], RADIO_OJO = 124;
  var BOCA = { centro: [1020, 975], ancho: 150 };
  /* Brazos del bebé: giran desde el hombro (coordenadas del cuerpo). pivote = el hombro dentro del recorte del png;
     INCLINACION = cuánto viene inclinado hacia afuera el dibujo (se endereza para que 0° sea colgando derecho). */
  var BRAZOS = {
    base: { pieza: "brazoBase", hombros: { der: [843, 1205], izq: [1227, 1205] }, pivote: [66, 10], largo: 413, INCLINACION: 21, REPOSO: 21 },
    bebe: { pieza: "brazoBebe", hombros: { der: [838, 1289], izq: [1251, 1289] }, pivote: [55, 18], largo: 300, INCLINACION: 20.6, REPOSO: 14 }
  };
  var PREDETERMINADO = { cuerpo: "base", piel: "#f5c9a5", colorPelo: "#2b1d14", pelo: "ninguno", cejas: true, boca: "neutra", apertura: 1 };

  var imgs = {}, cargando = null, RUTA = "";
  function cargar(ruta) {
    if (cargando) return cargando;
    RUTA = ruta;
    cargando = Promise.all(Object.keys(PIEZAS).map(function (k) {
      return new Promise(function (ok) {
        var im = new Image();
        im.onload = im.onerror = function () { ok(); };
        im.src = ruta + PIEZAS[k].src;
        imgs[k] = im;
      });
    }));
    return cargando;
  }

  var aux = document.createElement("canvas");
  // pinta una pieza: lo blanco toma el color, lo negro queda negro (multiplicar), respetando la transparencia
  function pieza(ctx, k, color, E, ox, oy) {
    var p = PIEZAS[k], r = p.recorte, w = p.ancho, h = r[3] * w / r[2], im = imgs[k];
    if (!im || !im.naturalWidth) return;
    var x = ox + (p.centro[0] - w / 2 - CAJA.x) * E, y = oy + (p.centro[1] - h / 2 - CAJA.y) * E;
    if (!color) { ctx.drawImage(im, r[0], r[1], r[2], r[3], x, y, w * E, h * E); return; }
    aux.width = Math.max(1, Math.ceil(w * E)); aux.height = Math.max(1, Math.ceil(h * E));
    var a = aux.getContext("2d");
    a.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, aux.width, aux.height);
    a.globalCompositeOperation = "multiply";
    a.fillStyle = color; a.fillRect(0, 0, aux.width, aux.height);
    a.globalCompositeOperation = "destination-in";
    a.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, aux.width, aux.height);
    a.globalCompositeOperation = "source-over";
    ctx.drawImage(aux, x, y);
  }
  // una pieza tenida sola en un canvas nuevo (para los brazos, que se mueven aparte)
  function tenida(k, color, E) {
    var p = PIEZAS[k], r = p.recorte, w = p.ancho, h = r[3] * w / r[2], im = imgs[k];
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w * E)); c.height = Math.max(1, Math.ceil(h * E));
    if (!im || !im.naturalWidth) return c;
    var a = c.getContext("2d");
    a.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, c.width, c.height);
    a.globalCompositeOperation = "multiply"; a.fillStyle = color; a.fillRect(0, 0, c.width, c.height);
    a.globalCompositeOperation = "destination-in"; a.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, c.width, c.height);
    return c;
  }
  /* Personaje.brazo(rasgos, op) → datos para dibujar un brazo aparte (en un svg) con el mismo op que dibujar:
     { url, ancho, alto, pivote: [x, y] dentro de la imagen, hombros: { der: [x, y], izq: [x, y] }, largo, inclinacion }
     url es el png entero (800x800) sin teñir: ancho/alto/pivote son de ese png a escala; el color va con un filtro
     (con file:// no se puede sacar una imagen teñida de un canvas).
     La imagen es la del brazo de la izquierda de la pantalla (der = derecha del personaje, visto de frente);
     la del otro lado se espeja. */
  function brazo(rasgos, op) {
    rasgos = rasgos || PREDETERMINADO; op = op || {};
    var cuerpo = ETAPAS[rasgos.etapa] ? ETAPAS[rasgos.etapa].cuerpo : rasgos.cuerpo;
    var BRAZO = BRAZOS[cuerpo] || BRAZOS.base;
    var E = (op.alto || 500) / CAJA.h, ox = op.x || 0, oy = op.y || 0, p = PIEZAS[BRAZO.pieza];
    var k = p.ancho / p.recorte[2] * E, im = imgs[BRAZO.pieza], W = (im && im.naturalWidth) || 800, H = (im && im.naturalHeight) || 800;
    function pt(b) { return [ox + (b[0] - CAJA.x) * E, oy + (b[1] - CAJA.y) * E]; }
    return { url: RUTA + p.src, src: p.src, pieza: BRAZO.pieza, ancho: W * k, alto: H * k,
             pivote: [(p.recorte[0] + BRAZO.pivote[0]) * k, (p.recorte[1] + BRAZO.pivote[1]) * k],
             recorte: { ancho: p.recorte[2] * k, alto: p.recorte[3] * k, pivote: [BRAZO.pivote[0] * k, BRAZO.pivote[1] * k] },
             hombros: { der: pt(BRAZO.hombros.der), izq: pt(BRAZO.hombros.izq) }, largo: BRAZO.largo * E,
             inclinacion: BRAZO.INCLINACION, reposo: BRAZO.REPOSO };
  }
  // dibuja los dos brazos quietos en el canvas (para la construcción)
  function brazosQuietos(ctx, rasgos, op) {
    var b = brazo(rasgos, op), c = tenida(b.pieza, rasgos.piel, (op.alto || 500) / CAJA.h * 2);
    ["der", "izq"].forEach(function (lado) {
      var h = b.hombros[lado], s = lado === "der" ? 1 : -1;
      ctx.save(); ctx.translate(h[0], h[1]); ctx.scale(s, 1);
      ctx.rotate((b.reposo - b.inclinacion) * Math.PI / 180);
      ctx.drawImage(c, -b.recorte.pivote[0], -b.recorte.pivote[1], b.recorte.ancho, b.recorte.alto);
      ctx.restore();
    });
  }
  function parpados(ctx, rasgos, E, ox, oy) {
    var a = rasgos.apertura;
    if (a == null || a >= 0.99) return;
    OJOS.forEach(function (o) {
      var cx = ox + (o.x - CAJA.x) * E, cy = oy + (o.y - CAJA.y) * E, r = RADIO_OJO * E, m = 7.5 * E;
      var arriba = cy - r + (1 - a) * r * 1.3, abajo = cy + r - (1 - a) * r * 0.5;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r + m, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = rasgos.piel;
      ctx.beginPath();
      ctx.moveTo(cx - r - m, cy - r - m); ctx.lineTo(cx + r + m, cy - r - m);
      ctx.lineTo(cx + r + m, arriba); ctx.quadraticCurveTo(cx, arriba + r * 0.18, cx - r - m, arriba);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r - m, cy + r + m); ctx.lineTo(cx + r + m, cy + r + m);
      ctx.lineTo(cx + r + m, abajo); ctx.quadraticCurveTo(cx, abajo - r * 0.12, cx - r - m, abajo);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#000"; ctx.lineCap = "round";
      ctx.lineWidth = 11 * E;
      ctx.beginPath(); ctx.moveTo(cx - r - m, arriba); ctx.quadraticCurveTo(cx, arriba + r * 0.18, cx + r + m, arriba); ctx.stroke();
      ctx.lineWidth = 6 * E;
      ctx.beginPath(); ctx.moveTo(cx - r - m, abajo); ctx.quadraticCurveTo(cx, abajo - r * 0.12, cx + r + m, abajo); ctx.stroke();
      ctx.restore();
    });
  }
  function boca(ctx, rasgos, E, ox, oy) {
    var cx = ox + (BOCA.centro[0] - CAJA.x) * E, cy = oy + (BOCA.centro[1] - CAJA.y) * E, w = BOCA.ancho * E;
    ctx.save();
    ctx.lineWidth = 13 * E; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#000";
    if (rasgos.boca === "sonrisa") {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy - w * 0.12);
      ctx.quadraticCurveTo(cx, cy - w * 0.2, cx + w / 2, cy - w * 0.12);
      ctx.quadraticCurveTo(cx + w * 0.45, cy + w * 0.6, cx, cy + w * 0.62);
      ctx.quadraticCurveTo(cx - w * 0.45, cy + w * 0.6, cx - w / 2, cy - w * 0.12);
      ctx.closePath();
      ctx.fillStyle = rasgos.byn ? "#2a2a2a" : "#5a1a22"; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy + w * 0.55, w * 0.3, w * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = rasgos.byn ? "#fff" : "#e86a7a"; ctx.fill();
      ctx.restore();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.32, cy);
      ctx.quadraticCurveTo(cx, cy + w * 0.22, cx + w * 0.32, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // capas, en orden de construcción: 1 cuerpo blanco, 2 piel, 3 ojos (y párpados), 4 cejas, 5 pelo, 6 boca
  var CAPAS = 6;
  function dibujar(ctx, rasgos, op) {
    rasgos = rasgos || PREDETERMINADO;
    op = op || {};
    var E = (op.alto || 500) / CAJA.h, ox = op.x || 0, oy = op.y || 0, n = op.capas == null ? CAPAS : op.capas;
    // orden: cabeza → brazos → cuerpo → cara (ojos, cejas, pelo, boca).
    // op.parte = "fondo" dibuja sólo la cabeza; "frente", todo lo que va arriba de los brazos (para moverlos aparte en el medio)
    var etapa = ETAPAS[rasgos.etapa];
    var bebe = (etapa ? etapa.cuerpo : rasgos.cuerpo) === "bebe", piel = n >= 2 ? rasgos.piel : null;
    if (op.parte !== "frente" && !bebe && n >= 1) pieza(ctx, "cara", piel, E, ox, oy);
    if (op.parte === "fondo") return;
    if (!op.parte && n >= 2 && op.brazos !== false && !(etapa && etapa.brazos === false)) brazosQuietos(ctx, rasgos, op);   // con mangas, los brazos quedan adentro de la ropa
    if (n >= 1) pieza(ctx, bebe ? "bebe" : "base", piel, E, ox, oy);
    if (etapa && n >= 2) etapa.ropa.forEach(function (r) { pieza(ctx, r[0], r[1], E, ox, oy); });
    if (n >= 3) { pieza(ctx, "ojos", null, E, ox, oy); parpados(ctx, rasgos, E, ox, oy); }
    if (n >= 3 && rasgos.anteojos) pieza(ctx, "anteojos", "#3a3f4b", E, ox, oy);
    if (n >= 4 && rasgos.cejas) pieza(ctx, "cejas", null, E, ox, oy);
    if (n >= 5 && rasgos.pelo !== "ninguno") pieza(ctx, rasgos.pelo, rasgos.colorPelo, E, ox, oy);
    if (n >= 6) boca(ctx, rasgos, E, ox, oy);
  }
  // ancho del personaje para un alto dado (para centrarlo)
  function ancho(alto) { return alto * CAJA.w / CAJA.h; }

  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function masParecido(color, paleta) {
    var c = rgb(color), mejor = paleta[0], dMin = Infinity;
    paleta.forEach(function (p) {
      var q = rgb(p), d = Math.pow(c[0] - q[0], 2) + Math.pow(c[1] - q[1], 2) + Math.pow(c[2] - q[2], 2);
      if (d < dMin) { dMin = d; mejor = p; }
    });
    return mejor;
  }
  function masVotado(lista) {
    var cuenta = {}, mejor = lista[0], max = 0;
    lista.forEach(function (v) { cuenta[v] = (cuenta[v] || 0) + 1; if (cuenta[v] > max) { max = cuenta[v]; mejor = v; } });
    return mejor;
  }
  function aclarar(hex, f) {
    return "#" + rgb(hex).map(function (v) { return ("0" + Math.min(255, Math.round(v * f)).toString(16)).slice(-2); }).join("");
  }
  // varios mensajes de la cámara → un solo personaje (gana el tono que más veces se detectó).
  // La sonrisa se toma de los últimos 2 segundos: si estás sonriendo cuando se arma, sale sonriendo.
  function desdeCamara(muestras) {
    if (!muestras || !muestras.length) return Object.assign({}, PREDETERMINADO);
    var ojos = muestras.map(function (m) { return m.ojos; }).filter(function (v) { return typeof v === "number"; }).sort();
    var medida = ojos.length ? ojos[Math.floor(ojos.length * 0.75)] : OJOS_REDONDOS;
    var t = Math.max(0, Math.min(1, (medida - OJOS_ACHINADOS) / (OJOS_REDONDOS - OJOS_ACHINADOS)));
    var pelados = muestras.filter(function (m) { return m.pelado; }).length;
    var conAnteojos = muestras.filter(function (m) { return m.anteojos > ANTEOJOS; }).length;
    var recientes = muestras.slice(-8);
    var sonrisas = recientes.filter(function (m) { return m.sonrisa > SONRISA; }).length;
    return {
      cuerpo: "base",
      piel: masVotado(muestras.map(function (m) { return masParecido(aclarar(m.piel, ACLARAR_PIEL), PALETA.piel); })),
      colorPelo: masVotado(muestras.map(function (m) { return masParecido(m.pelo, PALETA.pelo); })),
      pelo: pelados > muestras.length / 2 ? "ninguno" : "pelo2",
      cejas: true,
      anteojos: conAnteojos > muestras.length / 2,
      boca: sonrisas >= recientes.length / 2 ? "sonrisa" : "neutra",
      apertura: 0.35 + t * 0.65
    };
  }

  // la misma forma (pelo, ojos, cejas, boca) pero en blanco y negro, como un dibujo sin pintar
  function enBlancoYNegro(rasgos) {
    return Object.assign({}, rasgos || PREDETERMINADO, { piel: "#ffffff", colorPelo: "#ffffff", byn: true });
  }

  return { ETAPAS: ETAPAS, enBlancoYNegro: enBlancoYNegro, cargar: cargar, dibujar: dibujar, ancho: ancho, desdeCamara: desdeCamara, brazo: brazo, CAPAS: CAPAS,
           PREDETERMINADO: PREDETERMINADO };
})();
