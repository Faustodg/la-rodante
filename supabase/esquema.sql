-- ============================================================
-- LA RODANTE FOOD TRUCK — BASE DE DATOS DEL MENÚ (Supabase)
--
-- Cómo usarlo: en el panel de Supabase abrí "SQL Editor", pegá TODO
-- este archivo y tocá "Run". Se puede correr más de una vez sin
-- romper nada: no pisa precios ni productos que ya hayas cambiado.
--
-- Qué crea:
--   1. La lista de personas que pueden editar el menú.
--   2. La tabla de productos, con sus permisos.
--   3. El espacio para guardar las fotos de los productos.
--   4. Los productos que el sitio tiene hoy, como punto de partida.
-- ============================================================


-- ------------------------------------------------------------
-- 1) QUIÉNES PUEDEN EDITAR
-- Tener un usuario no alcanza: además tiene que estar en esta lista.
-- Así, aunque alguien lograra registrarse, no podría tocar el menú.
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  creado  timestamptz not null default now()
);

-- Sin políticas: nadie puede leerla ni modificarla desde el sitio.
-- Solo se administra desde este editor SQL (ver el paso final).
alter table public.admins enable row level security;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;


-- ------------------------------------------------------------
-- 2) PRODUCTOS
-- ------------------------------------------------------------
create table if not exists public.productos (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  categoria   text        not null check (char_length(categoria) between 1 and 40),
  nombre      text        not null check (char_length(nombre) between 1 and 80),
  descripcion text        not null default '' check (char_length(descripcion) <= 300),
  precio      integer     not null check (precio between 0 and 100000000),
  unidad      text        not null default '' check (char_length(unidad) <= 20),
  img         text        not null default '' check (char_length(img) <= 500),
  obs_ejemplo text        not null default '' check (char_length(obs_ejemplo) <= 60),
  visible     boolean     not null default true,
  orden       integer     not null default 0,
  actualizado timestamptz not null default now()
);

-- Fecha de la última modificación, automática
create or replace function public.marcar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado = now();
  return new;
end;
$$;

drop trigger if exists productos_actualizado on public.productos;
create trigger productos_actualizado
  before update on public.productos
  for each row execute function public.marcar_actualizado();

alter table public.productos enable row level security;

grant select on public.productos to anon, authenticated;
grant insert, update, delete on public.productos to authenticated;

-- El público ve solo los productos visibles; quien administra ve todos.
drop policy if exists "Ver productos" on public.productos;
create policy "Ver productos" on public.productos
  for select to anon, authenticated
  using (visible or public.es_admin());

drop policy if exists "Admin agrega productos" on public.productos;
create policy "Admin agrega productos" on public.productos
  for insert to authenticated
  with check (public.es_admin());

drop policy if exists "Admin modifica productos" on public.productos;
create policy "Admin modifica productos" on public.productos
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "Admin elimina productos" on public.productos;
create policy "Admin elimina productos" on public.productos
  for delete to authenticated
  using (public.es_admin());


-- ------------------------------------------------------------
-- 3) FOTOS DE LOS PRODUCTOS
-- Espacio público de lectura (para que el sitio las muestre); solo
-- quien administra puede subir, reemplazar o borrar. Máximo 1 MB por
-- foto: el panel las achica antes de subirlas.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin sube fotos" on storage.objects;
create policy "Admin sube fotos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists "Admin ve fotos" on storage.objects;
create policy "Admin ve fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'productos' and public.es_admin());

drop policy if exists "Admin reemplaza fotos" on storage.objects;
create policy "Admin reemplaza fotos" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.es_admin())
  with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists "Admin borra fotos" on storage.objects;
create policy "Admin borra fotos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.es_admin());


-- ------------------------------------------------------------
-- 4) CARGA INICIAL
-- Los productos que el sitio tiene hoy. "on conflict do nothing":
-- si un producto ya existe, no lo toca (no pisa tus cambios).
-- ------------------------------------------------------------
insert into public.productos
  (id, categoria, nombre, descripcion, precio, unidad, img, obs_ejemplo, orden)
