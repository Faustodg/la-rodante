/* ============================================================
   LA RODANTE — INTERFAZ Y ARRANQUE
   Avisos (toast), modales, header, animaciones al hacer scroll,
   conexión de eventos e inicialización.
   Se carga último: usa lo definido en catalogo.js, carrito.js y pedido.js.
   ============================================================ */

/* ───────────────── TOAST ───────────────── */

/**
 * Notificación flotante.
 * @param {string}  msg  – mensaje a mostrar
 * @param {'ok'|'warn'|'info'} tipo – color del fondo
 * @param {number}  [ms=2200] – duración en ms
 */
function toast(msg, tipo = 'ok', ms = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.dataset.tipo = tipo;   // el color de cada tipo está en style.css
  clearTimeout(el._t);
  el.classList.add('show');
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

/* ───────────────── ANIMACIÓN "AL CARRITO" ───────────────── */

/** La foto del producto "vuela" hacia el botón del carrito. */
function flyToCart(card) {
  try {
    const original = card.querySelector('img');
    if (!original) return;
    const imgEl = original.cloneNode(false);
    const rect  = original.getBoundingClientRect();

    Object.assign(imgEl.style, {
      position:     'fixed',
      left:         rect.left   + 'px',
      top:          rect.top    + 'px',
      width:        rect.width  + 'px',
      height:       rect.height + 'px',
      borderRadius: '12px',
      zIndex:       '99999',
      pointerEvents:'none',
      transition:   'all .72s cubic-bezier(.22,1,.36,1)',
      willChange:   'transform, opacity, left, top, width, height',
    });

    document.body.appendChild(imgEl);

    requestAnimationFrame(() => {
      imgEl.style.left      = (window.innerWidth  - 56) + 'px';
      imgEl.style.top       = '14px';
      imgEl.style.width     = '44px';
      imgEl.style.height    = '44px';
      imgEl.style.opacity   = '0.35';
      imgEl.style.transform = 'rotate(360deg) scale(0.45)';
      imgEl.style.filter    = 'blur(2px)';
    });

    setTimeout(() => imgEl.remove(), 780);
  } catch (_) { /* no crítico */ }
}

/* ───────────────── MODALES ───────────────── */

/** Lo que queda detrás de un modal: se vuelve inerte mientras está abierto. */
const FONDO_MODAL = 'main, header, footer, .hero, .tabs, .filtro-precio, .barra-pedido';

/** Abre o cierra un modal, con gestión de foco y bloqueo del fondo. */
function setModalState(id, open) {
  const modal   = document.getElementById(id);
  const cartBtn = document.getElementById('cartBtn');
  const isCart  = id === 'modalCarrito';
  if (!modal) return;

  if (open) {
    if (modal.classList.contains('open')) return;

    // Guardar el foco antes de volver inerte el fondo, para restaurarlo al cerrar
    modal._prevFocus = document.activeElement;

    modal.classList.add('open');
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-abierto');

    document.querySelectorAll(FONDO_MODAL).forEach(el => el.setAttribute('inert', ''));

    if (isCart && cartBtn) cartBtn.setAttribute('aria-expanded', 'true');

    // Llevar el foco adentro del modal
    modal.querySelector('.closeModal')?.focus({ preventScroll: true });
  } else {
    if (!modal.classList.contains('open')) return;

    modal.classList.remove('open');
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.classList.remove('modal-abierto');

    document.querySelectorAll('[inert]').forEach(el => el.removeAttribute('inert'));

    if (isCart && cartBtn) cartBtn.setAttribute('aria-expanded', 'false');

    // Restaurar foco
    modal._prevFocus?.focus?.();
    modal._prevFocus = null;
  }
}

/* ───────────────── HEADER ───────────────── */
function initHeader() {
  const header = document.getElementById('mainHeader');
  if (!header) return;

  const onScroll = () =>
    header.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // sincronizar estado inicial

  // Publica la altura real del header en --header-real: las pestañas sticky la usan
  // como "top", así quedan bien al girar el teléfono o redimensionar la ventana.
  const publicarAltura = () =>
    document.documentElement.style.setProperty('--header-real', header.offsetHeight + 'px');
  publicarAltura();
  if ('ResizeObserver' in window) new ResizeObserver(publicarAltura).observe(header);
  else window.addEventListener('resize', publicarAltura);
}

/* ───────────────── SCROLL REVEAL ───────────────── */
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeUp .6s ease both';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.categoria, footer').forEach(el => observer.observe(el));

  // Equipo y eventos arrancan ocultos y aparecen al entrar en pantalla
  document.querySelectorAll('.team-section, .events-section').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    observer.observe(el);
  });
}

