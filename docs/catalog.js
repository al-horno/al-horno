let products=[],cart=[],selected,catalogOnline=false;
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n),escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pricing=window.AlHornoPricing;
let shopSettings=AlHornoShopRules.defaults(),bestsellers=[],quickFilter="all";
function deliveryQuote(){return AlHornoShopRules.delivery(shopSettings,window.ahDeliveryChoice||{})}
function notify(s){$('toast').textContent=s;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),4500)}
function save(){try{localStorage.setItem('alHornoPagesCart',JSON.stringify(cart))}catch{}}
function cartQuote(x){return pricing.quote(products.find(p=>p.id===x.id),x)}
function cartSummary(){let subtotal=0,pending=false,error='';for(const x of cart){try{const q=cartQuote(x);subtotal+=q.lineTotal;pending||=q.extrasPending;}catch(e){error=e.message;}}let delivery=0;try{delivery=cart.length?deliveryQuote().delivery:0}catch(e){error=e.message}return {subtotal,pending,error,delivery,total:subtotal+delivery};}
function catalog(){
 const q=$('search').value.toLocaleLowerCase(),cat=$('category').value;
 const found=products.filter(p=>(!cat||p.cat===cat)&&p.name.toLocaleLowerCase().includes(q)&&(quickFilter==='all'||quickFilter==='best'&&bestsellers.some(x=>x.id===p.id)||quickFilter==='sale'&&p.salePrice!=null||quickFilter==='new'&&p.isNew));
 const sort=$('sort').value;if(sort==='price-asc')found.sort((a,b)=>(a.salePrice??a.price)-(b.salePrice??b.price));if(sort==='price-desc')found.sort((a,b)=>(b.salePrice??b.price)-(a.salePrice??a.price));if(sort==='name')found.sort((a,b)=>a.name.localeCompare(b.name,'es'));
 $('results-count').textContent=found.length+' '+(found.length===1?'postre':'postres')+' en el menú';$('clear-filters').hidden=!q&&!cat&&sort==='menu'&&quickFilter==='all';
 $('products').innerHTML=found.map(p=>`<article class="card ${p.available?'':'sold-out'}"><a href="#producto/${escapeText(p.id)}"><img loading="lazy" decoding="async" width="400" height="300" src="${escapeText(p.img)}" alt="${escapeText(p.name)}"></a><div><div class="product-badges">${bestsellers.some(x=>x.id===p.id)?"<span>Más vendido</span>":""}${p.isNew?"<span>Nuevo</span>":""}${p.salePrice!=null?"<span>Oferta</span>":""}</div><span class="muted">${escapeText(p.cat)}</span>${p.available?'':'<span class="stock-label">Agotado por ahora</span>'}<h3><a href="#producto/${escapeText(p.id)}">${escapeText(p.name)}</a></h3><p>${escapeText(p.desc)}</p><div class="row"><span class="price">${p.salePrice!=null?"<del>"+money(p.price)+"</del> ":""}${money(p.salePrice??p.price)}</span><button data-add="${escapeText(p.id)}" aria-label="Ver opciones de ${escapeText(p.name)}">Ver opciones <span aria-hidden="true">↗</span></button></div></div></article>`).join('')||'<div class="empty"><h3>No encontramos ese postre</h3><p>Prueba otro nombre o pulsa «Limpiar filtros».</p></div>';
}
function draw(){
 $('count').textContent=cart.reduce((sum,x)=>sum+x.qty,0);save();
 if($('items')){
  $('items').innerHTML=cart.map((x,i)=>{const p=products.find(p=>p.id===x.id);let q,error='';try{q=cartQuote(x)}catch(e){error=e.message}
   return `<div class="item"><div class="row"><strong>${escapeText(p?.name||'Postre fuera del menú')}</strong><b>${q?money(q.lineTotal):'Revisar'}</b></div><p class="muted">${escapeText([x.size,...x.toppings,x.note].filter(Boolean).join(' · '))}</p>${q?.extrasPending?'<p class="quote-note">Incluye opciones por cotizar.</p>':''}${error?`<p class="form-error">${escapeText(error)}</p><a class="crumb" href="./index.html#producto/${escapeText(x.id)}">Ver opciones actuales</a>`:''}<div class="row"><span><button data-index="${i}" data-step="-1" aria-label="Quitar una unidad de ${escapeText(p?.name||'postre')}">−</button> ${x.qty} <button data-index="${i}" data-step="1" aria-label="Añadir una unidad de ${escapeText(p?.name||'postre')}" ${error?'disabled':''}>+</button></span><button data-remove="${i}">Eliminar</button></div></div>`;
  }).join('')||'<div class="empty"><span class="empty-icon" aria-hidden="true">♡</span><h3>Tu carrito está esperando algo rico</h3><p>Elige un postre para empezar.</p><a class="btn" href="./index.html#catalogo">Ver los postres →</a></div>';
  const summary=cartSummary();$('total').textContent='Productos: '+money(summary.subtotal);
  $('checkout').querySelector('button[type=submit]').disabled=!cart.length||!!summary.error||!catalogOnline||!!window.AlHornoCheckoutBusy;
  $('checkout').hidden=!cart.length;document.querySelector('.cart-layout').classList.toggle('is-empty',!cart.length);
 }
 window.dispatchEvent(new Event('ah-cart-change'));
}
function optionLabel(o){return o.name+' · '+(o.price===null?'por cotizar':o.price===0?'incluido':'+'+money(o.price))}
function detail(preserve=false){
 if(!selected)return;const form=$('customize'),previous=preserve?new FormData(form):null;
 $('dessert').textContent=selected.name;$('detailPhoto').src=selected.img;$('detailPhoto').alt=selected.name;$('detailDescription').textContent=selected.desc;
 form.elements.size.innerHTML=selected.sizes.map(s=>`<option value="${escapeText(s.name)}">${escapeText(optionLabel(s))}</option>`).join('');
 $('toppings').innerHTML=selected.toppings.map(t=>`<label><input type="checkbox" name="topping" value="${escapeText(t.name)}"> ${escapeText(optionLabel(t))}</label>`).join('');
 if(previous){if(selected.sizes.some(s=>s.name===previous.get('size')))form.elements.size.value=previous.get('size');for(const input of form.querySelectorAll('[name=topping]'))input.checked=previous.getAll('topping').includes(input.value);}
 else form.reset();
 updateDetailPrice();window.dispatchEvent(new Event('ah-detail-ready'));
}
function updateDetailPrice(){
 if(!selected)return;const form=$('customize'),button=form.querySelector('[type=submit]');
 button.disabled=!selected.available||!catalogOnline;button.textContent=selected.available?'Agregar al carrito':'Agotado por ahora';
 if(!selected.available){$('detailPrice').textContent=money(selected.price);$('option-price-note').textContent='Este postre volverá pronto. Puedes elegir otro del menú.';return;}
 const f=new FormData(form);const q=pricing.quote(selected,{qty:1,size:f.get('size'),toppings:f.getAll('topping')});
 $('detailPrice').textContent=money(q.price)+(q.extrasPending?' + por cotizar':'');
 $('option-price-note').textContent=q.extrasPending?'Este valor incluye los adicionales con precio. Confirmaremos los demás antes de preparar tu pedido.':'Precio por unidad con tus opciones. Revisa las opciones de entrega en el carrito.';
}
function route(){
 const hash=location.hash,isCart=location.pathname.endsWith('/carrito.html');if(hash==='#carrito'&&!isCart){location.replace('./carrito.html');return;}
 const id=hash.startsWith('#producto/')?hash.slice(10):null;selected=products.find(p=>p.id===id);
 $('hero').hidden=isCart||!!selected;$('catalogo').hidden=isCart||!!selected;if($('carrito'))$('carrito').hidden=!isCart;$('options').hidden=isCart||!selected;
 if(selected&&!isCart){detail();document.title=selected.name+' · Al Horno'}else document.title=isCart?'Tu carrito · Al Horno':'Al Horno · Postres';
 if(hash==='#catalogo'&&!isCart)$('catalogo').scrollIntoView({block:'start'});else window.scrollTo(0,0);
}
function applyCatalog(data,online){
 products=data.map(pricing.defaults);catalogOnline=online;
 const category=$('category').value;$('category').innerHTML='<option value="">Todos los postres</option>'+[...new Set(products.map(p=>p.cat))].map(c=>`<option value="${escapeText(c)}">${escapeText(c)}</option>`).join('');if(products.some(p=>p.cat===category))$('category').value=category;
 catalog();draw();if(selected){selected=products.find(p=>p.id===selected.id);detail(true);}
 $('catalog-status').hidden=online;$('catalog-status').textContent=online?'':'No pudimos actualizar el menú. Puedes consultarlo, pero vuelve a cargar para pedir con los precios actuales.';
 window.dispatchEvent(new Event('ah-catalog-ready'));
}
let catalogRequest=null;
async function refreshCatalog(){
 if(catalogRequest)return catalogRequest;
 catalogRequest=(async()=>{const response=await fetch(window.AL_HORNO_API+'/catalog',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('No pudimos actualizar el menú. Intenta nuevamente.');const data=await response.json();shopSettings=data.settings||AlHornoShopRules.defaults();bestsellers=data.bestsellers||[];applyCatalog(data.products,true);return products;})().finally(()=>catalogRequest=null);return catalogRequest;
}
window.AlHornoCatalog={refresh:refreshCatalog};
async function verifyCart(){
 const signature=()=>JSON.stringify(cart.map(x=>{const p=products.find(p=>p.id===x.id);return {id:x.id,version:p?.version,...cartQuote(x)}}));
 const before=signature(),oldDelivery=JSON.stringify({version:shopSettings.version,...deliveryQuote()});await refreshCatalog();const after=signature();if(before!==after||oldDelivery!==JSON.stringify({version:shopSettings.version,...deliveryQuote()}))throw Error('El menú cambió. Revisa el total actualizado y vuelve a enviar.');
 const summary=cartSummary();if(summary.error)throw Error(summary.error);if(!cart.length)throw Error('Agrega un postre a tu carrito.');return summary;
}
window.AlHornoCheckout={verifyCart};
$('search').oninput=catalog;$('category').onchange=catalog;$('sort').onchange=catalog;$('clear-filters').onclick=()=>{quickFilter='all';$('search').value='';$('category').value='';$('sort').value='menu';catalog()};
$('products').onclick=e=>{const b=e.target.closest('[data-add]');if(b)location.hash='producto/'+b.dataset.add};
$('customize').onchange=updateDetailPrice;
$('customize').onsubmit=e=>{e.preventDefault();if(!selected||!selected.available||!catalogOnline)return;const f=new FormData(e.target);const item={id:selected.id,qty:1,size:f.get('size'),toppings:f.getAll('topping'),note:f.get('note').trim()};pricing.quote(selected,item);cart.push(item);draw();notify('Postre agregado. Puedes verlo en Mi carrito.')};
if($('items'))$('items').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.remove!==undefined)cart.splice(Number(b.dataset.remove),1);else if(b.dataset.index!==undefined){const i=Number(b.dataset.index);cart[i].qty=Math.min(99,cart[i].qty+Number(b.dataset.step));if(cart[i].qty<1)cart.splice(i,1)}draw()};
window.addEventListener('hashchange',route);
try{const saved=JSON.parse(localStorage.getItem('alHornoPagesCart')||'[]');if(Array.isArray(saved))cart=saved.filter(x=>x&&typeof x.id==='string'&&/^[a-z0-9_-]{1,40}$/.test(x.id)&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=99&&typeof x.size==='string'&&Array.isArray(x.toppings)&&x.toppings.length<=12&&x.toppings.every(t=>typeof t==='string')&&typeof x.note==='string').slice(0,50).map(x=>({...x,size:x.size==='Grande (por cotizar)'?'Grande':x.size}));}catch{}
refreshCatalog().then(route).catch(async()=>{try{const r=await fetch('./products.json');if(!r.ok)throw Error();applyCatalog(await r.json(),false);route()}catch{$('products').innerHTML='<p>No pudimos cargar el catálogo. Recarga la página o escríbenos al +57 322 2798084.</p>';}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))refreshCatalog().catch(()=>{});});