values
  ('sacramento', 'panificados', 'Sacramento', 'Pan tierno y esponjoso, perfecto para acompañar el mate.', 10000, '¼ kg', 'IMG/menu/sacramento.jpg', 'sin sal', 10),
  ('bizcochito', 'panificados', 'Bizcochito', 'Clásico, salado y crujiente.', 12000, '¼ kg', 'IMG/menu/bizcochito.jpg', '', 20),
  ('chipa', 'panificados', 'Chipá', 'Delicioso pan de queso, crocante por fuera y suave por dentro.', 11000, '¼ kg', 'IMG/menu/chipa.jpg', '', 30),
  ('medialuna', 'panificados', 'Media Luna', 'Dulce, liviana y perfecta para acompañar un café.', 10000, '¼ kg', 'IMG/menu/medialuna.jpg', '', 40),
  ('medialuna-jamon-queso', 'panificados', 'Media Luna Jamón y Queso', 'Rellena con jamón y queso derretido.', 15000, '¼ kg', 'IMG/menu/medialuna-jamon-queso.jpg', '', 50),
  ('mini-pastafrola', 'panificados', 'Mini Pasta Frola', 'Porciones individuales con relleno de dulce de membrillo.', 9000, '¼ kg', 'IMG/menu/mini-pastafrola.jpg', '', 60),
  ('bizcochos-dulces', 'panificados', 'Bizcochos Dulces', 'Suaves y dulces, con el toque justo de azúcar.', 9500, '¼ kg', 'IMG/menu/bizcochos-dulces.jpg', '', 70),
  ('hamburguesa-la-rodante', 'hamburguesas', 'La Rodante', 'Jamón, cheddar, huevo, panceta, aros, tomate, lechuga y salsa especial.', 12000, '', 'IMG/menu/hamburguesa-la-rodante.jpg', '', 10),
  ('hamburguesa-doble', 'hamburguesas', 'Doble', 'Doble carne, doble cheddar, jamón, lechuga y tomate.', 14000, '', 'IMG/menu/hamburguesa-doble.jpg', '', 20),
  ('hamburguesa-completa', 'hamburguesas', 'Completa', 'Jamón, queso, huevo, lechuga y tomate.', 11000, '', 'IMG/menu/hamburguesa-completa.jpg', '', 30),
  ('hamburguesa-ruedita', 'hamburguesas', 'Ruedita', 'Queso cheddar fundido y pan artesanal.', 11500, '', 'IMG/menu/hamburguesa-ruedita.jpg', '', 40),
  ('hamburguesa-clasica', 'hamburguesas', 'Clásica', 'Jamón y queso derretido.', 10000, '', 'IMG/menu/hamburguesa-clasica.jpg', '', 50),
  ('hamburguesa-criolla', 'hamburguesas', 'Criolla', 'Vegetales asados (morrón y cebolla) y queso parrillero.', 10500, '', 'IMG/menu/hamburguesa-criolla.jpg', '', 60),
  ('hamburguesa-barbacoa', 'hamburguesas', 'Barbacoa', 'Cheddar, cebolla de verdeo, tomate y salsa barbacoa.', 14000, '', 'IMG/menu/hamburguesa-barbacoa.jpg', '', 70),
  ('sandwich-bondiola', 'sandwiches', 'Sándwich de Bondiola', 'Bondiola de cerdo asada, salsa de mostaza y rodajas de tomate.', 10000, '', 'IMG/menu/sandwich-bondiola.jpg', '', 10),
  ('lomito-completo', 'sandwiches', 'Lomito Completo', 'Jamón, queso, huevo, tomate y lechuga.', 13000, '', 'IMG/menu/lomito-completo.jpg', '', 20),
  ('emparedado-jamon-queso', 'sandwiches', 'Emparedado de Jamón y Queso', 'Jamón y queso clásico.', 8000, '', 'IMG/menu/emparedado-jamon-queso.jpg', '', 30),
  ('sandwich-pechuga-grille', 'sandwiches', 'Sándwich de Pechuga Grillée', 'Pechuga de pollo grillada con panceta y rúcula.', 11000, '', 'IMG/menu/sandwich-pechuga-grille.jpg', '', 40),
  ('emparedado-completo', 'sandwiches', 'Emparedado Completo', 'Jamón, queso, tomate, lechuga y huevo.', 9000, '', 'IMG/menu/emparedado-completo.jpg', '', 50),
  ('lomito-la-rodante', 'sandwiches', 'Lomito La Rodante', 'Pan, jamón, cheddar, huevo, panceta, tomate y salsa especial.', 14000, '', 'IMG/menu/lomito-la-rodante.jpg', '', 60),
  ('lomito-campero', 'sandwiches', 'Lomito Campero', 'Pan, rúcula, tomate, queso ahumado y panceta.', 12000, '', 'IMG/menu/lomito-campero.jpg', '', 70),
  ('sandwich-milanesa', 'sandwiches', 'Sándwich de Milanesa', 'Milanesa de pollo, queso, tomate, lechuga y huevo.', 12000, '', 'IMG/menu/sandwich-milanesa.jpg', '', 80)
on conflict (id) do nothing;


-- ============================================================
-- PASO FINAL (se hace una sola vez, DESPUÉS de crear el usuario)
--
-- 1. En Supabase: Authentication > Users > "Add user", con el email
--    y la contraseña del dueño.
-- 2. Volvé a este editor, reemplazá el email de abajo por el suyo,
--    sacá los dos guiones del principio de cada línea y tocá "Run":
--
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'EMAIL-DEL-DUEÑO'
-- on conflict do nothing;
--
-- Para quitarle el permiso a alguien:
-- delete from public.admins
-- where user_id = (select id from auth.users where email = 'EMAIL');
-- ============================================================
