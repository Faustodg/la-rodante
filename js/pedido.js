/* ============================================================
   LA RODANTE — PEDIDO
   Modal del carrito, sugerencias, datos de entrega y envío del
   pedido por WhatsApp.
   ============================================================ */

/* ───────────────── MODAL DEL CARRITO ───────────────── */

function carritoAbierto() {
  return !!document.getElementById('modalCarrito')?.classList.contains('open');
}

function abrirCarrito() {
  // Relee lo guardado: puede haber cambiado en otra pestaña del navegador
  cargarCarrito();
  actualizarContador();
  actualizarTarjetas();
  renderCarrito();
  setModalState('modalCarrito', true);
}

function cerrarCarrito() {
  setModalState('modalCarrito', false);
}

/** Renderiza la lista de items del carrito, el total y las sugerencias. */
function renderCarrito() {
  const list    = document.getElementById('listaCarrito');
  const totalEl = document.getElementById('totalCarrito');
  const sugEl   = document.getElementById('sugerencias');
  if (!list || !totalEl || !sugEl) return;

  const lineas = lineasDelCarrito();

  // Los datos de entrega solo tienen sentido si hay algo para pedir
  const datos = document.getElementById('datosEntrega');
  if (datos) datos.hidden = lineas.length === 0;

  if (lineas.length === 0) {
    list.innerHTML = `
      <li role="listitem" class="carrito-vacio">
        Tu carrito está vacío
        <br><small>Agregá productos para continuar</small>
      </li>`;
    sugEl.innerHTML = '';
    sugEl.hidden = true;
    actualizarTotales(lineas);
    return;
  }

  list.innerHTML = lineas.map(l => {
    const nombre = escHtml(l.nombre);
    return `
      <li class="carrito-item" role="listitem" data-id="${escHtml(l.id)}">
        <img src="${escHtml(l.img)}" alt="${nombre}" loading="lazy" decoding="async" width="64" height="64">
        <div class="info">
          <strong title="${nombre}">${nombre}</strong>
          ${l.observacion ? `<small>Obs: ${escHtml(l.observacion)}</small>` : ''}
          <div class="precio">${formatoPrecio(l.precio)} ${l.unidad ? 'el ' + escHtml(l.unidad) : 'c/u'}</div>
        </div>
        <div class="controls">
          <div class="qty-stepper">
            <button class="qty-btn" type="button" data-accion="carrito-restar"
                    aria-label="Quitar uno de ${nombre}">−</button>
            <input class="qty-input" type="number" inputmode="numeric" min="1" step="1"
                   value="${l.cantidad}" aria-label="Cantidad de ${nombre}">
            <button class="qty-btn" type="button" data-accion="carrito-sumar"
                    aria-label="Agregar uno de ${nombre}">+</button>
          </div>
          <button class="btn-secondary" type="button" data-accion="carrito-eliminar"
                  aria-label="Eliminar ${nombre} del carrito">Eliminar</button>
        </div>
      </li>`;
  }).join('');

  actualizarTotales(lineas);

  const sugerencias = generarSugerencias(lineas);
  sugEl.innerHTML = sugerencias;
  sugEl.hidden = sugerencias === '';
}

/* ───────────────── TOTALES Y ENVÍO ───────────────── */

/** Costo de envío que corresponde al pedido actual (0 si retira o si el carrito está vacío). */
function costoEnvio(lineas) {
  if (lineas.length === 0 || leerDatosEntrega().entrega !== 'envio') return 0;
  return Number(DATOS.envio && DATOS.envio.costo) || 0;
}

/** Muestra la fila de envío (si corresponde) y el total del pedido. */
function actualizarTotales(lineas = lineasDelCarrito()) {
  const totalEl = document.getElementById('totalCarrito');
  if (!totalEl) return;

  const productos = lineas.reduce((suma, l) => suma + l.subtotal, 0);
  const envio     = costoEnvio(lineas);

  const fila = document.getElementById('envioRow');
  if (fila) {
    fila.hidden = envio === 0;
    const costoEl = document.getElementById('envioCosto');
    if (costoEl) costoEl.textContent = formatoPrecio(envio);
  }
  totalEl.textContent = formatoPrecio(productos + envio);
}

