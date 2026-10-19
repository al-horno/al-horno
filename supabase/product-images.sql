-- Public photos are served by the Edge Function; only verified admins can change them.
create table public.ah_product_images (
 product_id text primary key check (product_id ~ '^[a-z0-9_-]{1,40}$'),
 image_url text not null check (image_url like 'https://%'),
 updated_at timestamptz not null default now()
);
alter table public.ah_product_images enable row level security;
revoke all on public.ah_product_images from public,anon,authenticated;
grant all on public.ah_product_images to service_role;
