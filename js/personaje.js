/* personaje.js: arma el personaje del visitante (caraUsuario) con las piezas de assets/carausuario.
   Lo usan el tutorial y la página de prueba. No guarda ninguna foto: sólo colores y medidas.

   Personaje.cargar(ruta)                → promesa; carga las piezas (ruta = carpeta de assets/carausuario/)
   Personaje.dibujar(ctx, rasgos, op)    → dibuja en un canvas. op: { x, y, alto, capas }
                                           x, y = esquina superior izquierda; alto = alto del personaje en px;
                                           capas = cuántas capas dibujar (para la animación de construcción)
   Personaje.desdeCamara(muestras)       → rasgos a partir de varios mensajes cara:{...} del sensado
   Personaje.PREDETERMINADO              → rasgos para cuando no hay cámara

   rasgos = { piel, colorPelo, pelo: "pelo1" | "pelo10" | "ninguno", cejas: bool, boca: "neutra" | "sonrisa", apertura: 0.35..1 } */
var Personaje = (function () {
  /* Cada pieza: recorte útil del png (x, y, ancho, alto, en el archivo) y dónde va su centro sobre el cuerpo
     (coordenadas del cuerpo, 2048x2048), con qué ancho. */
  var PIEZAS = {
    cuerpo: { src: "cuerpobase.png", recorte: [511, 319, 1026, 1584], centro: [1024, 1111], ancho: 1026 },
    ojos:   { src: "ojos1.png",      recorte: [163, 394, 2074, 963],  centro: [1000, 790],  ancho: 520 },
    cejas:  { src: "cejas1.png",     recorte: [183, 705, 2033, 321],  centro: [1000, 610],  ancho: 500 },
    pelo1:  { src: "pelo1.png",      recorte: [576, 191, 1249, 937],  centro: [1000, 520],  ancho: 1120 },
    pelo10: { src: "pelo10.png",     recorte: [462, 65, 1487, 1647],  centro: [990, 880],   ancho: 1330 }
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
  var ACLARAR_PIEL = 1.3;    // la cámara ve la piel más oscura de lo que es
  var OJOS = [{ x: 861, y: 790 }, { x: 1139, y: 790 }], RADIO_OJO = 124;
  var BOCA = { centro: [1000, 975], ancho: 150 };
  var PREDETERMINADO = { piel: "#f5c9a5", colorPelo: "#2b1d14", pelo: "pelo1", cejas: true, boca: "neutra", apertura: 1 };

  var imgs = {}, cargando = null;
  function cargar(ruta) {
    if (cargando) return cargando;
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
      ctx.fillStyle = "#5a1a22"; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.ellipse(cx, cy + w * 0.55, w * 0.3, w * 0.22, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e86a7a"; ctx.fill();
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
    if (n >= 1) pieza(ctx, "cuerpo", n >= 2 ? rasgos.piel : null, E, ox, oy);
    if (n >= 3) { pieza(ctx, "ojos", null, E, ox, oy); parpados(ctx, rasgos, E, ox, oy); }
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
    var recientes = muestras.slice(-8);
    var sonrisas = recientes.filter(function (m) { return m.sonrisa > SONRISA; }).length;
    return {
      piel: masVotado(muestras.map(function (m) { return masParecido(aclarar(m.piel, ACLARAR_PIEL), PALETA.piel); })),
      colorPelo: masVotado(muestras.map(function (m) { return masParecido(m.pelo, PALETA.pelo); })),
      pelo: pelados > muestras.length / 2 ? "ninguno" : "pelo1",
      cejas: true,
      boca: sonrisas >= recientes.length / 2 ? "sonrisa" : "neutra",
      apertura: 0.35 + t * 0.65
    };
  }

  return { cargar: cargar, dibujar: dibujar, ancho: ancho, desdeCamara: desdeCamara, CAPAS: CAPAS,
           PREDETERMINADO: PREDETERMINADO };
})();
