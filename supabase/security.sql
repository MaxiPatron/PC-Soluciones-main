-- =====================================================================
-- PC Soluciones · Seguridad (RLS y permisos)
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Se puede correr más de una vez sin romper nada.
-- Correlo DESPUÉS de dollar-sync.sql, image-search.sql y price-history.sql.
--
-- Antes de esto, cualquiera con la clave pública de la página (que viaja
-- en el navegador, la puede ver cualquiera) podía:
--   · borrar o modificar productos y categorías
--   · leer los costos en USD, el precio real y los datos del mayorista
--   · leer los perfiles (nombre, teléfono, ciudad) de todos los usuarios
--   · ponerse como admin editando su propio perfil
-- Después de esto:
--   · Productos/categorías: todos pueden VER (lo que muestra la tienda);
--     solo un admin puede crear, editar o borrar
--   · Costos, precios y datos del mayorista: solo los ve un admin
--   · Perfiles: cada usuario ve y edita solo el suyo; el admin ve todos
--   · Pedidos y carritos (tablas que la página no usa): solo admin
-- =====================================================================

-- ---------- ¿Es admin? (para las reglas de seguridad) ----------
-- Vive en el schema "access", que no se publica en la API: las reglas
-- (RLS) la pueden usar, pero nadie la puede llamar desde afuera.
create schema if not exists access;
grant usage on schema access to anon, authenticated;

create or replace function access.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function access.is_admin() from public;
grant execute on function access.is_admin() to anon, authenticated;

-- ---------- Activar RLS en todas las tablas ----------
alter table public.products     enable row level security;
alter table public.categories   enable row level security;
alter table public.profiles     enable row level security;
alter table public.cart_items   enable row level security;
alter table public.orders       enable row level security;
alter table public.order_items  enable row level security;

-- ---------- PRODUCTOS ----------
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (active = true or access.is_admin());

drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert" on public.products
  for insert with check (access.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update" on public.products
  for update using (access.is_admin()) with check (access.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete" on public.products
  for delete using (access.is_admin());

-- Columnas que puede leer la tienda. Costos, precio, IVA, dólar y datos del
-- mayorista NO están: la tienda muestra "Consultar precio" y nadie puede
-- sacar el precio real desde la API.
-- (Si algún día publicás precios, agregá "price" a esta lista y volvé a correrlo.)
revoke select on public.products from anon, authenticated;
grant select (id, name, slug, brand, sku, description, image_url, stock,
              active, featured, category_id, created_at)
  on public.products to anon, authenticated;
-- Un visitante sin cuenta no escribe nunca; los admins escriben con su sesión
revoke insert, update, delete on public.products from anon;

-- El admin lee TODAS las columnas a través de esta función
-- (src/admin/AdminPanel.jsx la usa para cargar la tabla de productos)
create or replace function public.admin_products()
returns setof public.products
language plpgsql stable security definer set search_path = public
as $$
begin
  if not access.is_admin() then
    raise exception 'No autorizado';
  end if;
  return query select * from public.products;
end;
$$;
revoke execute on function public.admin_products() from public, anon;
grant execute on function public.admin_products() to authenticated;

-- ---------- CATEGORÍAS ----------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all using (access.is_admin()) with check (access.is_admin());

revoke insert, update, delete on public.categories from anon;

-- ---------- PERFILES ----------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or access.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or access.is_admin())
  with check (id = auth.uid() or access.is_admin());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles
  for delete using (access.is_admin());

revoke all on public.profiles from anon;
-- (el trigger trg_protect_profile_role de dollar-sync.sql impide que un
--  usuario común se cambie el rol a admin)

-- Al registrarse con confirmación por mail todavía no hay sesión, así que
-- el perfil se crea desde la base con los datos del formulario.
-- Solo se agrega si no tenés ya un trigger que lo haga.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, full_name, phone, city, province, role)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'phone',
      new.raw_user_meta_data ->> 'city',
      new.raw_user_meta_data ->> 'province',
      'user'
    )
    on conflict (id) do nothing;
  exception when others then
    -- nunca bloquear un registro por un problema con el perfil
    raise warning 'No se pudo crear el perfil de %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and t.tgname <> 'trg_create_profile_for_new_user'
      and pg_get_functiondef(p.oid) ilike '%profiles%'
  ) then
    drop trigger if exists trg_create_profile_for_new_user on auth.users;
    create trigger trg_create_profile_for_new_user
      after insert on auth.users
      for each row execute function public.create_profile_for_new_user();
  end if;
end $$;

-- ---------- PEDIDOS / CARRITO (la página no los usa) ----------
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders
  for all using (access.is_admin()) with check (access.is_admin());

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (access.is_admin()) with check (access.is_admin());

drop policy if exists "cart_items_admin_all" on public.cart_items;
create policy "cart_items_admin_all" on public.cart_items
  for all using (access.is_admin()) with check (access.is_admin());

revoke all on public.orders, public.order_items, public.cart_items from anon;

-- ---------- Dólar e historial: reglas con access.is_admin() ----------
drop policy if exists "exchange_rates_admin_update" on public.exchange_rates;
create policy "exchange_rates_admin_update" on public.exchange_rates
  for update using (access.is_admin()) with check (access.is_admin());

do $$
begin
  if to_regclass('public.price_history') is not null then
    drop policy if exists "price_history_admin_read" on public.price_history;
    create policy "price_history_admin_read" on public.price_history
      for select using (access.is_admin());
    drop policy if exists "dollar_history_admin_read" on public.dollar_history;
    create policy "dollar_history_admin_read" on public.dollar_history
      for select using (access.is_admin());
  end if;
end $$;

-- ---------- Funciones: search_path fijo ----------
-- (el Security Advisor marca "Function Search Path Mutable" en las que no lo tienen)
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    begin
      execute format('alter function %s set search_path = public, extensions', f.sig);
    exception when others then
      raise notice 'No se pudo ajustar %: %', f.sig, sqlerrm;
    end;
  end loop;
end $$;

-- ---------- Funciones internas: que nadie las llame desde la web ----------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.is_admin()',            -- las reglas ahora usan access.is_admin()
    'public.handle_new_user()',     -- trigger de registro (lo dispara la base, no la web)
    'public.recalculate_prices(numeric)',
    'public.on_dollar_change()',
    'public.on_product_cost_change()',
    'public.protect_profile_role()',
    'public.log_price_change()',
    'public.log_dollar_change()',
    'public.create_profile_for_new_user()'
  ] loop
    begin
      execute format('revoke execute on function %s from public, anon, authenticated', fn);
    exception when undefined_function then null;
    end;
  end loop;
end $$;

-- ---------- Verificación ----------
-- Tiene que mostrar rls_activado = true en todas
select c.relname as tabla, c.relrowsecurity as rls_activado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
