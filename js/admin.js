/* ============================================================
   LA RODANTE — PANEL DE ADMINISTRACIÓN
   Ingreso con email y contraseña, y alta, edición y baja de productos.
   Habla con Supabase por fetch (sin librerías); usa las funciones
   compartidas de remoto.js y catalogo.js.

   La seguridad NO depende de este archivo: aunque alguien lo modifique,
   la base solo acepta cambios de usuarios que estén en la tabla "admins"
   (ver supabase/esquema.sql).
   ============================================================ */

const SESION_KEY   = 'admin_sesion_larodante';
const BUCKET_FOTOS = 'productos';
const FOTO_ANCHO   = 720;   // las fotos del menú son 16:9
const FOTO_ALTO    = 405;

let sesion    = null;       // { access_token, refresh_token, expira, email }
let productos = [];         // filas de la tabla, incluidas las ocultas
let editando  = null;       // fila que se está editando, o null si es nueva
let fotoNueva = null;       // Blob ya recortado, pendiente de subir

const $ = id => document.getElementById(id);

/* ───────────────── AVISOS ───────────────── */

function aviso(msg, tipo = 'ok', ms = 2600) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.dataset.tipo = tipo;
  clearTimeout(el._t);
  el.classList.add('show');
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

function mostrarError(id, msg) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}

/* ───────────────── SESIÓN ───────────────── */

function guardarSesion(datos, email) {
  sesion = {
    access_token:  datos.access_token,
    refresh_token: datos.refresh_token,
    expira:        Date.now() + (Number(datos.expires_in) || 3600) * 1000,
    email:         (datos.user && datos.user.email) || email || '',
  };
  try { localStorage.setItem(SESION_KEY, JSON.stringify(sesion)); } catch (_) { /* dura hasta cerrar la pestaña */ }
}

function leerSesion() {
  try {
    const s = JSON.parse(localStorage.getItem(SESION_KEY) || 'null');
    return s && s.access_token && s.refresh_token ? s : null;
  } catch (_) {
    return null;
  }
}

function olvidarSesion() {
  sesion = null;
  try { localStorage.removeItem(SESION_KEY); } catch (_) { /* nada que borrar */ }
}

/** Renueva el token si está por vencer. Devuelve false si hay que volver a ingresar. */
async function asegurarSesion() {
  if (!sesion) return false;
  if (sesion.expira - Date.now() > 60000) return true;
  try {
    const res = await fetch(supabaseUrl('/auth/v1/token?grant_type=refresh_token'), {
      method: 'POST',
      headers: { ...cabecerasSupabase(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: sesion.refresh_token }),
    });
    if (!res.ok) throw new Error('No se pudo renovar la sesión');
    guardarSesion(await res.json(), sesion.email);
    return true;
  } catch (_) {
    return false;
  }
}

/* ───────────────── LLAMADAS A SUPABASE ───────────────── */

/** Traduce los errores más comunes a algo que el dueño pueda entender. */
function mensajeDeError(datos, estado) {
  const texto = (datos && (datos.msg || datos.message || datos.error_description || datos.error)) || '';
  if (/invalid login credentials/i.test(texto)) return 'El email o la contraseña no coinciden.';
  if (/email not confirmed/i.test(texto))       return 'Ese email todavía no está confirmado en Supabase.';
  if (/duplicate key/i.test(texto))             return 'Ya existe un producto con ese nombre.';
  if (/row-level security|permission denied/i.test(texto) || estado === 403) {
    return 'Tu usuario no tiene permiso para editar el menú.';
  }
  if (/payload too large|exceeded the maximum/i.test(texto) || estado === 413) return 'La foto es demasiado pesada.';
  if (estado === 429) return 'Demasiados intentos. Esperá un minuto y probá de nuevo.';
  return texto || `No se pudo completar la operación (error ${estado}).`;
}

/**
 * Llama a la API del proyecto con la sesión actual.
 * @param {string} ruta  por ejemplo '/rest/v1/productos?select=*'
 * @param {object} [op]  metodo, cuerpo (objeto o Blob), cabeceras
 */
