-- Declarative, repeatable deployment. No orders or existing constraints are changed.
-- Only the authenticated Edge Function (service_role) may call this query.
create or replace function public.ah_orders_page(
 p_owner uuid default null, p_month date default null, p_date date default null,
 p_state text default null, p_delivery text default null, p_page integer default 1
) returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
 with scoped as (
   select o.*, (coalesce(nullif(o.payload->>'scheduledFor','')::timestamptz,o.created_at) at time zone 'America/Bogota')::date as order_day
   from public.ah_orders o where (p_owner is null or o.owner_id=p_owner)
 ), month_orders as (
   select * from scoped where
     (p_month is null or (order_day>=date_trunc('month',p_month)::date and order_day<(date_trunc('month',p_month)+interval '1 month')::date))
     and (p_state is null or status=p_state)
     and (p_delivery is null or coalesce(payload->>'fulfillment','delivery')=p_delivery)
 ), filtered as (
   select * from month_orders where p_date is null or order_day=p_date
 ), totals as (select count(*) as n from filtered), paging as (
   select n, greatest(1,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(n/50.0)::int))) as page from totals
 ), page_rows as (
   select * from filtered order by created_at desc,id desc limit 50 offset (select (page-1)*50 from paging)
 ), days as (select order_day,count(*) as total from month_orders group by order_day)
 select jsonb_build_object(
   'orders',coalesce((select jsonb_agg(to_jsonb(p)-'order_day' order by p.created_at desc,p.id desc) from page_rows p),'[]'::jsonb),
   'total',(select n from paging),'page',(select page from paging),'pageSize',50,
   'days',coalesce((select jsonb_agg(jsonb_build_object('date',order_day,'total',total) order by order_day) from days),'[]'::jsonb),
   'pendingToday',(select count(*) from scoped where order_day=(now() at time zone 'America/Bogota')::date and status not in ('entregado','cancelado'))
 );
$$;
revoke all on function public.ah_orders_page(uuid,date,date,text,text,integer) from public,anon,authenticated;
grant execute on function public.ah_orders_page(uuid,date,date,text,text,integer) to service_role;
create index if not exists ah_orders_owner_created_id_idx on public.ah_orders(owner_id,created_at desc,id desc);

