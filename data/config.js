/* ============================================================
   LA RODANTE — CONEXIÓN CON SUPABASE (menú en línea y panel /admin)

   Completá los dos datos con los de tu proyecto de Supabase
   (Project Settings > API Keys / Data API):

   - supabaseUrl: la dirección del proyecto, tipo
       https://abcdefghijkl.supabase.co
   - supabaseKey: la clave PÚBLICA ("Publishable key", empieza con
       sb_publishable_...). Está pensada para ir en un sitio web:
       lo que protege los datos son los permisos de la base.

   NUNCA pegues acá la clave secreta ("Secret key", sb_secret_...
   o "service_role"): con esa clave cualquiera podría borrar todo.

   Mientras estén vacíos, el sitio funciona igual usando el menú
   de data/menu.js, y el panel de administración queda desactivado.
   ============================================================ */

const CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
};
