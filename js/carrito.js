/* ============================================================
   LA RODANTE — CARRITO
   Estado del carrito, guardado en el navegador y operaciones.
   El carrito guarda solo { id: { cantidad, observacion } }: el nombre,
   el precio y la foto salen siempre del catálogo, así un cambio de
   precio en data/menu.js se refleja también en carritos ya armados.
   ============================================================ */

const CARRITO_KEY = 'carrito_larodante';

/** { [id]: { cantidad, observacion } } */
const carrito = {};

/* ───────────────── GUARDADO ───────────────── */

function guardarCarrito() {
  try {
    localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
  } catch (_) { /* sin almacenamiento → el carrito dura lo que dure la visita */ }
}

/** Acepta el id actual o el nombre del producto (formato anterior del carrito). */
function idDesdeClave(clave) {
  if (CATALOGO.has(clave)) return clave;
  for (const [id, item] of CATALOGO) {
    if (item.nombre === clave) return id;
  }
  return null;
}

/** Carga el carrito guardado, descartando lo que ya no exista en el menú. */
function cargarCarrito() {
  for (const k of Object.keys(carrito)) delete carrito[k];

  let guardado = null;
  try {
    guardado = JSON.parse(localStorage.getItem(CARRITO_KEY) || '{}');
  } catch (_) { /* datos corruptos → carrito vacío */ }
  if (!guardado || typeof guardado !== 'object') return;

  Object.entries(guardado).forEach(([clave, info]) => {
    const id       = idDesdeClave(clave);
    const cantidad = Math.floor(Number(info && info.cantidad));
    if (!id || !(cantidad > 0)) return;
    const esCombo = itemDelCatalogo(id).tipo === 'combo';
    carrito[id] = {
      cantidad,
      observacion: esCombo ? '' : String((info && info.observacion) || '').slice(0, 200),
    };
  });
}

/* ───────────────── CONSULTAS ───────────────── */

/** Líneas del carrito con los datos actuales del catálogo. */
function lineasDelCarrito() {
  return Object.entries(carrito)
    .map(([id, info]) => {
      const item = itemDelCatalogo(id);
      if (!item) return null;
      return {
        id,
        nombre:      item.nombre,
        precio:      item.precio,
        unidad:      item.unidad || '',   // p. ej. '¼ kg'; vacío si se vende por unidad
        img:         item.img,
        cantidad:    info.cantidad,
        observacion: item.tipo === 'combo' ? 'Combo' : info.observacion,
        subtotal:    item.precio * info.cantidad,
      };
    })
    .filter(Boolean);
}

function unidadesEnCarrito() {
  return Object.values(carrito).reduce((suma, info) => suma + info.cantidad, 0);
}

/* ───────────────── CONTADOR DEL HEADER ───────────────── */

function actualizarContador() {
  const badge = document.getElementById('contadorCarrito');
  if (!badge) return;
  badge.textContent = unidadesEnCarrito();
  // Pequeño "pop" visual en el badge
  badge.style.transform = 'scale(1.35)';
  setTimeout(() => { badge.style.transform = ''; }, 180);

  actualizarBarraPedido();
}

/* ───────────────── BARRA FIJA DEL PEDIDO (CELULAR) ───────────────── */

/** Muestra la barra "Ver mi pedido" con cantidad y total cuando hay algo en el carrito. */
function actualizarBarraPedido() {
  const barra = document.getElementById('barraPedido');
  if (!barra) return;

  const lineas   = lineasDelCarrito();
  const unidades = unidadesEnCarrito();
  const total    = lineas.reduce((suma, l) => suma + l.subtotal, 0);

  barra.hidden = unidades === 0;
  document.body.classList.toggle('con-barra', unidades > 0);

  const cant = document.getElementById('barraPedidoCant');
  if (cant) cant.textContent = unidades === 1 ? '1 producto' : `${unidades} productos`;
  const totalEl = document.getElementById('barraPedidoTotal');
  if (totalEl) totalEl.textContent = formatoPrecio(total);
}

/** Después de cualquier cambio: guarda y refresca todo lo que muestra el carrito. */
function carritoCambio() {
  guardarCarrito();
  actualizarContador();
  actualizarTarjetas();
  if (carritoAbierto()) renderCarrito();
}

/* ───────────────── OPERACIONES ───────────────── */

/** Agrega una unidad desde la tarjeta, con la observación escrita en ella. */
function agregarProducto(id, card) {
  const item = itemDelCatalogo(id);
  if (!item) return;
  const obs = card?.querySelector('.obs')?.value.trim() || '';

  if (carrito[id]) {
    carrito[id].cantidad += 1;
    if (obs) carrito[id].observacion = obs;
  } else {
    carrito[id] = { cantidad: 1, observacion: obs };
  }

  carritoCambio();
  if (card) flyToCart(card);
  toast(`${item.nombre} agregado 🛒`);
}

/** Quita una unidad desde la tarjeta. */
function quitarProducto(id) {
  const item = itemDelCatalogo(id);
  if (!item) return;
  if (!carrito[id]) {
    toast(`"${item.nombre}" no está en el carrito`, 'warn');
    return;
  }
  carrito[id].cantidad -= 1;
  if (carrito[id].cantidad <= 0) delete carrito[id];
  carritoCambio();
  toast(`${item.nombre} quitado`);
}

/** Agrega un combo (desde el modal de promos o las sugerencias del carrito). */
function agregarCombo(id) {
  const item = itemDelCatalogo(id);
  if (!item) return;
  if (carrito[id]) carrito[id].cantidad += 1;
  else carrito[id] = { cantidad: 1, observacion: '' };
  carritoCambio();
  toast(`${item.nombre} agregado 🛒`);
}

/** Guarda la observación escrita en la tarjeta de un producto que ya está en el carrito. */
function guardarObservacion(id, texto) {
  if (!carrito[id]) return;
  carrito[id].observacion = String(texto).trim();
  guardarCarrito();
}

/** Cambia la cantidad de un item del carrito (mínimo 1). */
function cambiarCantidad(id, qty) {
  qty = Math.max(1, Math.floor(Number(qty)) || 1);
  if (carrito[id]) carrito[id].cantidad = qty;
  carritoCambio();
}

/** Resta una unidad desde el carrito; si era la última, quita el producto. */
function restarItem(id) {
  const info = carrito[id];
  if (!info) return;
  if (info.cantidad > 1) cambiarCantidad(id, info.cantidad - 1);
  else eliminarItem(id);
}

/** Elimina completamente un item del carrito. */
function eliminarItem(id) {
  delete carrito[id];
  carritoCambio();
  toast('Producto eliminado', 'warn');
}

/** Vacía todo el carrito. */
function vaciarCarrito() {
  if (Object.keys(carrito).length === 0) {
    toast('El carrito ya está vacío', 'warn');
    return;
  }
  for (const k of Object.keys(carrito)) delete carrito[k];
  carritoCambio();
  toast('Carrito vaciado', 'warn');
}

/* ───────────────── ESTADO INICIAL ───────────────── */
cargarCarrito();
