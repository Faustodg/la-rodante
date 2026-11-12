/* ============================================================
   LA RODANTE — CATÁLOGO
   Lee los datos de data/menu.js, dibuja las tarjetas del menú y
   maneja pestañas, buscador, filtro de precio y modal de combos.
   ============================================================ */

const IMG_FALLBACK = 'IMG/logo-256.png';   // si una imagen no carga

/* Si data/menu.js no cargó (por ejemplo, por un error de tipeo al editarlo),
   el sitio sigue en pie con el menú vacío y avisa en pantalla. */
const MENU_OK = typeof MENU !== 'undefined';
const DATOS   = MENU_OK ? MENU : {
  whatsapp: '', imgCombo: IMG_FALLBACK,
  productos: [], promos: [], combosExtra: [],
  sugerencias: { reglas: [], porDefecto: [] },
};
if (!MENU_OK) {
  console.error('No se pudo cargar data/menu.js: revisá que no falte una coma, una comilla o una llave.');
}

/* ───────────────── UTILIDADES ───────────────── */

/** Escapa caracteres HTML para insertar texto de los datos en plantillas */
function escHtml(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/'/g,  '&#39;');
}

/** 12000 → "$12.000" */
function formatoPrecio(n) {
  return '$' + Number(n).toLocaleString('es-AR');
}

/** Minúsculas y sin acentos: "sandwich" encuentra "Sándwich". */
function normalizar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const sinAnimaciones = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────────── ÍNDICE DEL CATÁLOGO ───────────────── */

/** Todo lo que se puede pedir (productos y combos), por id. */
const CATALOGO = new Map();

function registrarEnCatalogo(item, tipo) {
  if (CATALOGO.has(item.id)) {
    console.warn(`data/menu.js: el id "${item.id}" está repetido; se usa el último.`);
  }
  CATALOGO.set(item.id, {
    ...item,
    tipo,
    precio: Number(item.precio) || 0,
    img: tipo === 'combo' ? DATOS.imgCombo : item.img,
  });
}

/** Arma el índice a partir de DATOS. Se vuelve a llamar si llega un menú nuevo en línea. */
function reconstruirCatalogo() {
  CATALOGO.clear();
  DATOS.productos.forEach(p => registrarEnCatalogo(p, 'producto'));
  DATOS.promos.forEach(promo => (promo.combos || []).forEach(c => registrarEnCatalogo(c, 'combo')));
  (DATOS.combosExtra || []).forEach(c => registrarEnCatalogo(c, 'combo'));
}

reconstruirCatalogo();

/** Devuelve el producto o combo con ese id, o null. */
function itemDelCatalogo(id) {
  return CATALOGO.get(id) || null;
}

/* ───────────────── DIBUJAR EL MENÚ ───────────────── */

function tarjetaProducto(p) {
  const nombre      = escHtml(p.nombre);
  const placeholder = p.obsEjemplo
    ? `Observación (ej: ${escHtml(p.obsEjemplo)})`
    : 'Observación';

  return `
    <article class="producto" data-id="${escHtml(p.id)}" data-precio="${Number(p.precio) || 0}" aria-label="${nombre}">
      <img src="${escHtml(p.img)}" alt="${nombre}" loading="lazy" decoding="async" width="720" height="405">
      <h3>${nombre}</h3>
      <p>${escHtml(p.descripcion || '')}</p>
      <div class="producto-precio">${formatoPrecio(p.precio)}${p.unidad ? ` <small>el ${escHtml(p.unidad)}</small>` : ''}</div>
      <input class="obs" placeholder="${placeholder}" aria-label="Observación para ${nombre}">
      <div class="acciones">
        <button class="btn-secondary btn-menos" type="button" data-accion="quitar" aria-label="Quitar uno de ${nombre}">−</button>
        <span class="cantidad"></span>
        <button class="boton btn-mas" type="button" data-accion="agregar" aria-label="Agregar ${nombre}">Agregar</button>
      </div>
    </article>`;
}

function tarjetaPromo(promo) {
  const nombre = escHtml(promo.nombre);
  return `
    <div class="promo-card" data-promo="${escHtml(promo.id)}">
      <img src="${escHtml(promo.img)}" alt="${nombre}" class="promo-logo" loading="lazy" decoding="async" width="170" height="170">
      <h3>${nombre}</h3>
      <p>${escHtml(promo.descripcion || '')}</p>
      <div class="acciones">
        <button class="boton" type="button" data-accion="ver-promo" data-promo="${escHtml(promo.id)}">Ver más</button>
      </div>
    </div>`;
}

