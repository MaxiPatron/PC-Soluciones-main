-- =====================================================================
-- PC Soluciones · Historial de precios (para las estadísticas del admin)
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Se puede correr más de una vez sin romper nada.
--
-- Qué hace:
--   1. Guarda cada cambio de precio de cada producto (precio de venta en
--      pesos y costo en USD) en public.price_history
--   2. Guarda cada cambio del dólar en public.dollar_history
--   3. Arranca con una "foto" de hoy de todos los productos, y carga el
--      historial del dólar oficial de argentinadatos.com (opcional)
--   4. Funciones que usa la sección "Precios" del admin
--
-- Importante: el historial de productos empieza a contar desde que corrés
-- esto. Los gráficos se van llenando solos con cada cambio de dólar o
-- cada importación del mayorista.
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

-- ---------- Tablas ----------
create table if not exists public.price_history (
  id          bigserial primary key,
  product_id  bigint not null references public.products(id) on delete cascade,
  changed_at  timestamptz not null default now(),
  price       numeric,          -- precio de venta en ARS
  cost_usd    numeric,          -- costo del mayorista en USD (sin IVA)
  dollar      numeric           -- dólar usado en ese momento
);
create index if not exists price_history_product_idx on public.price_history (product_id, changed_at);
create index if not exists price_history_date_idx on public.price_history (changed_at);

create table if not exists public.dollar_history (
  id          bigserial primary key,
  changed_at  timestamptz not null default now(),
  usd_ars     numeric not null,
  source      text
);
create index if not exists dollar_history_date_idx on public.dollar_history (changed_at);

-- ---------- Triggers: registrar cambios ----------
create or replace function public.log_price_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.price is distinct from old.price
     or new.cost_price_usd is distinct from old.cost_price_usd then
    insert into public.price_history (product_id, price, cost_usd, dollar)
    values (new.id, new.price, new.cost_price_usd, new.dollar_used);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_price_change on public.products;
create trigger trg_log_price_change
after insert or update of price, cost_price_usd on public.products
for each row execute function public.log_price_change();

create or replace function public.log_dollar_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.usd_ars is distinct from old.usd_ars then
    insert into public.dollar_history (usd_ars, source) values (new.usd_ars, new.source);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_dollar_change on public.exchange_rates;
create trigger trg_log_dollar_change
after insert or update of usd_ars on public.exchange_rates
for each row execute function public.log_dollar_change();

-- ---------- Punto de partida ----------
-- Foto de hoy de los productos que todavía no tienen historial
insert into public.price_history (product_id, price, cost_usd, dollar)
select p.id, p.price, p.cost_price_usd, p.dollar_used
from public.products p
where not exists (select 1 from public.price_history h where h.product_id = p.id);

-- Historial del dólar oficial (último año) desde argentinadatos.com.
-- Si la API falla no pasa nada: el historial arranca desde hoy.
do $$
declare
  resp record;
begin
  if not exists (select 1 from public.dollar_history) then
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
    select * into resp
    from extensions.http_get('https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial');
    if resp.status = 200 then
      insert into public.dollar_history (changed_at, usd_ars, source)
      select (e ->> 'fecha')::date + time '18:00', (e ->> 'venta')::numeric, 'oficial'
      from jsonb_array_elements(resp.content::jsonb) e
      where (e ->> 'fecha')::date >= current_date - 400
        and (e ->> 'fecha')::date < current_date
        and (e ->> 'venta')::numeric > 0;
    end if;
  end if;
exception when others then
  raise notice 'No se pudo traer el historial del dólar: %', sqlerrm;
end $$;

insert into public.dollar_history (usd_ars, source)
select usd_ars, source from public.exchange_rates where id = 1
and not exists (select 1 from public.dollar_history where changed_at >= current_date);

-- ---------- Permisos: solo admins leen el historial ----------
alter table public.price_history enable row level security;
alter table public.dollar_history enable row level security;

drop policy if exists "price_history_admin_read" on public.price_history;
create policy "price_history_admin_read" on public.price_history
  for select using (access.is_admin());

drop policy if exists "dollar_history_admin_read" on public.dollar_history;
create policy "dollar_history_admin_read" on public.dollar_history
  for select using (access.is_admin());

-- ---------- Funciones para el admin ----------

-- Precio de cada producto al inicio del período y ahora.
-- p_currency: 'ars' (precio de venta) | 'usd' (costo mayorista)
create or replace function public.price_changes(p_days integer, p_currency text default 'ars')
returns table (product_id bigint, start_value numeric, end_value numeric, changes integer)
language plpgsql stable security invoker set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  if not access.is_admin() then raise exception 'No autorizado'; end if;

  return query
  with h as (   -- historial del producto en la moneda elegida
    select h.product_id as pid, h.changed_at as ts,
           case when p_currency = 'usd' then h.cost_usd else h.price end as val
    from public.price_history h
  ),
  per as (
    select pid,
      -- valor que tenía al empezar el período (o el primero, si se cargó después)
      coalesce(
        (array_agg(val order by ts desc) filter (where ts <= since))[1],
        (array_agg(val order by ts asc) filter (where ts > since))[1]
      ) as s,
      (array_agg(val order by ts desc))[1] as e,
      (count(*) filter (where ts > since))::int as n
    from h
    where val > 0
    group by pid
  )
  select pid, s, e, n from per;
end;
$$;

-- Índice de precios (base 100 al inicio del período), por día o semana.
-- p_category null = todos los productos.
create or replace function public.price_index(
  p_days integer, p_currency text default 'ars', p_category bigint default null
)
returns table (bucket date, idx numeric, products integer)
language plpgsql stable security invoker set search_path = public
as $$
#variable_conflict use_column
declare
  step interval := case when p_days > 120 then interval '7 days' else interval '1 day' end;
  first_day date := (now() - make_interval(days => greatest(p_days, 1)))::date;
begin
  if not access.is_admin() then raise exception 'No autorizado'; end if;

  return query
  with days as (
    select d::date as d from generate_series(first_day, current_date, step) d
  ),
  prods as (
    select p.id from public.products p
    where p_category is null or p.category_id = p_category
  ),
  vals as (
    select d.d, pr.id,
      (select case when p_currency = 'usd' then h.cost_usd else h.price end
       from public.price_history h
       where h.product_id = pr.id and h.changed_at < d.d + 1
       order by h.changed_at desc limit 1) as val
    from days d cross join prods pr
  ),
  base as (   -- valor de referencia: el primero que tenga en el período
    select distinct on (v.id) v.id, v.val as b
    from vals v where v.val > 0
    order by v.id, v.d
  )
  select v.d, round(avg(v.val / b.b) * 100, 2), count(*)::int
  from vals v join base b on b.id = v.id
  where v.val > 0
  group by v.d
  order by v.d;
end;
$$;

revoke execute on function public.price_changes(integer, text) from public, anon;
revoke execute on function public.price_index(integer, text, bigint) from public, anon;
grant execute on function public.price_changes(integer, text) to authenticated;
grant execute on function public.price_index(integer, text, bigint) to authenticated;