async function api(ruta, { metodo = 'GET', cuerpo, cabeceras = {} } = {}) {
  if (!await asegurarSesion()) {
    mostrarLogin('Tu sesión venció. Ingresá de nuevo.');
    throw new Error('Sesión vencida');
  }

  const esArchivo = cuerpo instanceof Blob;
  const res = await fetch(supabaseUrl(ruta), {
    method: metodo,
    headers: {
      ...cabecerasSupabase(sesion.access_token),
      ...(cuerpo && !esArchivo ? { 'Content-Type': 'application/json' } : {}),
      ...cabeceras,
    },
    body: cuerpo ? (esArchivo ? cuerpo : JSON.stringify(cuerpo)) : undefined,
  });

  let datos = null;
  try { datos = await res.json(); } catch (_) { /* respuesta sin cuerpo */ }

  if (res.status === 401) {
    mostrarLogin('Tu sesión venció. Ingresá de nuevo.');
    throw new Error('Sesión vencida');
  }
  if (!res.ok) throw new Error(mensajeDeError(datos, res.status));
  return datos;
}

/* ───────────────── VISTAS ───────────────── */

function mostrarVista(id) {
  ['vistaConfig', 'vistaLogin', 'vistaPanel'].forEach(v => { $(v).hidden = v !== id; });
  $('btnSalir').hidden = id !== 'vistaPanel';
}

function mostrarLogin(msg) {
  olvidarSesion();
  cerrarEditor();
  mostrarVista('vistaLogin');
  mostrarError('loginError', msg || '');
  $('loginClave').value = '';
}

/* ───────────────── INGRESO ───────────────── */

async function ingresar(e) {
  e.preventDefault();
  const email = $('loginEmail').value.trim();
  const clave = $('loginClave').value;
  if (!email || !clave) {
    mostrarError('loginError', 'Completá el email y la contraseña.');
    return;
  }

  const boton = $('btnIngresar');
  boton.disabled = true;
  boton.textContent = 'Ingresando…';
  mostrarError('loginError', '');
  try {
    const res = await fetch(supabaseUrl('/auth/v1/token?grant_type=password'), {
      method: 'POST',
      headers: { ...cabecerasSupabase(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: clave }),
    });
    let datos = null;
    try { datos = await res.json(); } catch (_) { /* sin cuerpo */ }
    if (!res.ok) throw new Error(mensajeDeError(datos, res.status));

    guardarSesion(datos, email);
    $('loginClave').value = '';
    await abrirPanel();
  } catch (error) {
    mostrarError('loginError', error.message === 'Failed to fetch'
      ? 'No hay conexión con el servicio. Revisá internet y probá de nuevo.'
      : error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Ingresar';
  }
}

async function salir() {
  if (sesion) {
    // Avisa al servicio para invalidar la sesión; si falla, igual se cierra acá
    fetch(supabaseUrl('/auth/v1/logout'), {
      method: 'POST',
      headers: cabecerasSupabase(sesion.access_token),
    }).catch(() => {});
  }
  mostrarLogin('');
}

/** Entra al panel: verifica el permiso y carga los productos. */
async function abrirPanel() {
  const esAdmin = await api('/rest/v1/rpc/es_admin', { metodo: 'POST', cuerpo: {} });
  if (esAdmin !== true) {
    mostrarLogin('Tu usuario no tiene permiso para editar el menú.');
    return;
  }
  mostrarVista('vistaPanel');
  await cargarProductos();
}

/* ───────────────── LISTA DE PRODUCTOS ───────────────── */

function categorias() {
  return DATOS.categorias || [];
}

function nombreCategoria(id) {
  const c = categorias().find(cat => cat.id === id);
  return c ? c.nombre : id;
}

async function cargarProductos() {
  $('estadoLista').textContent = 'Cargando productos…';
  try {
    productos = await api('/rest/v1/productos?select=*&order=orden.asc,nombre.asc') || [];
    renderLista();
  } catch (error) {
    if (error.message !== 'Sesión vencida') $('estadoLista').textContent = error.message;
  }
}

function renderLista() {
  const texto     = normalizar($('filtroTexto').value);
  const categoria = $('filtroCategoria').value;
  const visibles  = productos.filter(p =>
    (!categoria || p.categoria === categoria) &&
    (!texto || normalizar(p.nombre).includes(texto)));

  $('estadoLista').textContent = productos.length === 0
    ? 'Todavía no hay productos cargados.'
    : `${visibles.length} de ${productos.length} productos`;

  // Agrupar por categoría, respetando el orden de data/menu.js
  const orden  = categorias().map(c => c.id);
  const grupos = {};
  visibles.forEach(p => { (grupos[p.categoria] = grupos[p.categoria] || []).push(p); });
  const ids = [...orden.filter(id => grupos[id]), ...Object.keys(grupos).filter(id => !orden.includes(id))];

  $('listaProductos').innerHTML = ids.map(id => `
    <h2>${escHtml(nombreCategoria(id))}</h2>
    ${grupos[id].map(filaHtml).join('')}`).join('');
}

function filaHtml(p) {
  const nombre = escHtml(p.nombre);
  return `
    <div class="admin-fila${p.visible ? '' : ' oculto'}" data-id="${escHtml(p.id)}">
      <img src="${escHtml(p.img || IMG_FALLBACK)}" alt="" loading="lazy" width="720" height="405">
      <div class="datos">
        <strong>${nombre}${p.visible ? '' : '<span class="admin-etiqueta">Oculto</span>'}</strong>
        <small>${p.unidad ? 'Precio por ' + escHtml(p.unidad) : 'Precio por unidad'}</small>
      </div>
      <div class="ctrl">
        <label class="admin-precio">$
          <input type="text" inputmode="numeric" value="${Number(p.precio)}" data-precio aria-label="Precio de ${nombre}">
        </label>
        <button class="boton" type="button" data-admin="guardar-precio" disabled>Guardar</button>
        <button class="btn-secondary" type="button" data-admin="editar">Editar</button>
      </div>
    </div>`;
}

/** "12.000", "$12000" o "12 000" → 12000. Devuelve null si no es un precio válido. */
function leerPrecio(texto) {
  const limpio = String(texto).replace(/[^\d]/g, '');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) && n <= 100000000 ? n : null;
}

