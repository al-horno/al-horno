create table public.ah_shop_settings(id boolean primary key default true check(id), data jsonb not null, version integer not null default 1);
insert into public.ah_shop_settings(data) values ('{"zones":[{"id":"general","name":"San Gil","price":4500,"estimate":""}],"pickup":false,"pickupAddress":"","hours":"","coverage":"San Gil, Santander","instagram":""}');
create table public.ah_reviews(id uuid primary key default gen_random_uuid(), owner_id uuid not null, order_id uuid not null references public.ah_orders(id), product_id text not null references public.ah_products(id), alias text not null check(length(alias) between 1 and 40), rating integer not null check(rating between 1 and 5), body text not null check(length(body) between 1 and 600), created_at timestamptz not null default now(), unique(owner_id,product_id));
create index ah_reviews_product_created on public.ah_reviews(product_id,created_at desc);
alter table public.ah_shop_settings enable row level security;
alter table public.ah_reviews enable row level security;
revoke all on public.ah_shop_settings,public.ah_reviews from public,anon,authenticated;
grant select,insert,update on public.ah_shop_settings,public.ah_reviews to service_role;
create or replace function public.ah_bestsellers() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
 select x->>'id' as id, sum((x->>'qty')::integer) as units from public.ah_orders o cross join lateral jsonb_array_elements(o.payload->'items') x
 where o.status='entregado' group by x->>'id' order by units desc, id limit 10) s;
$$;
create or replace function public.ah_business_stats() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('pending',count(*) filter(where status not in ('entregado','cancelado')),
 'today',count(*) filter(where (created_at at time zone 'America/Bogota')::date=(now() at time zone 'America/Bogota')::date),
 'weekValue',coalesce(sum((payload->>'total')::numeric) filter(where status='entregado' and created_at>=now()-interval '7 days'),0),
 'monthValue',coalesce(sum((payload->>'total')::numeric) filter(where status='entregado' and created_at>=now()-interval '30 days'),0)) from public.ah_orders;
$$;
revoke all on function public.ah_bestsellers(),public.ah_business_stats() from public,anon,authenticated;
grant execute on function public.ah_bestsellers(),public.ah_business_stats() to service_role;
