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

   rasgos = { cuerpo: "bebe" | "base", piel, colorPelo, pelo: "pelo3" … "pelo11" | "ninguno", cejas: bool, boca: "neutra" | "sonrisa", apertura: 0.35..1 } */
var Personaje = (function () {

  /* #####################################################################################################################
     ##  AJUSTES DEL SENSADO DE LA PERSONA (cómo se arma el personaje con lo que ve la cámara)                            ##
     ##  Todo lo que hay que tocar el día de la muestra está acá. La otra mitad está en sensado/config.py (bloque CARA).  ##
     #####################################################################################################################

     CÓMO CALIBRAR
       1. Abrí el sensado (cd sensado  →  C:\Python312\python.exe sensado_manos.py).
       2. En la muestra, tecla D → "Ver mi personaje en vivo (caraUsuario)" (o abrí pruebas/carausuario.html).
       3. Parate frente a la cámara. A la derecha, "Lo que mide la cámara" muestra los números de abajo (0 … 1)
          y "Lo que decide el programa" muestra qué eligió.
       4. Si algo sale mal, mirá el número que midió, compará con el umbral de acá y movelo.
          Guardá el archivo y recargá la página (F5). No hace falta reiniciar Python para estos valores.
     Regla general: un UMBRAL es "desde cuánto". Bajarlo = lo detecta más fácil; subirlo = más difícil. */

  // ---------- COLOR DE PIEL Y DE PELO ----------
  // El lugar es oscuro y la cámara ve todo más oscuro de lo que es. Antes de elegir el color de la paleta,
  // se aclara lo que vio la cámara. 1 = tal cual; más alto = más claro.
  //   Ejemplo: a todos les sale la piel más oscura de lo que es → subí LUZ_PIEL a 1.8.
  //            a todos les sale la piel muy clara (blanca) → bajá LUZ_PIEL a 1.3.
  //            el pelo castaño sale negro → subí LUZ_PELO a 1.5.   El pelo negro sale castaño → bajala a 1.2.
  //   (LUZ_PELO también aclara el color de la remera.)
  var LUZ_PIEL = 1.6;
  var LUZ_PELO = 1.35;

  // ---------- LARGO DEL PELO ----------
  // "Largo del pelo" (0 … 1) = cuánto pelo ve la cámara al costado de la mandíbula, del cuello y sobre los hombros.
  //   0 … MUY_CORTO       → muy corto (rapado)
  //   MUY_CORTO … CORTO   → corto
  //   CORTO … LARGO       → medio
  //   LARGO … 1           → largo
  //   Ejemplo: una chica de pelo largo marca 0.55 y sale "medio" → bajá LARGO a 0.5.
  //            un chico de pelo corto marca 0.35 y sale "medio" → subí CORTO a 0.4.
  //   (Si el pelo largo marca muy poco, también se puede subir CARA_PESO_HOMBROS en sensado/config.py.)
  var MUY_CORTO = 0.10;
  var CORTO = 0.3;
  var LARGO = 0.65;

  // ---------- FLEQUILLO ----------
  // "Flequillo" (0 … 1) = cuánto de la frente tapa el pelo. Desde CON_FLEQUILLO se eligen peinados con flequillo.
  //   Ejemplo: alguien con flequillo marca 0.4 y sale sin → bajá a 0.35.  Le sale flequillo a gente sin → subí a 0.75.
  var CON_FLEQUILLO = 0.6;

  // ---------- RULOS ----------
  // "Rulos" (0 … ~1) = textura del pelo arriba de la cabeza (los rulos y las ondas tienen muchos bordes; el lacio, pocos).
  //   Ejemplo: una persona con rulos marca 0.25 y sale lacio → bajá RULOS a 0.2.
  //            gente de pelo lacio sale con rulos (pasa con luz dura o pelo despeinado) → subí a 0.45.
  var RULOS = 0.35;

  // ---------- ANTEOJOS ----------
  // "Anteojos" (0 … 1) = cuánto borde hay entre los ojos, sobre el puente de la nariz (el armazón deja una línea).
  // Sale con anteojos si más de la mitad de los cuadros superan ANTEOJOS.
  //   Ejemplo: con anteojos marca 0.25 y no los pone → bajá a 0.2.   Sin anteojos marca 0.4 y se los pone → subí a 0.5.
  //   (Los armazones finos o transparentes marcan poco: puede que no se detecten nunca.)
  var ANTEOJOS = 0.35;
  var ESCALA_ANTEOJOS = 0.85;   // tamaño del dibujo de los anteojos (1 = original; 0.85 = 15 % más chicos)

  // ---------- SONRISA ----------
  // "Sonrisa" (0 … 1). Se mira lo de los últimos ~2 segundos: si sonreís cuando se arma, sale sonriendo.
  //   Ejemplo: sonriendo marca 0.1 y sale seria → bajá SONRISA a 0.08.   Seria marca 0.2 y sale sonriendo → subí a 0.3.
  var SONRISA = 0.15;

  // ---------- FORMA DE LOS OJOS ----------
  // "Ojos abiertos" = alto / ancho del ojo. Hasta OJOS_ACHINADOS sale con ojos bien achinados; desde OJOS_REDONDOS,
  // redondos; en el medio, algo intermedio. Con la cámara de la muestra, ojos comunes dan ~0.40.
  //   Ejemplo: a todos les salen ojos achinados → bajá los dos (0.22 y 0.36). A nadie le salen achinados → subilos.
  var OJOS_ACHINADOS = 0.26;
  var OJOS_REDONDOS = 0.42;

  // ---------- MIRADA ----------
  // Cuánto se mueven las pupilas para seguirte (en el tutorial). 0 = no se mueven; 50 = casi tocan el borde del ojo.
  var MIRADA_MAX = 34;
  /* ##################################### FIN DE LOS AJUSTES DEL SENSADO ##################################### */

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
    // ojos en 3 capas (mismo lienzo): el blanco con el contorno, la pupila (se mueve para mirar) y los brillos
    ojos:   { src: "ojo1.png",       recorte: [163, 394, 2074, 963],  centro: [1020, 790],  ancho: 520 },
    pupila: { src: "ojo2.png",       recorte: [163, 394, 2074, 963],  centro: [1020, 790],  ancho: 520 },
    brillo: { src: "ojo3.png",       recorte: [163, 394, 2074, 963],  centro: [1020, 790],  ancho: 520 },
    cejas:  { src: "cejas1.png",     recorte: [183, 705, 2033, 321],  centro: [1020, 610],  ancho: 500 },
    // pelos: todos vienen alineados con la cabeza (mismo lienzo de 800 que cara_base), relleno blanco y líneas negras.
    // Se usa el lienzo entero (no un recorte), así si se edita un pelo no hay que cambiar nada acá.
    pelo3:   de800("pelo3.png",   [0, 0, 800, 800]),
    pelo4:   de800("pelo4.png",   [0, 0, 800, 800]),
    pelo5:   de800("pelo5.png",   [0, 0, 800, 800]),
    pelo6:   de800("pelo6.png",   [0, 0, 800, 800]),
    pelo7:   de800("pelo7.png",   [0, 0, 800, 800]),
    pelo8:   de800("pelo8.png",   [0, 0, 800, 800]),
    pelo9:   de800("pelo9.png",   [0, 0, 800, 800]),
    pelo10:  de800("pelo10.png",  [0, 0, 800, 800]),
    pelo11:  de800("pelo11.png",  [0, 0, 800, 800]),
    // pelos de mujer (pelo50 en adelante): mismo lienzo de 800, alineados con la cabeza
    pelo50:  de800("pelo50.png",  [0, 0, 800, 800]),
    pelo51:  de800("pelo51.png",  [0, 0, 800, 800]),
    pelo52:  de800("pelo52.png",  [0, 0, 800, 800]),
    pelo53:  de800("pelo53.png",  [0, 0, 800, 800]),
    pelo54:  de800("pelo54.png",  [0, 0, 800, 800])
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
    ["adulto_traje",  [282, 326, 234, 152], [404, 490], 1.0]
  ].forEach(function (a) { PIEZAS[a[0]] = prenda(a[0] + ".png", a[1], a[2], a[3]); });
  PIEZAS.anteojos = prenda("anteojos.png", [281, 254, 236, 108], [399, 308], ESCALA_ANTEOJOS);

  /* Etapas de la evolución: el mismo visitante (piel, pelo, ojos, boca), cambia el cuerpo, el tamaño y la ropa.
     ropa: [pieza, color] en el orden en que se dibuja (lo de abajo primero). */
  /* Cuerpos de cada etapa: vienen con la cabeza, los brazos y la ropa en una sola imagen, con cada zona pintada de un
     color de código. herramientas/separar_cuerpos.py los separa en capas (assets/carausuario/capas/): una por zona
     (piel, ropa1, ropa2, detalle, acento), que acá se tiñen, y las líneas negras, que van encima.
     cabeza = [x, y, escala]: dónde está el centro de la cabeza (lienzo de 800, a la altura más ancha) y cuánto más
     grande es que la de cara_base; con eso se ubican los ojos, las cejas, el pelo y la boca (los 3 cuerpos no miden igual). */
  var ZONAS = ["piel", "ropa1", "ropa2", "detalle", "acento"];
  var ETAPAS = {
    bebe:   { cuerpo: "cuerpo_bebe",   tamano: 0.62, cabeza: [398.5, 320, 1.064] },
    nino:   { cuerpo: "cuerpo_nino",   tamano: 0.82, cabeza: [403, 317, 1.018] },
    adulto: { cuerpo: "cuerpo_adulto", tamano: 1,    cabeza: [399.5, 316, 1.071] }
  };
  var CABEZA_BASE = [398.5, 317];   // la de cara_base, sobre la que están ubicados los rasgos
  Object.keys(ETAPAS).forEach(function (k) {
    var c = ETAPAS[k].cuerpo;
    ZONAS.concat("lineas").forEach(function (z) { PIEZAS[c + "_" + z] = de800("capas/" + c + "_" + z + ".png", [0, 0, 800, 800]); });
  });
  // colores para la ropa (cuando la cámara no ve la remera, o para las otras prendas)
  var COLORES_ROPA = ["#ff8a80", "#ffd166", "#7bd389", "#6ec6ff", "#b39ddb", "#f48fb1", "#ffab40", "#4db6ac",
                      "#5c6bc0", "#e57373", "#aed581", "#4fc3f7", "#ba68c8", "#90a4ae"];
  // los colores de la ropa de un visitante: los que guardó la cámara, o unos fijos según su id (siempre los mismos)
  function coloresRopa(rasgos) {
    if (rasgos.ropa) return rasgos.ropa;
    var s = Math.abs(rasgos.id || 7) % 9973;
    function c(k) { return COLORES_ROPA[(s * (k + 3) + k * 5) % COLORES_ROPA.length]; }
    return { ropa1: c(0), ropa2: c(1), detalle: c(2), acento: c(3) };
  }


  // la caja del personaje dentro del cuerpo (lo que se ve), en coordenadas del cuerpo
  var CAJA = { x: 380, y: 160, w: 1300, h: 1760 };
  var PALETA = {
    piel: ["#ffe3cf", "#f5c9a5", "#d9a074", "#a8704a", "#6e4630"],
    pelo: ["#2b1d14", "#6b4226", "#c28a4a", "#e8c76a", "#9a9a9a", "#b8452d"]
  };
  var CATEGORIAS = {
    "muy corto":       ["pelo3"],
    "corto":           ["pelo4", "pelo6", "pelo7", "pelo9"],
    "corto con rulos": ["pelo8", "pelo10"],
    "medio":           ["pelo5", "pelo11", "pelo50"],
    "largo":           ["pelo51", "pelo52"],
    "largo con rulos": ["pelo53", "pelo54"]
  };
  var FLEQUILLOS = ["pelo6", "pelo50", "pelo51"];   // (pelo3 es muy corto, sin flequillo)

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
    var p = PIEZAS[k];
    if (!p) return;
    var r = p.recorte, w = p.ancho, h = r[3] * w / r[2], im = imgs[k];
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
    if (etapa) { dibujarEtapa(ctx, rasgos, etapa, E, ox, oy, n); return; }
    var bebe = rasgos.cuerpo === "bebe", piel = n >= 2 ? rasgos.piel : null;
    if (op.parte !== "frente" && !bebe && n >= 1) pieza(ctx, "cara", piel, E, ox, oy);
    if (op.parte === "fondo") return;
    if (!op.parte && n >= 2 && op.brazos !== false) brazosQuietos(ctx, rasgos, op);
    if (n >= 1) pieza(ctx, bebe ? "bebe" : "base", piel, E, ox, oy);
    rasgosCara(ctx, rasgos, E, ox, oy, n);
  }
  // un cuerpo de etapa (con la ropa puesta): cada zona de su color, las líneas encima y después la cara, ubicada en su cabeza
  function dibujarEtapa(ctx, rasgos, etapa, E, ox, oy, n) {
    var col = coloresRopa(rasgos), c = etapa.cuerpo;
    if (n >= 1) ZONAS.forEach(function (z) { pieza(ctx, c + "_" + z, n >= 2 ? (z === "piel" ? rasgos.piel : col[z]) : "#ffffff", E, ox, oy); });
    if (n >= 1) pieza(ctx, c + "_lineas", null, E, ox, oy);
    // los rasgos están ubicados para la cabeza de cara_base: se llevan a la cabeza de este cuerpo
    function px(x) { return ox + (1024 + (x - 400) * K800 - CAJA.x) * E; }
    function py(y) { return oy + (800 + (y - 310) * K800 - CAJA.y) * E; }
    var k = etapa.cabeza;
    ctx.save();
    ctx.translate(px(k[0]), py(k[1])); ctx.scale(k[2], k[2]); ctx.translate(-px(CABEZA_BASE[0]), -py(CABEZA_BASE[1]));
    rasgosCara(ctx, rasgos, E, ox, oy, n);
    ctx.restore();
  }
  /* Hacia dónde mira: Personaje.mirar(x, y), de -1 a 1 (0, 0 = al frente). Mueve la pupila dentro del ojo
     (hasta MIRADA_MAX, en coordenadas del cuerpo) y los brillos un poco menos, para que el ojo se vea vivo. */
  var mirada = { x: 0, y: 0 };
  function mirar(x, y) { mirada.x = Math.max(-1, Math.min(1, x || 0)); mirada.y = Math.max(-1, Math.min(1, y || 0)); }
  function ojos(ctx, rasgos, E, ox, oy) {
    var dx = mirada.x * MIRADA_MAX * E, dy = mirada.y * MIRADA_MAX * 0.6 * E;
    pieza(ctx, "ojos", null, E, ox, oy);
    pieza(ctx, "pupila", null, E, ox + dx, oy + dy);
    pieza(ctx, "brillo", null, E, ox + dx * 0.75, oy + dy * 0.75);
  }
  function rasgosCara(ctx, rasgos, E, ox, oy, n) {
    // las cejas van debajo del pelo (el flequillo las tapa); los ojos, los anteojos y la boca, arriba de todo
    // (los pelos largos o con flequillo no pueden tapar la cara)
    if (n >= 4 && rasgos.cejas) pieza(ctx, "cejas", null, E, ox, oy);
    // un pelo que ya no existe (ej. de un visitante guardado antes de cambiar los peinados) se reemplaza por uno corto
    var pelo = rasgos.pelo === "ninguno" ? null : (PIEZAS[rasgos.pelo] ? rasgos.pelo : "pelo3");
    if (n >= 5 && pelo) pieza(ctx, pelo, rasgos.colorPelo, E, ox, oy);
    if (n >= 3) { ojos(ctx, rasgos, E, ox, oy); parpados(ctx, rasgos, E, ox, oy); }
    if (n >= 3 && rasgos.anteojos) pieza(ctx, "anteojos", "#3a3f4b", E, ox, oy);
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
  // aclara con una curva (gamma): f = 1 no cambia; f > 1 levanta sobre todo los tonos oscuros
  function aclarar(hex, f) {
    return "#" + rgb(hex).map(function (v) {
      return ("0" + Math.min(255, Math.round(255 * Math.pow(v / 255, 1 / f))).toString(16)).slice(-2);
    }).join("");
  }
  // la ropa: la prenda principal del color de la remera que ve la cámara (si la ve); las demás, al azar de la paleta
  function ropaParecida(muestras) {
    var vistos = muestras.map(function (m) { return m.ropa; }).filter(function (c) { return typeof c === "string"; });
    var azar = COLORES_ROPA.slice().sort(function () { return Math.random() - 0.5; });
    var ropa1 = vistos.length ? masVotado(vistos.map(function (c) { return masParecido(aclarar(c, LUZ_PELO), COLORES_ROPA); })) : azar[0];
    azar = azar.filter(function (c) { return c !== ropa1; });
    return { ropa1: ropa1, ropa2: azar[0], detalle: azar[1], acento: azar[2] };
  }
  // la categoría de pelo según lo que midió la cámara (promedio de las muestras)
  function categoriaPelo(muestras) {
    function prom(k) { var v = muestras.map(function (m) { return m[k]; }).filter(function (x) { return typeof x === "number"; });
                       return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : 0; }
    var largo = prom("largo"), rulos = prom("rulos") >= RULOS;
    var cat = largo <= MUY_CORTO && !rulos ? "muy corto" : largo < CORTO ? (rulos ? "corto con rulos" : "corto") : largo < LARGO ? "medio" : (rulos ? "largo con rulos" : "largo");
    return { categoria: cat, flequillo: prom("flequillo") >= CON_FLEQUILLO };
  }
  // un peinado de la categoría; azar (0 … 1) elige cuál: el mismo azar da siempre el mismo peinado
  function peinadoDe(c, azar) {
    var lista = CATEGORIAS[c.categoria];
    var conF = lista.filter(function (p) { return FLEQUILLOS.indexOf(p) >= 0; });
    var sinF = lista.filter(function (p) { return FLEQUILLOS.indexOf(p) < 0; });
    if (c.flequillo && conF.length) lista = conF; else if (!c.flequillo && sinF.length) lista = sinF;
    return lista[Math.floor((azar == null ? Math.random() : azar) * lista.length) % lista.length];
  }
  // varios mensajes de la cámara → un solo personaje (gana el tono que más veces se detectó).
  // La sonrisa se toma de los últimos 2 segundos: si estás sonriendo cuando se arma, sale sonriendo.
  // azar (opcional, 0 … 1): para que el peinado elegido dentro de la categoría no cambie si se llama varias veces
  function desdeCamara(muestras, azar) {
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
      piel: masVotado(muestras.map(function (m) { return masParecido(aclarar(m.piel, LUZ_PIEL), PALETA.piel); })),
      colorPelo: masVotado(muestras.map(function (m) { return masParecido(aclarar(m.pelo, LUZ_PELO), PALETA.pelo); })),
      pelo: pelados > muestras.length / 2 ? "ninguno" : peinadoDe(categoriaPelo(muestras), azar),
      categoriaPelo: pelados > muestras.length / 2 ? "pelado" : categoriaPelo(muestras).categoria +
        (categoriaPelo(muestras).flequillo ? " con flequillo" : ""),
      cejas: true,
      anteojos: conAnteojos > muestras.length / 2,
      boca: sonrisas >= recientes.length / 2 ? "sonrisa" : "neutra",
      apertura: 0.35 + t * 0.65,
      ropa: ropaParecida(muestras)
    };
  }

  // la misma forma (pelo, ojos, cejas, boca) pero en blanco y negro, como un dibujo sin pintar
  function enBlancoYNegro(rasgos) {
    return Object.assign({}, rasgos || PREDETERMINADO, { piel: "#ffffff", colorPelo: "#ffffff", byn: true });
  }

  return { mirar: mirar, ETAPAS: ETAPAS, enBlancoYNegro: enBlancoYNegro, cargar: cargar, dibujar: dibujar, ancho: ancho, desdeCamara: desdeCamara, brazo: brazo, CAPAS: CAPAS,
           PREDETERMINADO: PREDETERMINADO };
})();
