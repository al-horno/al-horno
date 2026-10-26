# Al Horno: cloud backend

Storefront: https://al-horno.github.io/al-horno/
Cart: https://al-horno.github.io/al-horno/carrito.html
Supabase project: `tuetmzsfyosopuyscpuf`, organization `vcmcjkmntoyqaszhwcsd`.

The deployed `al-horno-api` Edge Function uses custom authentication: Supabase Auth tokens for registered accounts and opaque guest tokens stored as SHA-256 hashes. Gateway JWT verification is disabled because these guest tokens are not JWTs. Every private route authenticates and checks ownership or administrator membership. Tables have RLS enabled and no anonymous/authenticated grants; only the server accesses them. Delivery and product totals are calculated on the server.

Applied migrations: `al_horno_accounts_orders_support` and `restrict_rls_event_trigger_execution`. The latter revokes public/anon/authenticated execution on Supabase's `public.rls_auto_enable()` event-trigger function.

Cloud tests passed for authoritative prices and delivery, duplicate order prevention, guest isolation, support thread ownership, and denial of administrator actions to guests. Test records were removed. Run `node scripts/test-cloud.mjs` only against a designated test workflow; it creates clearly marked records and prints their IDs for cleanup.

## Account activation

As of 2026-10-09, custom SMTP through Brevo is saved and enabled. The owner completed storefront registration, verified the email, and received administrator membership. The live header displays the administration control after sign-in. Never commit SMTP credentials or account passwords.

The persisted site URL is `https://al-horno.github.io/al-horno/`. Administrator membership was granted only to the exact verified owner account in `ah_admins`. Other registrations remain `user`. Never infer administrator status from user-editable metadata or an unverified email.

Build with `node scripts/build-pages.mjs`. GitHub Pages serves `main:/docs`. The active backend catalog is `public.ah_products`; edit it through the verified admin API. The JSON files are legacy fallback snapshots. Payment methods coordinate payment; the site does not automatically charge Nequi or mark an order paid.

## Fotos de productos (2026-10-18)
Aplicar `product-images.sql` al proyecto existente y desplegar `api.ts`, `photo.ts` y `products.json` juntos. La tabla `ah_product_images` tiene RLS y solo acceso service_role; GET /product-images expone únicamente fotos públicas. POST /products/:id/image requiere al administrador verificado y comprueba producto, firma de archivo, tamaño y límite de frecuencia. Acepta `{image: dataURL}` o `{reset:true}`. El bucket público al-horno-product-photos se crea por la API Storage en la primera carga del admin (2 MB, JPEG/PNG/WebP); no hay permisos públicos de escritura. Cada archivo tiene ruta única para evitar fotos antiguas en caché; las fotos anteriores se conservan en Storage cuando se reemplazan o se restaura la original.
El navegador reduce fotos de hasta 10 MB a 1600px JPEG antes del envío. Los clientes consultan los cambios al cargar la tienda o volver a la pestaña. El panel incluye vista previa, guardar, descartar y restaurar.
Verificación: RLS activo, anon INSERT y authenticated UPDATE denegados, service_role permitido; lectura pública200 y edición sin sesión401. Advisor INFO sin políticas es esperado para tablas exclusivas del servidor. Aviso previo de Auth: protección de contraseñas filtradas deshabilitada, ajeno a esta función (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Catálogo editable y checkout (2026-10-26)
Migración remota `editable_product_catalog`: `catalog-schema.sql` documenta la tabla ah_products y la carga inicial de los 20 productos, con IDs, orden y precios preservados. No ejecutar nuevamente el seed sobre un catálogo ya configurado. RLS activo; sin permisos anon/authenticated; solo service_role SELECT/INSERT/UPDATE. Acceso público a través de GET /catalog, que combina fotos compartidas. POST /products y PATCH /products/:id requieren administrador verificado; PATCH usa versión para evitar sobrescrituras.
Desplegar api.ts, pricing.js y photo.ts juntos. pricing.js debe ser idéntico a pages/pricing.js. Precios enteros COP; Original incluido; recargos null por cotizar; nada se cobra automáticamente. El servidor recalcula opciones y totales y guarda una instantánea en cada pedido. El frontend verifica el menú antes de pedir y conserva la clave idempotente al reintentar.
Verificación: 20 productos preservados por API real, RLS y grants verificados, creación pública401; pruebas aisladas de CRUD admin, clientes denegados, precios manipulados, conflictos, agotados, confirmación e historial. Advisor INFO sin políticas corresponde al diseño exclusivo del servidor: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy . Sigue el aviso previo de contraseñas filtradas, sin cambios en esta entrega.
