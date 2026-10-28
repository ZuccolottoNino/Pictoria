/* puente.js: lo incluye cada núcleo para hablar con la página contenedora.
   Uso dentro de un núcleo:
     <script src="../js/puente.js"></script>
     ...
     Infografia.terminar();   // cuando el núcleo terminó → el contenedor pasa al standby
*/
(function () {
  function enviar(tipo) {
    try { window.parent.postMessage({ origen: "infografia", tipo: tipo }, "*"); } catch (e) {}
  }

  window.Infografia = {
    terminar:  function () { enviar("terminado"); },
    actividad: function () { enviar("actividad"); },
    reiniciar: function () { enviar("reiniciar"); }
  };

  // Avisa al contenedor que hay gente interactuando (para no reiniciar por inactividad)
  ["keydown", "pointerdown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, function () { enviar("actividad"); }, { passive: true });
  });

  // La tecla de reinicio también funciona con el foco dentro del núcleo
  window.addEventListener("keydown", function (e) {
    if (e.code === "KeyR") enviar("reiniciar");
  });
})();
