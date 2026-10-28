// Checkout totals and the separate WhatsApp hand-off.
(() => {
 const form=document.getElementById('checkout');if(!form)return;
 form.querySelector('.notice').textContent='Elige domicilio o recogida según disponibilidad. Los adicionales con precio ya están incluidos. Si elegiste una opción por cotizar, la confirmaremos antes de preparar el pedido.';
 const payment=document.createElement('label');payment.className='paylabel';payment.textContent='¿Cómo quieres pagar?';
 const select=document.createElement('select');select.name='payment';select.required=true;
 for(const [value,label] of [['Efectivo','Efectivo al recibir'],['WhatsApp','Coordinar el pago por WhatsApp'],['Nequi','Nequi (coordinar por WhatsApp)']])select.add(new Option(label,value));
 payment.append(select);form.querySelector('.notice').before(payment);
 const totals=document.createElement('div');totals.className='totals';totals.setAttribute('aria-live','polite');
 const total=document.getElementById('total');total.hidden=true;total.after(totals);
 function update(){
  const s=cartSummary(),delivery=s.delivery;
  totals.innerHTML=s.error?'<p class="form-error">'+escapeText(s.error)+'</p>':'<div class="row"><span>Productos y adicionales</span><strong>'+money(s.subtotal)+'</strong></div><div class="row"><span>Entrega</span><strong>'+money(delivery)+'</strong></div>'+(s.pending?'<p class="quote-note">Hay opciones por cotizar; su valor aún no está incluido.</p>':'')+'<div class="row grand"><span>Total '+(s.pending?'base ':'')+'con domicilio</span><span>'+money(s.total)+'</span></div>';
  const wa=document.getElementById('order-whatsapp');if(wa)wa.disabled=!cart.length||!!s.error||!catalogOnline||!!window.AlHornoCheckoutBusy;
 }
 const alternative=document.createElement('div');alternative.className='whatsapp-order-option';
 alternative.innerHTML='<p class="order-divider">¿Prefieres conversar primero?</p><button id="order-whatsapp" class="whatsapp-order" type="button" aria-describedby="whatsapp-order-help">Preparar pedido en WhatsApp ↗</button><p id="whatsapp-order-help">Abrimos un mensaje con tu carrito. Tú lo envías y el negocio te confirma por WhatsApp. Esta opción no guarda un pedido en Mis pedidos.</p><p id="whatsapp-order-status" role="alert" class="form-error"></p>';
 form.append(alternative);
 async function orderByWhatsApp(){
  if(!cart.length||window.AlHornoCheckoutBusy||!form.reportValidity())return;
  const status=document.getElementById('whatsapp-order-status');status.textContent='';window.AlHornoCheckoutBusy=true;draw();
  try{
   const summary=await window.AlHornoCheckout.verifyCart(),data=new FormData(form);
   const lines=cart.map(x=>{const p=products.find(p=>p.id===x.id),q=cartQuote(x);return x.qty+' × '+p.name+' — '+money(q.lineTotal)+'\n'+[q.size,...q.toppings,x.note].filter(Boolean).join(' · ')+(q.extrasPending?' (hay adicionales por cotizar)':'')});
   const message=['¡Hola, Al Horno! Quiero hacer este pedido:','',...lines,'','Productos y adicionales: '+money(summary.subtotal),'Entrega: '+deliveryQuote().deliveryLabel+' · '+money(summary.delivery),...(summary.pending?['Adicionales sin precio: por cotizar']:[]),'Total '+(summary.pending?'base ':'')+'con domicilio: '+money(summary.total),'Forma de pago: '+data.get('payment'),'Nombre: '+data.get('name'),'Celular: '+data.get('phone'),'Dirección: '+(deliveryQuote().pickupAddress||data.get('address')),...(data.get('notes')?.trim()?['Notas: '+data.get('notes').trim()]:[]),'Por favor confirmen disponibilidad y entrega.'].join('\n');
   location.href='https://wa.me/573222798084?text='+encodeURIComponent(message);
  }catch(err){status.textContent=err.message;}finally{window.AlHornoCheckoutBusy=false;draw();}
 }
 document.getElementById('order-whatsapp').onclick=orderByWhatsApp;
 window.addEventListener('ah-cart-change',update);update();
})();
