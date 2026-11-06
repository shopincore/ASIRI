# ASIRI — Frontend animado con GSAP

Tienda naturista **responsive**, hecha con HTML, CSS y JavaScript sin frameworks, más **GSAP 3.15.1 y ScrollTrigger** para animación premium.

## Cómo abrirlo

- **Demo portátil:** abre `ASIRI_tienda_naturista_GSAP.html`. Todas las ilustraciones, estilos y lógica de la tienda están dentro del propio HTML.
- **Código fuente:** descomprime el ZIP y abre `asiri-frontend/index.html`, o ejecuta `python -m http.server 8000` desde `asiri-frontend` y visita `http://localhost:8000`.
- **CDN:** el efecto GSAP necesita Internet porque GSAP y ScrollTrigger se cargan desde cdnjs, con la versión fijada. Si la CDN no responde, la tienda sigue funcionando sin animaciones.

## Animaciones integradas

- Presentación secuencial del hero, logotipo, titulares y llamadas a la acción con un `gsap.timeline()`.
- Desplazamiento de la ilustración (parallax sutil en escritorio).
- Aparición de beneficios, categorías, catálogo, historia y newsletter controlada por `ScrollTrigger`.
- Animación de nuevas tarjetas cuando cambian filtros, búsqueda u orden.
- Microinteracción de iconos de categorías, botones de compra e insignia del carrito.
- Transición de contenido dentro del carrito y de la ficha de producto.
- Progreso de desplazamiento del sitio.
- **Accesibilidad:** respeta `prefers-reduced-motion`, no cambia la navegación nativa ni oculta contenido si GSAP falla.

## Funciones del ecommerce demo

- Catálogo con 8 productos de ejemplo, búsqueda instantánea, filtros por categoría y orden por precio.
- Detalle de producto, carrito con cantidades y guardado local.
- Botón para copiar el resumen del carrito. **No realiza cobros ni envía pedidos.**
- Formulario de newsletter demostrativo, sin backend.
- Ilustraciones SVG editables en `assets/`.

## Archivos del proyecto

- `index.html`: maquetación de la tienda y carga GSAP desde CDN.
- `styles.css`: diseño visual responsive.
- `app.js`: lógica de catálogo, carrito y accesibilidad.
- `motion.js`: animaciones GSAP, desacopladas de `app.js`.
- `assets/`: ilustraciones de muestra.
- `build_demo.py`: genera el HTML de demo y ZIP con código fuente.

## Antes de publicar

Reemplazar los productos de ejemplo por los reales, integrar inventario, checkout y medios de contacto; incorporar fotografías oficiales; definir los textos legales y de privacidad; validar precios y características reales, sin atribuir propiedades terapéuticas no demostradas.