/** Llena cada grilla (#grid-<categoria> y #grid-promos) con los datos del menú. */
function renderMenu() {
  const porCategoria = {};
  DATOS.productos.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = [];
    porCategoria[p.categoria].push(p);
  });

  // Vaciar primero: si una categoría se quedó sin productos, no deben quedar tarjetas viejas
  document.querySelectorAll('main .categoria .grid').forEach(grid => { grid.innerHTML = ''; });

  Object.keys(porCategoria).forEach(categoria => {
    const grid = document.getElementById('grid-' + categoria);
    if (!grid) {
      console.warn(`data/menu.js: la categoría "${categoria}" no tiene sección en index.html (falta #grid-${categoria}).`);
      return;
    }
    grid.innerHTML = porCategoria[categoria].map(tarjetaProducto).join('');
  });

  const gridPromos = document.getElementById('grid-promos');
  if (gridPromos) gridPromos.innerHTML = DATOS.promos.map(tarjetaPromo).join('');
}

/** Coloca `--anim-delay` en cada card de una sección para la entrada escalonada. */
function aplicarAnimDelay(seccion) {
  seccion.querySelectorAll('.producto').forEach((card, i) => {
    card.style.setProperty('--anim-delay', `${60 + i * 80}`);
  });
}

/** Refleja en cada tarjeta cuántas unidades de ese producto hay en el carrito. */
function actualizarTarjetas() {
  document.querySelectorAll('main .producto[data-id]').forEach(card => {
    const cantidad = card.querySelector('.cantidad');
    const mas      = card.querySelector('.btn-mas');
    if (!cantidad || !mas) return;

    const nombre = card.querySelector('h3')?.textContent || '';
    const item   = carrito[card.dataset.id];
    const qty    = item ? item.cantidad : 0;

    card.classList.toggle('en-carrito', qty > 0);
    cantidad.textContent = qty > 0 ? qty : '';
    mas.textContent      = qty > 0 ? '+' : 'Agregar';
    mas.setAttribute('aria-label',
      qty > 0 ? `Agregar otro ${nombre} (hay ${qty} en el carrito)` : `Agregar ${nombre}`);

    // La observación del campo queda ligada al producto mientras esté en el carrito
    const obs = card.querySelector('.obs');
    if (obs && item && item.observacion && document.activeElement !== obs) {
      obs.value = item.observacion;
    }
  });
}

/* ───────────────── CATEGORÍAS Y PESTAÑAS ───────────────── */

/** Secciones que controlan las pestañas. Las informativas ("Cómo funciona",
 *  "¿Por qué elegirnos?") también usan la clase .categoria pero no tienen
 *  pestaña, así que quedan siempre visibles.
 */
function seccionesMenu() {
  return [...document.querySelectorAll('.tab')]
    .map(tab => document.getElementById(tab.dataset.target))
    .filter(Boolean);
}

/** Id de la categoría cuya pestaña está activa. */
function categoriaActiva() {
  return document.querySelector('.tab.active')?.dataset.target || 'panificados';
}

/** Punto donde empieza el menú. Las pestañas son "sticky", así que su posición
 *  en pantalla no sirve como referencia: se usa el ancla #menu que está justo antes.
 */
function anclaMenu() {
  return document.getElementById('menu') || document.querySelector('.tabs');
}

/** Lleva el scroll al inicio del menú, justo debajo del header fijo. */
function irAlMenu() {
  const ancla = anclaMenu();
  if (!ancla) return;
  const headerH = document.getElementById('mainHeader')?.offsetHeight || 0;
  const y       = ancla.getBoundingClientRect().top + window.scrollY - headerH;
  window.scrollTo({ top: Math.max(0, y), behavior: sinAnimaciones() ? 'auto' : 'smooth' });
}

/** true si el inicio del menú está a la vista, en la mitad superior de la pantalla. */
function menuALaVista() {
  const ancla = anclaMenu();
  if (!ancla) return true;
  const headerH = document.getElementById('mainHeader')?.offsetHeight || 0;
  const top     = ancla.getBoundingClientRect().top;
  return top >= headerH - 4 && top <= window.innerHeight * 0.6;
}

/** Centra la pestaña activa cuando la fila de pestañas tiene scroll horizontal (móvil). */
function centrarTab(tab) {
  const tabs = tab?.closest('.tabs');
  if (!tabs || tabs.scrollWidth <= tabs.clientWidth) return;
  const left = tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2;
  tabs.scrollTo({ left: Math.max(0, left), behavior: sinAnimaciones() ? 'auto' : 'smooth' });
}

/** Activa una pestaña y muestra su categoría. */
function cambiarTab(tab) {
  document.querySelectorAll('.tab').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');

  // Elegir una categoría sale del modo búsqueda
  const search = document.getElementById('searchInput');
  if (search) search.value = '';

  aplicarFiltros();
  const sec = document.getElementById(tab.dataset.target);
  if (sec) aplicarAnimDelay(sec);

  centrarTab(tab);
  irAlMenu();
}

/* ───────────────── FILTROS ───────────────── */

