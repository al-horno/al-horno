// Shared delivery validation. Prices always come from the saved business settings.
(() => {
 const fail=s=>{throw Object.assign(Error(s),{status:409})};
 const defaults=()=>({version:1,zones:[{id:'general',name:'San Gil',price:4500,estimate:''}],pickup:false,pickupAddress:'',hours:'',coverage:'San Gil, Santander',instagram:''});
 function validate(s){
  const text=(v,n)=>{if(typeof v!=='string'||v.length>n)fail('Revisa los datos del negocio.');return v.trim()};
  if(!Array.isArray(s.zones)||!s.zones.length||s.zones.length>20)fail('Agrega entre 1 y 20 zonas.');
  const seen=new Set();const zones=s.zones.map(z=>{const id=text(z.id,40),name=text(z.name,70);if(!/^[a-z0-9_-]+$/.test(id)||seen.has(id)||!name||!Number.isSafeInteger(z.price)||z.price<0||z.price>1000000)fail('Revisa las zonas y sus tarifas.');seen.add(id);return {id,name,price:z.price,estimate:text(z.estimate,100)}});
  const pickupAddress=text(s.pickupAddress,300);if(typeof s.pickup!=='boolean'||s.pickup&&!pickupAddress)fail('Para activar recogida, escribe la dirección.');
  const instagram=text(s.instagram,300);if(instagram){let u;try{u=new URL(instagram)}catch{fail('Usa un enlace HTTPS de Instagram.')}if(u.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(u.hostname)||u.username||u.password)fail('Usa un enlace HTTPS de Instagram.');}
  const opening=validateOpening(s.opening);
  return {opening,zones,pickup:s.pickup,pickupAddress,hours:text(s.hours,400),coverage:text(s.coverage,400),instagram};
 }
 function delivery(s,choice={}){
  if(choice.fulfillment==='pickup'){if(!s.pickup||!s.pickupAddress)fail('La recogida no está disponible.');return {delivery:0,fulfillment:'pickup',zoneId:null,deliveryLabel:'Recoger en el negocio',estimate:'',pickupAddress:s.pickupAddress};}
  if(choice.fulfillment&&choice.fulfillment!=='delivery')fail('Selecciona la forma de entrega.');
  const zone=s.zones.find(z=>z.id===(choice.zoneId||'general'));if(!zone)fail('Selecciona una zona de entrega disponible.');
  return {delivery:zone.price,fulfillment:'delivery',zoneId:zone.id,deliveryLabel:'Domicilio · '+zone.name,estimate:zone.estimate};
 }
 // Colombia uses UTC-05:00. Never interpret the requested time in the device timezone.
 function today(now=Date.now()){return new Date(now-5*60*60*1000).toISOString().slice(0,10)}
 function validateOpening(value){
  if(value==null)return null;
  if(!Array.isArray(value)||value.length!==7)fail('Configura los siete días del horario.');
  return value.map(d=>{if(d===null)return null;if(!d||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.open)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.close)||d.open>=d.close)fail('La apertura debe ser anterior al cierre.');return {open:d.open,close:d.close}});
 }
 function checkOpening(stamp,settings){
  if(!settings?.opening)return;
  const local=new Date(stamp-5*3600000),slot=settings.opening[local.getUTCDay()],time=local.toISOString().slice(11,16);
  if(!slot||time<slot.open||time>=slot.close)fail('Fuera del horario de atención. Elige otro día u hora.');
 }
 function schedule(choice={},now=Date.now(),settings){
  if(choice.scheduleMode===undefined||choice.scheduleMode==='asap'){checkOpening(now,settings);return {scheduledFor:null,scheduleTimezone:'America/Bogota'};}
  if(choice.scheduleMode!=='scheduled')fail('Selecciona cuándo quieres recibir tu pedido.');
  const day=choice.scheduleDate,time=choice.scheduleTime;
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('Elige una fecha y una hora válidas para tu pedido.');
  const date=new Date(day+'T'+time+':00-05:00'),stamp=date.getTime();
  if(!Number.isFinite(stamp)||new Date(stamp-5*60*60*1000).toISOString().slice(0,16)!==day+'T'+time)fail('La fecha elegida no existe.');
  if(stamp<=now)fail('La fecha y hora ya pasaron. Elige un horario futuro (hora de Colombia).');
  checkOpening(stamp,settings);
  return {scheduledFor:date.toISOString(),scheduleTimezone:'America/Bogota'};
 }
 function scheduleLabel(payload){
  if(!payload?.scheduledFor)return 'Lo antes posible · horario por confirmar';
  const date=new Date(payload.scheduledFor);if(!Number.isFinite(date.getTime()))return 'Horario por confirmar';
  return new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'long',timeStyle:'short'}).format(date)+' (hora de Colombia)';
 }
 function nextStates(o){const pickup=o.payload.fulfillment==='pickup';const map={recibido:['confirmado','cancelado'],confirmado:['preparando','cancelado'],preparando:[pickup?'listo_recoger':'en_camino','cancelado'],listo_recoger:['entregado','cancelado'],en_camino:['entregado','cancelado'],entregado:[],cancelado:[]};return map[o.status]||[];}
 globalThis.AlHornoShopRules={defaults,validate,delivery,today,schedule,scheduleLabel,validateOpening,checkOpening,nextStates};
})();

