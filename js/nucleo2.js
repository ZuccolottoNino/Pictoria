Infografia.escalar("#escenario", 1920, 1080);
FondoAero.iniciar("#fondo-aero");

Infografia.presentacion([
  { el: "#p1" },
  { el: "#p2" },
  { el: "#p3" }
], { transicion: "deslizar", duracion: 0.8 });