/** true si el nombre o la descripción de la tarjeta contienen el término. */
function coincide(card, term) {
  const name = normalizar(card.querySelector('h3')?.textContent || '');
  const desc = normalizar(card.querySelector('p')?.textContent  || '');
  return name.includes(term) || desc.includes(term);
}

/** Ajusta el rango del filtro a los precios reales del menú. */
function ajustarRangoPrecio() {
  const rango = document.getElementById('rangoPrecio');
  if (!rango) return;
  const precios = DATOS.productos.map(p => Number(p.precio)).filter(precio => precio > 0);
  if (precios.length === 0) return;

  const paso = Number(rango.step) || 500;
  rango.min   = Math.floor(Math.min(...precios) / paso) * paso;
  rango.max   = Math.ceil(Math.max(...precios)  / paso) * paso;
  rango.value = rango.max;
}

/**
 * Aplica juntos el buscador y el precio máximo.
 *  - Sin búsqueda: se ve solo la categoría de la pestaña activa.
 *  - Con búsqueda: se ven todas las categorías que tengan coincidencias.
 */
function aplicarFiltros() {
  const rango    = document.getElementById('rangoPrecio');
  const tope     = Number(rango?.max   || Infinity);
  const max      = Number(rango?.value || tope);
  const hayTope  = max < tope;
  const consulta = (document.getElementById('searchInput')?.value || '').trim();
  const term     = normalizar(consulta);
  const activa   = categoriaActiva();

  const label = document.getElementById('precioMaxLabel');
  if (label) label.textContent = hayTope ? formatoPrecio(max) : 'sin límite';

  let visibles = 0;
  seccionesMenu().forEach(sec => {
    let enSeccion = 0;

    sec.querySelectorAll('.producto').forEach(prod => {
      const ver = Number(prod.dataset.precio || 0) <= max && (!term || coincide(prod, term));
      prod.style.display = ver ? '' : 'none';
      if (ver) enSeccion++;
    });

    // Las promos no tienen precio propio: solo responden al buscador
    sec.querySelectorAll('.promo-card').forEach(card => {
      const ver = !term || coincide(card, term);
      card.style.display = ver ? '' : 'none';
      if (ver) enSeccion++;
    });

    const mostrar = term ? enSeccion > 0 : sec.id === activa;
    const display = mostrar ? 'block' : 'none';
    if (sec.style.display !== display) sec.style.display = display;
    if (mostrar) visibles += enSeccion;
  });

  mostrarSinResultados(visibles, consulta, hayTope ? max : null);
}

/** Aviso cuando ningún producto pasa los filtros (o el menú no cargó). */
function mostrarSinResultados(visibles, consulta, max) {
  const aviso = document.getElementById('sinResultados');
  if (!aviso) return;

  if (!MENU_OK) {
    aviso.textContent = 'No pudimos cargar el menú. Probá recargar la página.';
    aviso.hidden = false;
    return;
  }
  if (visibles > 0) {
    aviso.hidden = true;
    aviso.textContent = '';
    return;
  }
  const tope = max === null ? '' : ` de hasta ${formatoPrecio(max)}`;
  aviso.textContent = consulta
    ? `No encontramos productos${tope} para "${consulta}".`
    : `No hay productos${tope} en esta categoría.`;
  aviso.hidden = false;
}

/** Lo llama el buscador: filtra y, si el menú no está a la vista, lleva hasta él. */
function filtrarProductos() {
  aplicarFiltros();
  const hayBusqueda = (document.getElementById('searchInput')?.value || '').trim() !== '';
  if (hayBusqueda && !menuALaVista()) irAlMenu();
}

/* ───────────────── MODAL DE COMBOS ───────────────── */

function abrirPromo(id) {
  const promo     = DATOS.promos.find(p => p.id === id);
  const container = document.getElementById('promoItems');
  const titleEl   = document.getElementById('promoTitle');
  if (!promo || !container) return;

  if (titleEl) titleEl.textContent = promo.nombre;

  container.innerHTML = (promo.combos || []).map(c => {
    const nombre = escHtml(c.nombre);
    return `
      <article class="producto" data-precio="${Number(c.precio) || 0}">
        <img src="${escHtml(DATOS.imgCombo)}" alt="${nombre}" loading="lazy" decoding="async" width="720" height="405">
        <h3>${nombre}</h3>
        <p>${escHtml(c.descripcion || '')}</p>
        <div class="acciones">
          <button class="boton" type="button" data-accion="agregar-combo" data-id="${escHtml(c.id)}">
            Agregar · ${formatoPrecio(c.precio)}
          </button>
        </div>
      </article>`;
  }).join('');

  // Entrada escalonada de las tarjetas
  [...container.children].forEach((card, idx) => {
    card.style.animation = `cardIn .4s ease ${idx * 0.08}s both`;
  });

  setModalState('promoModal', true);
}

function cerrarPromo() {
  setModalState('promoModal', false);
}