/** Cambio rápido de precio desde la lista. */
async function guardarPrecio(fila) {
  const id     = fila.dataset.id;
  const input  = fila.querySelector('[data-precio]');
  const boton  = fila.querySelector('[data-admin="guardar-precio"]');
  const precio = leerPrecio(input.value);
  if (precio === null) {
    aviso('Escribí el precio solo con números', 'warn');
    input.focus();
    return;
  }

  boton.disabled = true;
  try {
    const filas = await api(`/rest/v1/productos?id=eq.${encodeURIComponent(id)}`, {
      metodo: 'PATCH',
      cuerpo: { precio },
      cabeceras: { Prefer: 'return=representation' },
    });
    if (!filas || filas.length === 0) throw new Error('Tu usuario no tiene permiso para editar el menú.');
    const i = productos.findIndex(p => p.id === id);
    if (i >= 0) productos[i] = filas[0];
    input.value = filas[0].precio;
    aviso(`${filas[0].nombre}: ${formatoPrecio(filas[0].precio)}`);
  } catch (error) {
    boton.disabled = false;
    if (error.message !== 'Sesión vencida') aviso(error.message, 'warn', 4000);
  }
}

/* ───────────────── EDITOR ───────────────── */

function abrirEditor(producto) {
  editando  = producto || null;
  fotoNueva = null;

  $('editorTitulo').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  $('pNombre').value      = producto ? producto.nombre : '';
  $('pCategoria').value   = producto ? producto.categoria : ($('filtroCategoria').value || (categorias()[0] || {}).id || '');
  $('pPrecio').value      = producto ? producto.precio : '';
  $('pUnidad').value      = producto ? producto.unidad : '';
  $('pDescripcion').value = producto ? producto.descripcion : '';
  $('pVisible').checked   = producto ? producto.visible : true;
  $('pOrden').value       = producto ? producto.orden : '';
  $('pFoto').value        = '';
  $('pFotoVista').src     = (producto && producto.img) || IMG_FALLBACK;
  $('btnEliminar').hidden = !producto;
  mostrarError('editorError', '');
  document.querySelectorAll('#formProducto [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

  const modal = $('editor');
  modal.hidden = false;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  $('pNombre').focus({ preventScroll: true });
}

function cerrarEditor() {
  const modal = $('editor');
  if (!modal || modal.hidden) return;
  modal.classList.remove('open');
  modal.hidden = true;
  document.body.style.overflow = '';
  editando  = null;
  fotoNueva = null;
}

/** "Lomito de Pollo" → "lomito-de-pollo", sin repetir un id que ya exista. */
function crearId(nombre) {
  const base = normalizar(nombre).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'producto';
  let id = base;
  for (let n = 2; productos.some(p => p.id === id); n++) id = `${base}-${n}`;
  return id;
}

/** Recorta la foto elegida a 16:9, la achica y la deja lista para subir. */
async function prepararFoto(archivo) {
  if (!archivo.type.startsWith('image/')) throw new Error('Ese archivo no es una imagen.');

  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((ok, mal) => {
      const i = new Image();
      i.onload  = () => ok(i);
      i.onerror = () => mal(new Error('No se pudo leer la imagen. Probá con una foto en JPG o PNG.'));
      i.src = url;
    });

    // Recorte centrado que llena el cuadro 16:9
    const escala = Math.max(FOTO_ANCHO / img.naturalWidth, FOTO_ALTO / img.naturalHeight);
    const ancho  = FOTO_ANCHO / escala;
    const alto   = FOTO_ALTO / escala;
    const lienzo = document.createElement('canvas');
    lienzo.width  = FOTO_ANCHO;
    lienzo.height = FOTO_ALTO;
    lienzo.getContext('2d').drawImage(
      img,
      (img.naturalWidth - ancho) / 2, (img.naturalHeight - alto) / 2, ancho, alto,
      0, 0, FOTO_ANCHO, FOTO_ALTO,
    );

    const blob = await new Promise(ok => lienzo.toBlob(ok, 'image/jpeg', 0.85));
    if (!blob) throw new Error('No se pudo procesar la imagen.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function alElegirFoto() {
  const archivo = $('pFoto').files[0];
  if (!archivo) return;
  try {
    fotoNueva = await prepararFoto(archivo);
    $('pFotoVista').src = URL.createObjectURL(fotoNueva);
    mostrarError('editorError', '');
  } catch (error) {
    fotoNueva = null;
    $('pFoto').value = '';
    mostrarError('editorError', error.message);
  }
}

/** Sube la foto y devuelve su dirección pública. */
async function subirFoto(id, blob) {
  const nombre = `${id}-${Date.now()}.jpg`;   // nombre único: no pisa fotos anteriores
  await api(`/storage/v1/object/${BUCKET_FOTOS}/${nombre}`, {
    metodo: 'POST',
    cuerpo: blob,
    cabeceras: { 'Content-Type': 'image/jpeg', 'cache-control': 'max-age=31536000' },
  });
  return supabaseUrl(`/storage/v1/object/public/${BUCKET_FOTOS}/${nombre}`);
}

function marcarInvalido(id, msg) {
  const el = $(id);
  el.setAttribute('aria-invalid', 'true');
  el.focus();
  mostrarError('editorError', msg);
  return null;
}

/** Lee y valida el formulario. Devuelve los datos o null si falta algo. */
function leerFormulario() {
  document.querySelectorAll('#formProducto [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

  const nombre = $('pNombre').value.trim();
  if (!nombre) return marcarInvalido('pNombre', 'Poné el nombre del producto.');

  const precio = leerPrecio($('pPrecio').value);
  if (precio === null) return marcarInvalido('pPrecio', 'Escribí el precio solo con números, por ejemplo 12000.');

  const ordenTexto = $('pOrden').value.trim();
  let orden = editando ? editando.orden : 0;
  if (ordenTexto !== '') {
    orden = Number(ordenTexto.replace(/[^\d-]/g, ''));
    if (!Number.isInteger(orden)) return marcarInvalido('pOrden', 'El orden tiene que ser un número.');
  } else if (!editando) {
    // Producto nuevo sin orden: va al final de su categoría
    const enCategoria = productos.filter(p => p.categoria === $('pCategoria').value).map(p => p.orden);
    orden = (enCategoria.length ? Math.max(...enCategoria) : 0) + 10;
  }

  return {
    nombre,
    categoria:   $('pCategoria').value,
    precio,
    unidad:      $('pUnidad').value.trim(),
    descripcion: $('pDescripcion').value.trim(),
    visible:     $('pVisible').checked,
    orden,
  };
}

async function guardarProducto(e) {
  e.preventDefault();
  const datos = leerFormulario();
  if (!datos) return;

  const boton = $('btnGuardar');
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  mostrarError('editorError', '');
  try {
    const id = editando ? editando.id : crearId(datos.nombre);
    if (fotoNueva) datos.img = await subirFoto(id, fotoNueva);

    const filas = editando
      ? await api(`/rest/v1/productos?id=eq.${encodeURIComponent(id)}`, {
          metodo: 'PATCH', cuerpo: datos, cabeceras: { Prefer: 'return=representation' },
        })
      : await api('/rest/v1/productos', {
          metodo: 'POST', cuerpo: { id, ...datos }, cabeceras: { Prefer: 'return=representation' },
        });
    if (!filas || filas.length === 0) throw new Error('Tu usuario no tiene permiso para editar el menú.');

    const i = productos.findIndex(p => p.id === id);
    if (i >= 0) productos[i] = filas[0]; else productos.push(filas[0]);
    productos.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));

    const fueNuevo = !editando;
    cerrarEditor();
    renderLista();
    aviso(fueNuevo ? `${filas[0].nombre} agregado al menú` : 'Cambios guardados');
  } catch (error) {
    if (error.message !== 'Sesión vencida') mostrarError('editorError', error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar';
  }
}

async function eliminarProducto() {
  if (!editando) return;
  const { id, nombre } = editando;
  if (!window.confirm(`¿Eliminar "${nombre}" del menú? Esta acción no se puede deshacer.\n\nSi solo querés que no se vea por un tiempo, destildá "Visible en el sitio".`)) return;

  const boton = $('btnEliminar');
  boton.disabled = true;
  try {
    const filas = await api(`/rest/v1/productos?id=eq.${encodeURIComponent(id)}`, {
      metodo: 'DELETE', cabeceras: { Prefer: 'return=representation' },
    });
    if (!filas || filas.length === 0) throw new Error('Tu usuario no tiene permiso para editar el menú.');
    productos = productos.filter(p => p.id !== id);
    cerrarEditor();
    renderLista();
    aviso(`${nombre} eliminado`, 'warn');
  } catch (error) {
    if (error.message !== 'Sesión vencida') mostrarError('editorError', error.message);
  } finally {
    boton.disabled = false;
  }
}

/* ───────────────── ARRANQUE ───────────────── */

function llenarCategorias() {
  const opciones = categorias().map(c => `<option value="${escHtml(c.id)}">${escHtml(c.nombre)}</option>`).join('');
  $('pCategoria').innerHTML      = opciones;
  $('filtroCategoria').innerHTML = '<option value="">Todas las categorías</option>' + opciones;
}

function conectarEventos() {
  $('formLogin').addEventListener('submit', ingresar);
  $('btnSalir').addEventListener('click', salir);
  $('btnNuevo').addEventListener('click', () => abrirEditor(null));
  $('filtroTexto').addEventListener('input', renderLista);
  $('filtroCategoria').addEventListener('change', renderLista);
  $('formProducto').addEventListener('submit', guardarProducto);
  $('btnEliminar').addEventListener('click', eliminarProducto);
  $('pFoto').addEventListener('change', alElegirFoto);

  // Lista: el botón "Guardar" de cada fila se habilita cuando cambia el precio
  $('listaProductos').addEventListener('input', e => {
    if (!e.target.matches('[data-precio]')) return;
    const fila     = e.target.closest('.admin-fila');
    const original = productos.find(p => p.id === fila.dataset.id);
    const precio   = leerPrecio(e.target.value);
    fila.querySelector('[data-admin="guardar-precio"]').disabled =
      precio === null || (original && precio === original.precio);
  });
  $('listaProductos').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('[data-precio]')) {
      const fila = e.target.closest('.admin-fila');
      if (!fila.querySelector('[data-admin="guardar-precio"]').disabled) guardarPrecio(fila);
    }
  });

  document.addEventListener('click', e => {
    const control = e.target.closest('[data-admin]');
    if (control) {
      const fila = control.closest('.admin-fila');
      const accion = control.dataset.admin;
      if (accion === 'cerrar-editor')  cerrarEditor();
      if (accion === 'guardar-precio') guardarPrecio(fila);
      if (accion === 'editar')         abrirEditor(productos.find(p => p.id === fila.dataset.id));
      return;
    }
    if (e.target.id === 'editor') cerrarEditor();   // clic en el fondo oscuro
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarEditor(); });

  // Si una foto no carga, se muestra el logo
  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
    img.dataset.fallback = '1';
    img.src = IMG_FALLBACK;
  }, true);
}

async function iniciarAdmin() {
  llenarCategorias();
  conectarEventos();

  if (!supabaseConfigurado()) {
    mostrarVista('vistaConfig');
    return;
  }

  sesion = leerSesion();
  if (!sesion) {
    mostrarVista('vistaLogin');
    return;
  }
  try {
    await abrirPanel();
  } catch (error) {
    if (error.message !== 'Sesión vencida') mostrarLogin(error.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarAdmin);
} else {
  iniciarAdmin();
}
