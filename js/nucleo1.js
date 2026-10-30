Infografia.escalar("#escenario", 1920, 1080);

var bucles = [];
function pararBucles() { bucles.forEach(function (b) { b.kill(); }); bucles = []; }

function iniciar() {
  Infografia.presentacion([

    /* ============ Pantalla 1 ============ */
    {
      el: "#p1",
      preparar: function () {
        var d = Infografia.direccion;
        gsap.set("#n1-cabecera", { autoAlpha: 0, x: -120 * d });
        gsap.set("#n1-titulo",   { autoAlpha: 0, x: 80 * d });
        gsap.set("#n1-profe",    { autoAlpha: 0, x: 90 * d, scale: 0.9, transformOrigin: "50% 100%" });
        gsap.set("#n1-caja",     { autoAlpha: 0, x: 120 * d });
      },
      entrar: function () {
        var tl = gsap.timeline()
          .to("#n1-cabecera", { autoAlpha: 1, x: 0, duration: 0.6, ease: "steps(6)" })
          .to("#n1-titulo",   { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
          .to("#n1-profe",    { autoAlpha: 1, x: 0, scale: 1, duration: 0.8, ease: "back.out(1.4)" }, "-=0.3")
          .to("#n1-caja",     { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, "-=0.4")
          .add(function () {
            bucles.push(gsap.to("#n1-profe", { y: -14, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1 }));
            // parpadeo tipo cartel retro sobre las palabras en rojo
            bucles.push(gsap.to("#n1-caja .rojo", { opacity: 0.25, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1, repeatDelay: 0.4 }));
          });
        return tl;
      },
      salir: pararBucles
    },

    /* ============ Pantalla 2 (por hacer) ============ */
    { el: "#p2", salir: pararBucles },

    /* ============ Pantalla 3 (por hacer) ============ */
    { el: "#p3", salir: pararBucles }

  ], { transicion: "deslizar", duracion: 0.8 });
}
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(iniciar);
