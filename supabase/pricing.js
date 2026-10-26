// Shared by the browser and the order API. All amounts are whole Colombian pesos.
(() => {
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
 const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail('Revisa el nombre y la descripción del producto.');return value.trim()};
 const amount=(n,nullable=false)=>{if(nullable&&n===null)return null;if(!Number.isSafeInteger(n)||n<0||n>1000000)fail('Usa precios enteros entre 0 y 1.000.000 pesos.');return n};
 function options(list,max){
  if(!Array.isArray(list)||list.length>max)fail('Hay demasiadas opciones.');
  const names=new Set();return list.map(o=>{if(!o||typeof o!=='object')fail('Opción inválida.');const name=text(o.name,50);const key=name.toLocaleLowerCase();if(names.has(key))fail('Los nombres de las opciones no se pueden repetir.');names.add(key);return {name,price:amount(o.price,true)}});
 }
 function validateProduct(p){
  if(!p||typeof p!=='object')fail('Producto inválido.');
  const sizes=options(p.sizes,8),toppings=options(p.toppings,12);
  if(!sizes.length||sizes[0].name!=='Original'||sizes[0].price!==0)fail('El tamaño Original debe estar incluido, sin recargo.');
  if(typeof p.available!=='boolean')fail('Indica si el producto está disponible.');
  const img=text(p.img,1000);
  if(img!=='./assets/al-horno-logo.png'){let u;try{u=new URL(img)}catch{fail('La foto necesita una dirección HTTPS válida.')}if(u.protocol!=='https:'||u.username||u.password)fail('La foto necesita una dirección HTTPS válida.');}
  const price=amount(p.price);if(price<1)fail('El precio del postre debe ser mayor que cero.');
  return {name:text(p.name,100),cat:text(p.cat,60),desc:text(p.desc,600),img,price,available:p.available,sizes,toppings};
 }
 function defaults(p){return {...p,available:p.available!==false,sizes:p.sizes||[{name:'Original',price:0},{name:'Grande',price:null}],toppings:p.toppings||['Chocolate','Arequipe','Oreo','Fresas','Chispas de chocolate'].map(name=>({name,price:null}))};}
 function quote(product,item){
  if(!product)fail('Este postre ya no está en el menú. Retíralo del carrito.',409);
  const p=defaults(product);if(!p.available)fail(p.name+' está agotado. Retíralo del carrito.',409);
  if(!item||!Number.isInteger(item.qty)||item.qty<1||item.qty>99)fail('Cantidad inválida.');
  const size=item.size==='Grande (por cotizar)'?'Grande':item.size;
  const choice=p.sizes.find(s=>s.name===size);
  if(!choice||!Array.isArray(item.toppings)||item.toppings.length>12||new Set(item.toppings).size!==item.toppings.length)fail('Las opciones cambiaron. Elige de nuevo este postre.',409);
  const extras=[choice,...item.toppings.map(name=>{const t=p.toppings.find(t=>t.name===name);if(!t)fail('Un adicional ya no está disponible. Elige de nuevo este postre.',409);return t})];
  const price=p.price+extras.reduce((sum,o)=>sum+(o.price??0),0);
  return {price,basePrice:p.price,size,toppings:[...item.toppings],extras:extras.map(o=>({...o})),extrasPending:extras.some(o=>o.price===null),lineTotal:price*item.qty};
 }
 globalThis.AlHornoPricing={defaults,validateProduct,quote};
})();