/* ───────────────── SUGERENCIAS ───────────────── */

/** Combos sugeridos según lo que hay en el carrito (reglas en data/menu.js). */
function generarSugerencias(lineas) {
  const nombres = lineas.map(l => l.nombre.toLowerCase());
  const config  = DATOS.sugerencias || {};

  let ids = (config.reglas || [])
    .filter(regla => nombres.some(n => n.includes(String(regla.siContiene).toLowerCase())))
    .map(regla => regla.combo);
  if (ids.length === 0) ids = config.porDefecto || [];

  const combos = ids.map(itemDelCatalogo).filter(Boolean);
  if (combos.length === 0) return '';

  const cards = combos.map(c => `
    <div>
      <div class="sug-nombre">${escHtml(c.nombre)}</div>
      <div class="sug-desc">${escHtml(c.descripcion || '')}</div>
      <button class="boton sug-btn" type="button" data-accion="agregar-combo" data-id="${escHtml(c.id)}">
        Agregar ${formatoPrecio(c.precio)}
      </button>
    </div>`).join('');

  return `
    <div class="sug-title">
      <h4>Seleccionadas para vos</h4>
    </div>
    <div class="sug-list">${cards}</div>`;
}

/* ───────────────── DATOS DE ENTREGA ───────────────── */
const CLIENTE_KEY = 'cliente_larodante';
const ENTREGAS    = { retiro: 'Paso a retirar', envio: 'Envío a domicilio' };

function camposEntrega() {
  return {
    nombre:    document.getElementById('clienteNombre'),
    direccion: document.getElementById('clienteDireccion'),
    nota:      document.getElementById('clienteNota'),
    grupo:     document.getElementById('opcionesEntrega'),
    campoDir:  document.getElementById('campoDireccion'),
  };
}

function leerDatosEntrega() {
  const c = camposEntrega();
  return {
    nombre:    c.nombre?.value.trim()    || '',
    entrega:   document.querySelector('input[name="entrega"]:checked')?.value || '',
    direccion: c.direccion?.value.trim() || '',
    pago:      document.querySelector('input[name="pago"]:checked')?.value || '',
    nota:      c.nota?.value.trim()      || '',
  };
}

/** La dirección solo se pide si eligen envío; debajo se aclara dónde retiran o cuánto sale el envío. */
function actualizarCampoDireccion() {
  const c       = camposEntrega();
  const entrega = leerDatosEntrega().entrega;
  if (c.campoDir) c.campoDir.hidden = entrega !== 'envio';

  const ayuda = document.getElementById('entregaAyuda');
  if (!ayuda) return;
  const costo     = Number(DATOS.envio && DATOS.envio.costo) || 0;
  const direccion = DATOS.retiro && DATOS.retiro.direccion;
  let texto = '';
  if (entrega === 'retiro' && direccion) texto = `Retirás en ${direccion}.`;
  if (entrega === 'envio') {
    const zona = DATOS.envio && DATOS.envio.zona;
    texto = costo > 0 ? `El envío suma ${formatoPrecio(costo)} al total.` : 'Envío sin cargo.';
    if (zona) texto += ` Solo dentro de ${zona}.`;
  }
  ayuda.textContent = texto;
  ayuda.hidden = texto === '';
}

