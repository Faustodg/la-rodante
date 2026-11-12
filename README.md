# La Rodante Food Truck — sitio web

Sitio de pedidos de La Rodante Food Truck (Vedia, Buenos Aires). El cliente arma su pedido y lo envía por WhatsApp.

Está hecho con HTML, CSS y JavaScript, sin librerías ni pasos de compilación: los archivos de esta carpeta son el sitio.

## Qué hay en cada lugar

| Archivo o carpeta | Para qué sirve |
|---|---|
| `index.html` | El sitio público |
| `style.css` | Estilos del sitio |
| `data/menu.js` | Productos, precios, combos, horarios, costo de envío y WhatsApp |
| `data/config.js` | Conexión con Supabase (vacía = el sitio usa solo `data/menu.js`) |
| `js/catalogo.js` | Dibuja el menú; pestañas, buscador y filtro de precio |
| `js/carrito.js` | Carrito |
| `js/pedido.js` | Datos de entrega y envío del pedido por WhatsApp |
| `js/app.js` | Interfaz general y arranque |
| `js/remoto.js` | Lee el menú en línea, con respaldo si el servicio no responde |
| `admin.html`, `admin.css`, `js/admin.js` | Panel de administración |
| `supabase/esquema.sql` | Tablas y permisos para crear en Supabase |
| `IMG/` | Imágenes y videos que usa el sitio |

## Cambiar el menú

- **Sin panel conectado:** se edita `data/menu.js`. El archivo trae las instrucciones al principio.
- **Con panel conectado:** el dueño entra a `admin.html` con su email y contraseña. `data/menu.js` queda como respaldo.

Las fotos de productos van en `IMG/menu/`, en formato horizontal 16:9 (720 × 405 px).

## Verlo en la computadora

Con Python instalado, desde esta carpeta:

```bash
python -m http.server 8765
```

Y abrir `http://127.0.0.1:8765/` en el navegador.

## Pendiente antes de publicar

- Reemplazar `TU-DOMINIO` en el `<head>` de `index.html` por la dirección real del sitio (lo necesita la vista previa al compartir el enlace).
- Cargar en `data/config.js` la dirección y la clave pública del proyecto de Supabase.
- Definir los combos reales (hoy están marcados como pendientes en `data/menu.js`).

## Seguridad

- En `data/config.js` va solo la clave **pública** de Supabase. La clave secreta no se guarda en ningún archivo de este repositorio.
- Quién puede modificar el menú lo decide la base de datos, no el código del sitio (ver `supabase/esquema.sql`).
