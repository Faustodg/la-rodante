/* ============================================================
   LA RODANTE — MENÚ EN LÍNEA (Supabase)
   Trae los productos que el dueño edita desde el panel /admin.

   El sitio nunca depende de que el servicio responda:
     1. Arranca con el último menú que se pudo descargar (guardado en
        el navegador) o, si no hay, con el de data/menu.js.
     2. En segundo plano pide el menú actual; si cambió, redibuja.
   Si CONFIG está vacío, todo esto no hace nada.

   Se habla con Supabase usando fetch, sin librerías. Lo usan el
   sitio (index.html) y el panel (admin.html).
   ============================================================ */

const MENU_GUARDADO_KEY = 'menu_remoto_larodante';

/** true si data/config.js tiene la dirección y la clave pública del proyecto. */
function supabaseConfigurado() {
  return typeof CONFIG !== 'undefined'
    && /^https:\/\/[^\s/]+/.test(CONFIG.supabaseUrl || '')
    && Boolean(CONFIG.supabaseKey);
}

/** Dirección base del proyecto, sin barra final. */
function supabaseUrl(ruta) {
  return CONFIG.supabaseUrl.replace(/\/+$/, '') + ruta;
}

/**
 * Cabeceras para llamar a Supabase.
 * La clave pública va en "apikey"; "Authorization" es solo para el token
 * de un usuario que inició sesión (panel de administración).
 */
function cabecerasSupabase(tokenUsuario) {
  const cabeceras = { apikey: CONFIG.supabaseKey };
  if (tokenUsuario) {
    cabeceras.Authorization = 'Bearer ' + tokenUsuario;
  } else if (CONFIG.supabaseKey.startsWith('eyJ')) {
    // Clave "anon" del formato anterior (es un JWT): también va como Bearer
    cabeceras.Authorization = 'Bearer ' + CONFIG.supabaseKey;
  }
  return cabeceras;
}

/** Convierte una fila de la tabla "productos" al formato que usa el sitio. */
function filaAProducto(fila) {
  const producto = {
    id:          String(fila.id),
    categoria:   String(fila.categoria),
    nombre:      String(fila.nombre),
    precio:      Number(fila.precio),
    descripcion: String(fila.descripcion || ''),
    img:         String(fila.img || ''),
  };
  if (fila.unidad)      producto.unidad     = String(fila.unidad);
  if (fila.obs_ejemplo) producto.obsEjemplo = String(fila.obs_ejemplo);
  return producto;
}

/** Descarta filas incompletas para que un dato roto no rompa el menú. */
function esProductoValido(p) {
  return Boolean(p && p.id && p.nombre && p.categoria)
    && Number.isFinite(p.precio) && p.precio >= 0;
}

/** Pide a Supabase los productos visibles, ordenados. Falla si tarda más de 7 segundos. */
async function descargarProductos() {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), 7000);
  try {
    const res = await fetch(
      supabaseUrl('/rest/v1/productos?select=*&visible=is.true&order=orden.asc,nombre.asc'),
      { headers: cabecerasSupabase(), signal: corte.signal, cache: 'no-store' },
    );
    if (!res.ok) throw new Error('Supabase respondió ' + res.status);
    const filas = await res.json();
    if (!Array.isArray(filas)) throw new Error('Respuesta inesperada');
    return filas.map(filaAProducto).filter(esProductoValido);
  } finally {
    clearTimeout(reloj);
  }
}

function leerMenuGuardado() {
  try {
    const lista = JSON.parse(localStorage.getItem(MENU_GUARDADO_KEY) || 'null');
    if (!Array.isArray(lista)) return null;
    const validos = lista.filter(esProductoValido);
    return validos.length > 0 ? validos : null;
  } catch (_) {
    return null;
  }
}

function guardarMenu(productos) {
  try {
    localStorage.setItem(MENU_GUARDADO_KEY, JSON.stringify(productos));
  } catch (_) { /* sin almacenamiento → se vuelve a pedir en la próxima visita */ }
}

/**
 * Descarga el menú actual y, si cambió respecto de lo que se está mostrando,
 * lo aplica. Lo llama app.js después de dibujar la página.
 */
async function sincronizarMenuRemoto() {
  if (!supabaseConfigurado() || !MENU_OK) return;
  try {
    const productos = await descargarProductos();
    // Una base vacía no debe dejar el sitio sin menú
    if (productos.length === 0) return;

    guardarMenu(productos);
    if (JSON.stringify(productos) !== JSON.stringify(DATOS.productos)) {
      aplicarProductos(productos);
    }
  } catch (error) {
    console.warn('No se pudo actualizar el menú en línea; se muestra el último disponible.', error);
  }
}

/* Al cargar: si hay un menú descargado en una visita anterior, se usa ese de
   entrada (tiene los precios más recientes que este navegador conoce). */
if (supabaseConfigurado() && MENU_OK) {
  const guardado = leerMenuGuardado();
  if (guardado) {
    DATOS.productos = guardado;
    reconstruirCatalogo();
  }
}
