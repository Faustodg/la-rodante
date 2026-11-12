/* ============================================================
   LA RODANTE — DATOS DEL MENÚ

   Este es el ÚNICO archivo que hay que editar para cambiar
   productos, precios, fotos, promos o el número de WhatsApp.

   Cómo editar sin romper nada:
   - Cada producto va entre llaves { } y termina con una coma.
   - Los textos van entre comillas simples: 'así'.
   - Los precios son números sin puntos ni signo: 12000 (no $12.000).
   - "unidad" es opcional: si el precio no es por unidad, poné a qué
     corresponde (por ejemplo '¼ kg') y se muestra junto al precio.
   - "id" es un nombre interno, único, en minúsculas y sin espacios.
     No lo cambies en un producto que ya existe: el carrito lo usa.
   - "categoria" tiene que coincidir con una pestaña del sitio:
     panificados, hamburguesas o sandwiches.
   - Las fotos del menú van en IMG/menu/ en formato 16:9 (720 x 405 px
     alcanza; fotos más grandes solo hacen más lento el sitio).

   Si después de editar el menú no aparece, casi siempre falta
   una coma, una comilla o una llave.
   ============================================================ */

const MENU = {

  /* Número de WhatsApp que recibe los pedidos (con código de país, sin + ni espacios) */
  whatsapp: '5492364418887',

  /* Horarios de atención, para el cartel "Abierto ahora / Cerrado ahora".
     dias: 0 = domingo, 1 = lunes, 2 = martes ... 6 = sábado.
     turnos: [hora en que abre, hora en que cierra], en formato 24 h (24 = medianoche).
     Si cambian, actualizá también el texto en index.html (hero, "Dónde encontrarnos",
     footer y datos para Google). */
  horarios: {
    dias:   [2, 3, 4, 5, 6, 0],
    turnos: [[8, 12], [19, 24]],
  },

  /* Costo del envío a domicilio y zona donde se hace. El costo se suma al total
     cuando el cliente elige envío. Poné costo 0 si el envío es sin cargo. */
  envio: { costo: 500, zona: 'Vedia' },

  /* Dirección de retiro: se le muestra al cliente cuando elige "Paso a retirar".
     (La dirección también está escrita en index.html: sección "Dónde encontrarnos",
     footer y datos para Google.) */
  retiro: { direccion: 'Av. 25 de Mayo 151, Vedia' },

  /* Imagen que se usa para todos los combos */
  imgCombo: 'IMG/promos/promo5.jpg',

  /* Categorías de productos: las usa el panel de administración para el desplegable.
     Cada "id" tiene que tener su pestaña y su sección en index.html. */
  categorias: [
    { id: 'panificados',  nombre: 'Panificados' },
    { id: 'hamburguesas', nombre: 'Hamburguesas' },
    { id: 'sandwiches',   nombre: 'Sándwiches' },
  ],

  /* ───────────────── PRODUCTOS ─────────────────
     Si el panel de administración está conectado (data/config.js), los productos
     que se muestran son los cargados ahí; esta lista queda como respaldo por si
     el servicio no responde. */
  productos: [

    /* ── Panificados ── */
    { id: 'sacramento',            categoria: 'panificados', nombre: 'Sacramento',               precio: 10000, unidad: '¼ kg',
      descripcion: 'Pan tierno y esponjoso, perfecto para acompañar el mate.',
      img: 'IMG/menu/sacramento.jpg', obsEjemplo: 'sin sal' },
    { id: 'bizcochito',            categoria: 'panificados', nombre: 'Bizcochito',               precio: 12000, unidad: '¼ kg',
      descripcion: 'Clásico, salado y crujiente.',
      img: 'IMG/menu/bizcochito.jpg' },
    { id: 'chipa',                 categoria: 'panificados', nombre: 'Chipá',                    precio: 11000, unidad: '¼ kg',
      descripcion: 'Delicioso pan de queso, crocante por fuera y suave por dentro.',
      img: 'IMG/menu/chipa.jpg' },
    { id: 'medialuna',             categoria: 'panificados', nombre: 'Media Luna',               precio: 10000, unidad: '¼ kg',
      descripcion: 'Dulce, liviana y perfecta para acompañar un café.',
      img: 'IMG/menu/medialuna.jpg' },
    { id: 'medialuna-jamon-queso', categoria: 'panificados', nombre: 'Media Luna Jamón y Queso', precio: 15000, unidad: '¼ kg',
      descripcion: 'Rellena con jamón y queso derretido.',
      img: 'IMG/menu/medialuna-jamon-queso.jpg' },
    { id: 'mini-pastafrola',       categoria: 'panificados', nombre: 'Mini Pasta Frola',         precio: 9000, unidad: '¼ kg',
      descripcion: 'Porciones individuales con relleno de dulce de membrillo.',
      img: 'IMG/menu/mini-pastafrola.jpg' },
    { id: 'bizcochos-dulces',      categoria: 'panificados', nombre: 'Bizcochos Dulces',         precio: 9500, unidad: '¼ kg',
      descripcion: 'Suaves y dulces, con el toque justo de azúcar.',
      img: 'IMG/menu/bizcochos-dulces.jpg' },

    /* ── Hamburguesas ── */
    { id: 'hamburguesa-la-rodante', categoria: 'hamburguesas', nombre: 'La Rodante', precio: 12000,
      descripcion: 'Jamón, cheddar, huevo, panceta, aros, tomate, lechuga y salsa especial.',
      img: 'IMG/menu/hamburguesa-la-rodante.jpg' },
    { id: 'hamburguesa-doble',      categoria: 'hamburguesas', nombre: 'Doble',      precio: 14000,
      descripcion: 'Doble carne, doble cheddar, jamón, lechuga y tomate.',
      img: 'IMG/menu/hamburguesa-doble.jpg' },
    { id: 'hamburguesa-completa',   categoria: 'hamburguesas', nombre: 'Completa',   precio: 11000,
      descripcion: 'Jamón, queso, huevo, lechuga y tomate.',
      img: 'IMG/menu/hamburguesa-completa.jpg' },
    { id: 'hamburguesa-ruedita',    categoria: 'hamburguesas', nombre: 'Ruedita',    precio: 11500,
      descripcion: 'Queso cheddar fundido y pan artesanal.',
      img: 'IMG/menu/hamburguesa-ruedita.jpg' },
    { id: 'hamburguesa-clasica',    categoria: 'hamburguesas', nombre: 'Clásica',    precio: 10000,
      descripcion: 'Jamón y queso derretido.',
      img: 'IMG/menu/hamburguesa-clasica.jpg' },
    { id: 'hamburguesa-criolla',    categoria: 'hamburguesas', nombre: 'Criolla',    precio: 10500,
      descripcion: 'Vegetales asados (morrón y cebolla) y queso parrillero.',
      img: 'IMG/menu/hamburguesa-criolla.jpg' },
    { id: 'hamburguesa-barbacoa',   categoria: 'hamburguesas', nombre: 'Barbacoa',   precio: 14000,
      descripcion: 'Cheddar, cebolla de verdeo, tomate y salsa barbacoa.',
      img: 'IMG/menu/hamburguesa-barbacoa.jpg' },

    /* ── Sándwiches ── */
    { id: 'sandwich-bondiola',       categoria: 'sandwiches', nombre: 'Sándwich de Bondiola',        precio: 10000,
      descripcion: 'Bondiola de cerdo asada, salsa de mostaza y rodajas de tomate.',
      img: 'IMG/menu/sandwich-bondiola.jpg' },
    { id: 'lomito-completo',         categoria: 'sandwiches', nombre: 'Lomito Completo',             precio: 13000,
      descripcion: 'Jamón, queso, huevo, tomate y lechuga.',
      img: 'IMG/menu/lomito-completo.jpg' },
    { id: 'emparedado-jamon-queso',  categoria: 'sandwiches', nombre: 'Emparedado de Jamón y Queso', precio: 8000,
      descripcion: 'Jamón y queso clásico.',
      img: 'IMG/menu/emparedado-jamon-queso.jpg' },
    { id: 'sandwich-pechuga-grille', categoria: 'sandwiches', nombre: 'Sándwich de Pechuga Grillée', precio: 11000,
      descripcion: 'Pechuga de pollo grillada con panceta y rúcula.',
      img: 'IMG/menu/sandwich-pechuga-grille.jpg' },
    { id: 'emparedado-completo',     categoria: 'sandwiches', nombre: 'Emparedado Completo',         precio: 9000,
      descripcion: 'Jamón, queso, tomate, lechuga y huevo.',
      img: 'IMG/menu/emparedado-completo.jpg' },
    { id: 'lomito-la-rodante',       categoria: 'sandwiches', nombre: 'Lomito La Rodante',           precio: 14000,
      descripcion: 'Pan, jamón, cheddar, huevo, panceta, tomate y salsa especial.',
      img: 'IMG/menu/lomito-la-rodante.jpg' },
    { id: 'lomito-campero',          categoria: 'sandwiches', nombre: 'Lomito Campero',              precio: 12000,
      descripcion: 'Pan, rúcula, tomate, queso ahumado y panceta.',
      img: 'IMG/menu/lomito-campero.jpg' },
    { id: 'sandwich-milanesa',       categoria: 'sandwiches', nombre: 'Sándwich de Milanesa',        precio: 12000,
      descripcion: 'Milanesa de pollo, queso, tomate, lechuga y huevo.',
      img: 'IMG/menu/sandwich-milanesa.jpg' },
  ],

  /* ───────────────── PROMOS Y COMBOS ─────────────────
     Cada promo es una tarjeta de la pestaña "Promos"; al tocar "Ver más"
     se abren sus combos.
     PENDIENTE: estos combos y precios son los que ya tenía el sitio y
     todavía no fueron confirmados contra la lista real del negocio. */
  promos: [
    { id: 'burgers', nombre: 'Combos Hamburguesas',
      descripcion: '2 hamburguesas + papas chica + vaso de cerveza',
      img: 'IMG/promos/promo3.jpg',
      combos: [
        { id: 'pb1', nombre: 'Combo Barbacoa', precio: 35000, descripcion: '2 Barbacoa + papas chica + vaso de cerveza' },
        { id: 'pb2', nombre: 'Combo Criolla',  precio: 31000, descripcion: '2 Criolla + papas chica + vaso de cerveza' },
      ] },

    { id: 'lomitos', nombre: 'Combos Lomitos',
      descripcion: '4 lomitos + papas chica + vaso grande',
      img: 'IMG/promos/promo1.jpg',
      combos: [
        { id: 'pl1', nombre: 'Lomito Completo x4', precio: 46000, descripcion: '4 Lomitos completos + papas chica + vaso grande' },
        { id: 'pl2', nombre: 'La Rodante x4',      precio: 48000, descripcion: '4 La Rodante + papas chica + vaso grande' },
        { id: 'pl3', nombre: 'Campero x4',         precio: 47000, descripcion: '4 Campero + papas chica + vaso grande' },
        { id: 'pl4', nombre: 'Obediense x4',       precio: 47500, descripcion: '4 Obediense + papas chica + vaso grande' },
      ] },

    { id: 'burgers2', nombre: 'Hamburguesas + Papas',
      descripcion: 'Completa / La Rodante / Clásica / Ruedita con papas y gaseosa',
      img: 'IMG/promos/promo2.jpg',
      combos: [
        { id: 'hb1', nombre: 'Combo La Rodante', precio: 25000, descripcion: 'La Rodante + papas chica + gaseosa' },
        { id: 'hb2', nombre: 'Combo Completa',   precio: 23000, descripcion: 'Completa + papas chica + gaseosa' },
        { id: 'hb3', nombre: 'Combo Clásica',    precio: 21000, descripcion: 'Clásica + papas chica + gaseosa' },
        { id: 'hb4', nombre: 'Combo Ruedita',    precio: 22000, descripcion: 'Ruedita + papas chica + gaseosa' },
      ] },

    { id: 'sandwiches', nombre: 'Combos Sándwiches',
      descripcion: 'Emparedados + papas chica + vaso de gaseosa',
      img: 'IMG/promos/promo4.jpg',
      combos: [
        { id: 'sb1', nombre: 'Emparedado J&Q Combo',      precio: 15000, descripcion: 'Emparedado clásico + papas chica + gaseosa' },
        { id: 'sb2', nombre: 'Emparedado Completo Combo', precio: 16000, descripcion: 'Emparedado completo + papas chica + gaseosa' },
        { id: 'sb3', nombre: 'Pechuga Grillée Combo',     precio: 18000, descripcion: 'Pechuga grillée + papas chica + gaseosa' },
        { id: 'sb4', nombre: 'Bondiola Asada Combo',      precio: 17500, descripcion: 'Bondiola asada + papas chica + gaseosa' },
      ] },

    { id: 'varias', nombre: 'Promos Varias',
      descripcion: 'Promos editables — armá el combo a tu gusto',
      img: 'IMG/promos/promo5.jpg',
      combos: [
        { id: 'v1', nombre: 'Promo Armá tu Combo', precio: 20000, descripcion: 'Armá el combo a tu gusto — consultá opciones' },
        { id: 'v2', nombre: 'Promo Premium',       precio: 28000, descripcion: 'Los mejores productos combinados — consultá' },
      ] },
  ],

  /* Combos que solo aparecen como sugerencia dentro del carrito */
  combosExtra: [
    { id: 'sg1', nombre: 'Combo 4 Lomitos',     precio: 46000, descripcion: '4 Lomitos + papas chica + vaso grande' },
    { id: 'sg2', nombre: '2x Burgers + Papas',  precio: 33000, descripcion: '2 hamburguesas + papas chica' },
    { id: 'sg3', nombre: '4x Lomitos + Bebida', precio: 90000, descripcion: '4 lomitos + vaso grande' },
  ],

  /* ───────────────── SUGERENCIAS DEL CARRITO ─────────────────
     Si el nombre de algo que está en el carrito contiene la palabra de
     "siContiene", se sugiere ese combo. Si ninguna regla aplica, se
     muestran los combos de "porDefecto". */
  sugerencias: {
    reglas: [
      { siContiene: 'barbacoa', combo: 'pb1' },
      { siContiene: 'criolla',  combo: 'pb2' },
      { siContiene: 'lomito',   combo: 'sg1' },
    ],
    porDefecto: ['sg2', 'sg3'],
  },
};