/* ─── VIDEOS DE EVENTOS ─── */

/**
 * Los videos arrancan solo cuando la persona toca reproducir (pesan varios MB:
 * no se descargan solos). Acá se evita que suenen dos a la vez y se pausan
 * al salir de pantalla.
 */
function initVideosEventos() {
  const videos = [...document.querySelectorAll('.event-card video')];
  if (!videos.length) return;

  videos.forEach(video => {
    video.addEventListener('play', () => {
      videos.forEach(otro => { if (otro !== video && !otro.paused) otro.pause(); });
    });
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (!entry.isIntersecting && !video.paused && !document.fullscreenElement) video.pause();
    });
  }, { threshold: 0.2 });

  videos.forEach(v => observer.observe(v));
}

/* ─── DATOS DEL NEGOCIO EN LA PÁGINA ─── */

/** Lleva a la página los datos que viven en data/menu.js (WhatsApp y costo de envío) y el año. */
function initDatosNegocio() {
  if (DATOS.whatsapp) {
    document.querySelectorAll('a[data-wa]').forEach(a => { a.href = `https://wa.me/${DATOS.whatsapp}`; });
  }
  if (DATOS.envio) {
    const costo = Number(DATOS.envio.costo) || 0;
    document.querySelectorAll('[data-envio-costo]').forEach(el => {
      el.textContent = costo > 0 ? formatoPrecio(costo) : 'sin cargo';
    });
  }
  const anio = document.getElementById('anioActual');
  if (anio) anio.textContent = new Date().getFullYear();
}

/* ─── ABIERTO / CERRADO ─── */

/** true si ahora está dentro de alguno de los turnos de data/menu.js; null si no hay horarios cargados. */
function estaAbierto(ahora = new Date()) {
  const h = DATOS.horarios;
  if (!h || !Array.isArray(h.dias) || !Array.isArray(h.turnos)) return null;
  if (!h.dias.includes(ahora.getDay())) return false;
  const hora = ahora.getHours() + ahora.getMinutes() / 60;
  return h.turnos.some(([abre, cierra]) => hora >= abre && hora < cierra);
}

/** Completa los carteles [data-estado] y los mantiene al día mientras la página está abierta. */
function initEstadoLocal() {
  const carteles = document.querySelectorAll('[data-estado]');
  if (!carteles.length) return;

  const actualizar = () => {
    const abierto = estaAbierto();
    carteles.forEach(el => {
      el.hidden = abierto === null;
      el.textContent = abierto ? 'Abierto ahora' : 'Cerrado ahora';
      el.classList.toggle('abierto', abierto === true);
    });
  };
  actualizar();
  setInterval(actualizar, 60000);
}

/* ─── ENTRADA ESCALONADA DE TARJETAS DE EQUIPO Y EVENTOS ─── */
function initAnimacionesEscalonadas() {
  document.querySelectorAll('.team-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 100}ms`;
  });
  document.querySelectorAll('.event-card').forEach((card, i) => {
    card.style.animationDelay = `${i * 110}ms`;
  });
}

/* ───────────────── EVENTOS ─────────────────
   El HTML no tiene onclick: cada control declara qué hace con
   data-accion="..." y acá se resuelve todo en un solo lugar. */

