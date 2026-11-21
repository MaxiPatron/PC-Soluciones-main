-- =====================================================================
-- PC Soluciones · Búsqueda de imágenes de productos (Google vía SerpAPI)
--
-- Cómo usarlo:
--   1. Supabase → SQL Editor → New query → pegar TODO → Run.
--   2. En OTRA query (no la guardes en el repo), cargá tu clave de SerpAPI:
--
--        insert into private.secrets (name, value)
--        values ('serpapi_key', 'PEGÁ_ACÁ_TU_CLAVE')
--        on conflict (name) do update set value = excluded.value;
--
-- La clave queda en un esquema privado: la web no la puede leer, solo
-- estas funciones (y solo para usuarios admin).
-- Requiere haber corrido antes supabase/dollar-sync.sql (extensión http + is_admin()).
-- =====================================================================

create extension if not exists http with schema extensions;

-- ---------- Claves privadas ----------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.secrets (
  name  text primary key,
  value text not null
);
revoke all on private.secrets from public, anon, authenticated;

-- ---------- Buscar imágenes en Google Images ----------
create or replace function public.search_product_images(p_query text, p_limit int default 12)
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  api_key text;
  resp    record;
  body    jsonb;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select value into api_key from private.secrets where name = 'serpapi_key';
  if api_key is null then
    raise exception 'Falta la clave de SerpAPI (ver instrucciones en supabase/image-search.sql)';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '25');
  select * into resp from extensions.http_get(
    'https://serpapi.com/search.json?engine=google_images&hl=es&gl=ar'
    || '&q=' || extensions.urlencode(p_query)
    || '&api_key=' || extensions.urlencode(api_key)
  );

  if resp.status <> 200 then
    raise exception 'SerpAPI respondió %: %', resp.status, left(resp.content, 200);
  end if;

  body := resp.content::jsonb;
  if body ? 'error' then
    raise exception 'SerpAPI: %', body ->> 'error';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'original',  r ->> 'original',
      'thumbnail', r ->> 'thumbnail',
      'title',     r ->> 'title',
      'source',    r ->> 'source',
      'width',     (r ->> 'original_width')::int,
      'height',    (r ->> 'original_height')::int
    ))
    from (
      select r from jsonb_array_elements(body -> 'images_results') r
      where r ->> 'original' like 'https://%'
      limit greatest(1, least(p_limit, 30))
    ) t
  ), '[]'::jsonb);
end;
$$;

-- ---------- Búsquedas que quedan en el plan de SerpAPI ----------
create or replace function public.serpapi_account()
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  api_key text;
  resp    record;
  body    jsonb;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  select value into api_key from private.secrets where name = 'serpapi_key';
  if api_key is null then
    return jsonb_build_object('configured', false);
  end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '15');
  select * into resp from extensions.http_get(
    'https://serpapi.com/account.json?api_key=' || extensions.urlencode(api_key)
  );
  if resp.status <> 200 then
    return jsonb_build_object('configured', true, 'error', resp.status);
  end if;
  body := resp.content::jsonb;
  return jsonb_build_object(
    'configured', true,
    'searches_left', body -> 'total_searches_left',
    'plan_searches', body -> 'searches_per_month',
    'used_this_month', body -> 'this_month_usage',
    'plan', body ->> 'plan_name'
  );
end;
$$;

revoke execute on function public.search_product_images(text, int) from public, anon;
grant execute on function public.search_product_images(text, int) to authenticated;
revoke execute on function public.serpapi_account() from public, anon;
grant execute on function public.serpapi_account() to authenticated;
