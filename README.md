# Pictoria

## Cómo abrirlo

El núcleo 1 se carga con rutas relativas (`../css`, `../libs`, `../assets`), así que hay
que servir **desde la raíz de `Pictoria-main`**, no abrir el archivo suelto ni servir
desde adentro de `nucleos/` (si no, no carga el CSS ni las imágenes y se ve todo roto).

```bash
cd Pictoria-main
python -m http.server 8000
```

Abrí <http://127.0.0.1:8000/> y elegí **Núcleo 1** (tecla `1` o el botón).
`Espacio` / `→` pasa a la siguiente pantalla.

## Estructura

- `index.html` — contenedor/hub: teclado, panel de pruebas y bus de acciones (`Acciones.emitir`)
- `nucleos/nucleo1.html` — núcleo 1 (las 19 pantallas + sus animaciones)
- `js/puente.js` — contrato compartido: el núcleo solo recibe `SIGUIENTE` e `INTERACTUAR`
- `css/nucleo1.css` — todo el aspecto de núcleo 1 (fuentes, cajas, marcas de animación)
- `assets/nucleo1/img/` — imágenes exportadas de Figma