const ACCIONES = {
  'tab':              el => cambiarTab(el),
  'abrir-carrito':    ()  => abrirCarrito(),
  'cerrar-carrito':   ()  => cerrarCarrito(),
  'cerrar-promo':     ()  => cerrarPromo(),
  'ver-promo':        el => abrirPromo(el.dataset.promo),
  'agregar':          el => { const card = el.closest('.producto'); agregarProducto(card?.dataset.id, card); },
  'quitar':           el => quitarProducto(el.closest('.producto')?.dataset.id),
  'agregar-combo':    el => agregarCombo(el.dataset.id),
  'carrito-sumar':    el => { const id = idDeLinea(el); if (carrito[id]) cambiarCantidad(id, carrito[id].cantidad + 1); },
  'carrito-restar':   el => restarItem(idDeLinea(el)),
  'carrito-eliminar': el => eliminarItem(idDeLinea(el)),
  'vaciar-carrito':   ()  => vaciarCarrito(),
  'confirmar-pedido': ()  => confirmarPedido(),
};

/** Id del producto de la línea del carrito donde está el control. */
function idDeLinea(el) {
  return el.closest('.carrito-item')?.dataset.id;
}

function initEventos() {
  document.addEventListener('click', e => {
    const control = e.target.closest('[data-accion]');
    if (control) {
      ACCIONES[control.dataset.accion]?.(control);
      return;
    }
    // Clic en el fondo oscuro de un modal → cerrarlo
    if (e.target.id === 'modalCarrito') cerrarCarrito();
    if (e.target.id === 'promoModal')   cerrarPromo();
  });

  // Cerrar el modal abierto con ESC
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    cerrarCarrito();
    cerrarPromo();
  });

  document.getElementById('searchInput')?.addEventListener('input', filtrarProductos);
  document.getElementById('rangoPrecio')?.addEventListener('input', aplicarFiltros);

  document.addEventListener('change', e => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.matches('.qty-input')) {
      cambiarCantidad(idDeLinea(el), el.value);          // cantidad escrita a mano en el carrito
    } else if (el.matches('.producto .obs')) {
      guardarObservacion(el.closest('.producto')?.dataset.id, el.value);
    }
  });

  // Si la foto de un producto no carga, se muestra el logo en su lugar
  document.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
    if (!img.closest('.producto, .promo-card, .carrito-item')) return;
    img.dataset.fallback = '1';
    img.src = IMG_FALLBACK;
  }, true);
}

/* ───────────────── MENÚ NUEVO EN LÍNEA ───────────────── */

/** Reemplaza los productos (los combos no cambian) y pone al día todo lo que los muestra. */
function aplicarProductos(productos) {
  DATOS.productos = productos;
  reconstruirCatalogo();
  renderMenu();

  // El carrito descarta lo que ya no exista en el menú
  cargarCarrito();
  guardarCarrito();
  actualizarContador();
  actualizarTarjetas();

  ajustarRangoPrecio();
  aplicarFiltros();
  const seccion = document.getElementById(categoriaActiva());
  if (seccion) aplicarAnimDelay(seccion);
  if (carritoAbierto()) renderCarrito();
}

/* ───────────────── INICIALIZACIÓN ───────────────── */
function init() {
  renderMenu();
  actualizarContador();
  actualizarTarjetas();
  initDatosEntrega();
  ajustarRangoPrecio();

  // Deja visible solo la categoría de la pestaña activa
  aplicarFiltros();
  const defaultSection = document.getElementById(categoriaActiva());
  if (defaultSection) aplicarAnimDelay(defaultSection);

  initDatosNegocio();
  initEstadoLocal();
  initEventos();
  initHeader();
  initScrollReveal();
  initVideosEventos();
  initAnimacionesEscalonadas();

  // Por último, sin frenar la página: buscar si hay un menú más nuevo en línea
  sincronizarMenuRemoto();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
