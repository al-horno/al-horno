# Al Horno: cloud backend

Storefront: https://favid243.github.io/al-horno/
Cart: https://favid243.github.io/al-horno/carrito.html
Supabase project: `tuetmzsfyosopuyscpuf`, organization `vcmcjkmntoyqaszhwcsd`.

The deployed `al-horno-api` Edge Function uses custom authentication: Supabase Auth tokens for registered accounts and opaque guest tokens stored as SHA-256 hashes. Gateway JWT verification is disabled because these guest tokens are not JWTs. Every private route authenticates and checks ownership or administrator membership. Tables have RLS enabled and no anonymous/authenticated grants; only the server accesses them. Delivery and product totals are calculated on the server.

Applied migrations: `al_horno_accounts_orders_support` and `restrict_rls_event_trigger_execution`. The latter revokes public/anon/authenticated execution on Supabase's `public.rls_auto_enable()` event-trigger function.

Cloud tests passed for authoritative prices and delivery, duplicate order prevention, guest isolation, support thread ownership, and denial of administrator actions to guests. Test records were removed. Run `node scripts/test-cloud.mjs` only against a designated test workflow; it creates clearly marked records and prints their IDs for cleanup.

## Account activation

As of 2026-10-09, custom SMTP through Brevo is saved and enabled. The owner completed storefront registration, verified the email, and received administrator membership. The live header displays the administration control after sign-in. Never commit SMTP credentials or account passwords.

The persisted site URL is `https://favid243.github.io/al-horno/`. Administrator membership was granted only to the exact verified owner account in `ah_admins`. Other registrations remain `user`. Never infer administrator status from user-editable metadata or an unverified email.

Build with `node scripts/build-pages.mjs`. GitHub Pages serves `main:/docs`. The backend catalog is `supabase/products.json` and must stay synchronized with `docs/products.json` when prices change. Payment methods coordinate payment; the site does not automatically charge Nequi or mark an order paid.

## Fotos de productos (2026-10-18)
Aplicar `product-images.sql` al proyecto existente y desplegar `api.ts`, `photo.ts` y `products.json` juntos. La tabla `ah_product_images` tiene RLS y solo acceso service_role; GET /product-images expone únicamente fotos públicas. POST /products/:id/image requiere al administrador verificado y comprueba producto, firma de archivo, tamaño y límite de frecuencia. Acepta `{image: dataURL}` o `{reset:true}`. El bucket público al-horno-product-photos se crea por la API Storage en la primera carga del admin (2 MB, JPEG/PNG/WebP); no hay permisos públicos de escritura. Cada archivo tiene ruta única para evitar fotos antiguas en caché; las fotos anteriores se conservan en Storage cuando se reemplazan o se restaura la original.
El navegador reduce fotos de hasta 10 MB a 1600px JPEG antes del envío. Los clientes consultan los cambios al cargar la tienda o volver a la pestaña. El panel incluye vista previa, guardar, descartar y restaurar.
Verificación: RLS activo, anon INSERT y authenticated UPDATE denegados, service_role permitido; lectura pública200 y edición sin sesión401. Advisor INFO sin políticas es esperado para tablas exclusivas del servidor. Aviso previo de Auth: protección de contraseñas filtradas deshabilitada, ajeno a esta función (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
