# Al Horno · Postres

[Visitar Al Horno](https://al-horno.github.io/al-horno/) · [Carrito](https://al-horno.github.io/al-horno/carrito.html)

GitHub Pages publica `docs/` de `main`. Incluye catálogo, búsqueda, páginas de producto, tamaños, toppings, carrito separado y domicilio fijo de COP 4.500. Los tamaños y toppings suman sus recargos automáticamente; solo las opciones sin precio quedan por cotizar. Efectivo, Nequi y WhatsApp son métodos de coordinación del pago; no se realizan cobros automáticos.

Los pedidos y mensajes de soporte se guardan en Supabase mediante `al-horno-api`. Los invitados pueden comprar y escribir al soporte. Cada cliente ve sus propios registros. El administrador tiene un panel con pestañas para los pedidos y las conversaciones de todos los dispositivos.

El envío SMTP está configurado y el propietario completó el registro y la confirmación de correo. Su cuenta tiene permisos de administración. Las nuevas cuentas tienen el rol de cliente. Ver [estado de despliegue](supabase/DEPLOYMENT.md).

La interfaz incluye una guía de compra en tres pasos, búsqueda, categorías, orden por precio o nombre, opciones del producto y resumen de domicilio y total. El acceso a la cuenta es opcional, desde «Mi cuenta». Los estilos se adaptan al celular y respetan la preferencia de reducir animaciones.

El carrito y el token de sesión permanecen en el navegador. Los pedidos enviados se guardan en el servidor. Los pedidos antiguos de otras versiones guardados solo en cada navegador no se importan automáticamente.

## Desarrollo

```sh
node scripts/build-pages.mjs
```

Editar `pages/` para la presentación y regenerar `docs/`. El catálogo activo se guarda en `ah_products` y se edita desde Administrar → Productos. `source/index.html` y `docs/products.json` son una copia de consulta para cuando el servicio no está disponible; en ese caso se bloquea la compra hasta reconectar. Nunca incluir claves privadas en `docs/`.

## Versión anterior para Sites

`worker/`, `db/` y `source/shared-orders.js` corresponden a una implementación anterior con ChatGPT y D1 que no se ejecuta en GitHub Pages. Requiere autenticación verificada de Sites, el binding `DB` y las migraciones de `drizzle/`. No exponer ese Worker confiando en cabeceras enviadas por visitantes.

```sh
pnpm install --frozen-lockfile
node scripts/build.mjs
node scripts/test.mjs
node scripts/test-orders.mjs
```

## Productos y precios
Desde Administrar → Productos puedes crear postres, editar nombre, categoría, descripción y precio base, marcar agotados y configurar tamaños/toppings. Los recargos son por unidad; vacío significa por cotizar y 0 significa incluido. Original siempre tiene recargo 0. Guarda antes de cambiar de producto; Descarta para recuperar la versión guardada. Las fotos se cambian en el panel inferior.

El servidor vuelve a calcular cada total desde su catálogo y rechaza precios/versiones antiguos, opciones inexistentes y productos agotados. Los pedidos guardados conservan su detalle y precio histórico. La confirmación muestra número, entrega, pago pendiente y seguimiento. WhatsApp prepara un mensaje separado y no crea pedidos en el panel.

Pruebas de API y precios: `node scripts/test-commerce.mjs` (Node 24; mocks aislados, sin datos reales).

## Tienda ampliada (28 octubre 2026)
Admin → Negocio: zonas y tarifas, recogida (desactivada hasta indicar dirección), horarios, cobertura e Instagram. Admin → Productos: ofertas, etiqueta Nuevo, ingredientes y alérgenos. Los más vendidos se calculan únicamente sobre pedidos entregados; no se inventan reseñas. Mis pedidos permite reseñar cada postre entregado una sola vez, con nombre público elegido por el cliente.
El panel distingue valores de pedidos entregados de pagos cobrados. Datos opcionales vacíos no se publican. Domicilio inicial4500COP preservado. Navegación móvil y subtotal, filtros rápidos, logo WebP45KB, metadatos y sitemap. No se inventaron fotos reales: el admin muestra las repetidas o pendientes.
