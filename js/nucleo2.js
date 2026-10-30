Infografia.escalar("#escenario", 1920, 1080);
Infografia.presentacion([
  { el: "#p1", flip: { "#bola": "p1" } },
  { el: "#p2", flip: { "#bola": "p2" }, transicion: "deslizar" },
  { el: "#p3", flip: { "#bola": "p3" }, transicion: "cortina" }
], { transicion: "fundido", duracion: 1 });
