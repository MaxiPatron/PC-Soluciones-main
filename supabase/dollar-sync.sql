-- =====================================================================
-- PC Soluciones · Dólar automático + recálculo de precios
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Se puede correr más de una vez sin romper nada (si ya lo corriste,
-- correlo de nuevo para sumar los cambios nuevos).
--
-- Qué hace:
--   1. Cada 30 min consulta https://dolarapi.com/v1/dolares/<tipo>
--      (por defecto "oficial"; se cambia desde el admin → Resumen)
--   2. Si el dólar cambió, actualiza exchange_rates
--   3. Un trigger recalcula costo y precio de TODOS los productos con
--      costo en USD (menos los que tengan "precio fijo")
--   4. Si cargás/editás un producto con costo USD, su precio se
--      calcula solo con el dólar actual
-- =====================================================================

-- ---------- Extensiones ----------
create extension if not exists http with schema extensions;
create extension if not exists pg_cron;

-- ---------- Tabla del dólar ----------
alter table public.exchange_rates add column if not exists checked_at timestamptz;
-- Qué cotización usar: oficial | mayorista | blue | bolsa | contadoconliqui | tarjeta | cripto
alter table public.exchange_rates add column if not exists source text not null default 'oficial';

insert into public.exchange_rates (id, usd_ars, updated_at)
values (1, 1500, now())
on conflict (id) do nothing;

-- ---------- Productos: opción de precio fijo ----------
alter table public.products add column if not exists manual_price boolean not null default false;

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Misma fórmula que src/admin/pricing.js
create or replace function public.round_price(v numeric)
returns numeric language sql immutable
as $$ select ceil(v / 100) * 100 $$;

create or replace function public.suggested_price(cost numeric)
returns numeric language sql immutable
as $$
  select case
    when cost is null or cost <= 0 then 0
    when cost < 50000  then public.round_price(cost + 15000)
    when cost < 150000 then public.round_price(cost * 1.3)
    when cost < 500000 then public.round_price(cost * 1.2)
    else public.round_price(cost * 1.08)
  end
$$;

-- ---------- Recalcular todos los precios ----------
create or replace function public.recalculate_prices(p_usd numeric)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  affected integer;
begin
  update public.products
  set cost_price  = public.round_price(cost_price_usd * (1 + coalesce(iva, 0) / 100) * p_usd),
      price       = public.suggested_price(cost_price_usd * (1 + coalesce(iva, 0) / 100) * p_usd),
      dollar_used = p_usd,
      last_sync   = now()
  where cost_price_usd > 0
    and not manual_price;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Trigger: cuando cambia el dólar → recalcular
create or replace function public.on_dollar_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.recalculate_prices(new.usd_ars);
  return new;
end;
$$;

drop trigger if exists trg_dollar_change on public.exchange_rates;
create trigger trg_dollar_change
after update of usd_ars on public.exchange_rates
for each row
when (old.usd_ars is distinct from new.usd_ars)
execute function public.on_dollar_change();

-- Trigger: al cargar/editar costo o IVA de un producto → calcular su precio
create or replace function public.on_product_cost_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  usd numeric;
  cost numeric;
begin
  if coalesce(new.cost_price_usd, 0) <= 0 then
    return new;
  end if;
  select usd_ars into usd from public.exchange_rates where id = 1;
  if usd is null or usd <= 0 then
    return new;
  end if;
  cost := new.cost_price_usd * (1 + coalesce(new.iva, 0) / 100) * usd;
  new.cost_price  := public.round_price(cost);
  new.dollar_used := usd;
  if not coalesce(new.manual_price, false) then
    new.price := public.suggested_price(cost);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_cost_change on public.products;
create trigger trg_product_cost_change
before insert or update of cost_price_usd, iva, manual_price on public.products
for each row
execute function public.on_product_cost_change();

-- ---------- Traer el dólar de dolarapi.com ----------
create or replace function public.sync_dollar()
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  resp   record;
  venta  numeric;
  prev   numeric;
  src    text;
  n      integer := 0;
begin
  -- Desde la web solo pueden llamarla admins (el cron corre sin usuario)
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select coalesce(source, 'oficial') into src from public.exchange_rates where id = 1;
  if src not in ('oficial', 'mayorista', 'blue', 'bolsa', 'contadoconliqui', 'tarjeta', 'cripto') then
    src := 'oficial';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '15');
  select * into resp from extensions.http_get('https://dolarapi.com/v1/dolares/' || src);

  if resp.status <> 200 then
    raise exception 'dolarapi respondió %', resp.status;
  end if;

  venta := (resp.content::jsonb ->> 'venta')::numeric;
  if venta is null or venta <= 0 then
    raise exception 'Valor de dólar inválido: %', resp.content;
  end if;

  select usd_ars into prev from public.exchange_rates where id = 1;

  if prev is distinct from venta then
    update public.exchange_rates
    set usd_ars = venta, updated_at = now(), checked_at = now()
    where id = 1;   -- el trigger recalcula los precios
    select count(*) into n from public.products
    where cost_price_usd > 0 and not manual_price;
  else
    update public.exchange_rates set checked_at = now() where id = 1;
  end if;

  return jsonb_build_object('usd_ars', venta, 'previous', prev, 'changed', prev is distinct from venta, 'products', n, 'source', src);
end;
$$;

revoke execute on function public.sync_dollar() from public, anon;
grant execute on function public.sync_dollar() to authenticated;
revoke execute on function public.recalculate_prices(numeric) from public, anon, authenticated;

-- ---------- Permisos (RLS) de exchange_rates ----------
alter table public.exchange_rates enable row level security;

drop policy if exists "exchange_rates_public_read" on public.exchange_rates;
create policy "exchange_rates_public_read" on public.exchange_rates
  for select using (true);

drop policy if exists "exchange_rates_admin_update" on public.exchange_rates;
create policy "exchange_rates_admin_update" on public.exchange_rates
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Seguridad: nadie se puede poner "admin" a sí mismo ----------
-- Solo un admin puede cambiar el rol de un perfil. Un usuario común que
-- edite su perfil puede cambiar nombre/teléfono/etc, pero no el rol.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;  -- sistema (registro, cron, service role) o admin
  end if;
  if tg_op = 'INSERT' then
    new.role := 'user';
  elsif new.role is distinct from old.role then
    raise exception 'No podés cambiar tu rol';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

-- ---------- Cron cada 30 minutos ----------
do $$
begin
  perform cron.unschedule('sync-dollar');
exception when others then null;
end $$;

select cron.schedule('sync-dollar', '*/30 * * * *', $$ select public.sync_dollar(); $$);

-- ---------- Primera sincronización ya ----------
select public.sync_dollar();