/** Recupera los datos de la última vez y los guarda a medida que se escriben. */
function initDatosEntrega() {
  const form = document.getElementById('datosEntrega');
  if (!form) return;
  const c = camposEntrega();

  try {
    const g = JSON.parse(localStorage.getItem(CLIENTE_KEY) || '{}');
    if (c.nombre    && typeof g.nombre    === 'string') c.nombre.value    = g.nombre;
    if (c.direccion && typeof g.direccion === 'string') c.direccion.value = g.direccion;
    if (c.nota      && typeof g.nota      === 'string') c.nota.value      = g.nota;
    if (g.entrega === 'retiro' || g.entrega === 'envio') {
      const radio = form.querySelector(`input[name="entrega"][value="${g.entrega}"]`);
      if (radio) radio.checked = true;
    }
    form.querySelectorAll('input[name="pago"]').forEach(radio => {
      if (radio.value === g.pago) radio.checked = true;
    });
  } catch (_) { /* datos corruptos → formulario vacío */ }
  actualizarCampoDireccion();

  const alCambiar = e => {
    e.target.removeAttribute?.('aria-invalid');
    if (e.target.name === 'entrega') {
      c.grupo?.removeAttribute('aria-invalid');
      actualizarTotales();   // el envío cambia el total
    }
    actualizarCampoDireccion();
    try {
      localStorage.setItem(CLIENTE_KEY, JSON.stringify(leerDatosEntrega()));
    } catch (_) { /* sin almacenamiento → no es crítico */ }
  };
  form.addEventListener('input',  alCambiar);
  form.addEventListener('change', alCambiar);
  form.addEventListener('submit', e => e.preventDefault());   // Enter no recarga la página
}

/** Devuelve los datos de entrega, o null (y marca el campo) si falta algo. */
function validarDatosEntrega() {
  if (!document.getElementById('datosEntrega')) return leerDatosEntrega();
  const c = camposEntrega();
  const d = leerDatosEntrega();

  const falta = (el, msg) => {
    el?.setAttribute('aria-invalid', 'true');
    const foco = el?.matches('input') ? el : el?.querySelector('input');
    foco?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'center', behavior: sinAnimaciones() ? 'auto' : 'smooth' });
    toast(msg, 'warn', 2800);
    return null;
  };

  if (!d.nombre)  return falta(c.nombre, 'Decinos tu nombre para el pedido');
  if (!d.entrega) return falta(c.grupo,  'Elegí si pasás a retirar o te lo enviamos');
  if (d.entrega === 'envio' && !d.direccion) {
    return falta(c.direccion, 'Falta la dirección de entrega');
  }
  return d;
}

/* ───────────────── CONFIRMAR PEDIDO (WHATSAPP) ───────────────── */
function confirmarPedido() {
  cargarCarrito();
  const lineas = lineasDelCarrito();
  if (lineas.length === 0) { toast('Tu carrito está vacío 🛒', 'warn'); return; }

  const datos = validarDatosEntrega();
  if (!datos) return;

  let total   = 0;
  let mensaje = 'Hola! Quiero hacer un pedido:';

  lineas.forEach((l, idx) => {
    mensaje += `\n\n${idx + 1}. ${l.nombre}`;
    mensaje += `\n   Cantidad: ${l.cantidad}${l.unidad ? ' × ' + l.unidad : ''}`;
    mensaje += `\n   Precio: ${formatoPrecio(l.precio)} ${l.unidad ? 'el ' + l.unidad : 'c/u'}`;
    mensaje += `\n   Subtotal: ${formatoPrecio(l.subtotal)}`;
    if (l.observacion) mensaje += `\n   Obs: ${l.observacion}`;
    total += l.subtotal;
  });
  const envio = costoEnvio(lineas);
  if (envio > 0) {
    mensaje += `\n\nProductos: ${formatoPrecio(total)}`;
    mensaje += `\nEnvío: ${formatoPrecio(envio)}`;
    mensaje += `\nTotal: ${formatoPrecio(total + envio)}`;
  } else {
    mensaje += `\n\nTotal: ${formatoPrecio(total)}`;
  }

  if (datos.nombre)  mensaje += `\n\nNombre: ${datos.nombre}`;
  if (datos.entrega) mensaje += `\nEntrega: ${ENTREGAS[datos.entrega]}`;
  if (datos.entrega === 'envio' && datos.direccion) mensaje += `\nDirección: ${datos.direccion}`;
  if (datos.pago)    mensaje += `\nPago: ${datos.pago}`;
  if (datos.nota)    mensaje += `\nAclaraciones: ${datos.nota}`;

  mensaje += '\n\nGracias! 🚀';

  const url = `https://wa.me/${DATOS.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
  toast('Redirigiendo a WhatsApp...', 'ok');
}
