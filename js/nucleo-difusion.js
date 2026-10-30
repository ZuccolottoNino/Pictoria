Infografia.escalar("#escenario", 1920, 1080);

function iniciar() {
  // Si lo pegás dentro de otro núcleo: Infografia.presentacion([ ...tusPantallas, ...Difusion.pantallas() ])
  Infografia.presentacion(Difusion.pantallas(), { transicion: "fundido", duracion: 0.8 });
}
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(iniciar);
