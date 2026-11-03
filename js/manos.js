/* manos.js: íconos de los gestos, compartidos por el contenedor y todos los núcleos.

   Los gestos se hacen ARRASTRANDO la mano hacia uno mismo (no deslizando):
     - mano DERECHA (roja)    → de la derecha hacia vos → AVANZAR
     - mano IZQUIERDA (azul)  → de la izquierda hacia vos → VOLVER
   Los colores son los de los Joy-Con de la Nintendo Switch, para reconocerlas de un vistazo.

   Uso en el HTML:  <span data-mano="der"></span>  o  <span data-mano="izq"></span>
   (se llenan solos al cargar; el ícono mide 2.2em de ancho, así acompaña al tamaño del texto)
   Uso desde JS:    Manos.svg("der")  → devuelve el SVG como texto (para innerHTML)
                    Manos.llenar(elemento)  → llena los [data-mano] que haya adentro
*/
(function () {
  var COLOR = { der: "#FF4554", izq: "#00C3E3" };
  // mano abierta vista de frente (palma), con el pulgar a la izquierda = mano derecha
  var MANO = "M22 34V14a4 4 0 0 1 8 0v16V10a4 4 0 0 1 8 0v20V13a4 4 0 0 1 8 0v19V20a4 4 0 0 1 8 0v20" +
             "c0 10-7 18-17 18h-3c-6 0-10-3-13-8l-8-13a4 4 0 0 1 7-4z";

  /* lado: "der" | "izq".  conFlecha (por defecto true): flecha que muestra hacia dónde se arrastra.
     La derecha se arrastra hacia la izquierda de la pantalla; la izquierda, hacia la derecha.
     ancho (opcional): tamaño del ícono, ej. "100%" para que llene su contenedor (por defecto 2.2em). */
  function svg(lado, conFlecha, ancho) {
    var c = COLOR[lado] || COLOR.der, espejo = lado === "izq" ? ' transform="matrix(-1 0 0 1 100 0)"' : "";
    var flecha = conFlecha === false ? "" :
      '<path d="M36 32H8M18 21 7 32l11 11" fill="none" stroke="' + c + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<svg class="mano-icono mano-' + lado + '" viewBox="0 0 100 64" aria-hidden="true"' +
      ' style="width:' + (ancho || "2.2em") + ';height:auto;vertical-align:middle;overflow:visible">' +
      '<g' + espejo + '>' + flecha +
      '<g transform="translate(36 0)"><path d="' + MANO + '" fill="' + c + '" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>' +
      '</g></svg>';
  }

  function llenar(raiz) {
    (raiz || document).querySelectorAll("[data-mano]").forEach(function (el) {
      if (!el.firstChild) el.innerHTML = svg(el.getAttribute("data-mano"), el.getAttribute("data-flecha") !== "no");
    });
  }

  window.Manos = { svg: svg, llenar: llenar, color: COLOR };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { llenar(); });
  else llenar();
})();
