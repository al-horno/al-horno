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
  return {zones,pickup:s.pickup,pickupAddress,hours:text(s.hours,400),coverage:text(s.coverage,400),instagram};
 }
 function delivery(s,choice={}){
  if(choice.fulfillment==='pickup'){if(!s.pickup||!s.pickupAddress)fail('La recogida no está disponible.');return {delivery:0,fulfillment:'pickup',zoneId:null,deliveryLabel:'Recoger en el negocio',estimate:'',pickupAddress:s.pickupAddress};}
  if(choice.fulfillment&&choice.fulfillment!=='delivery')fail('Selecciona la forma de entrega.');
  const zone=s.zones.find(z=>z.id===(choice.zoneId||'general'));if(!zone)fail('Selecciona una zona de entrega disponible.');
  return {delivery:zone.price,fulfillment:'delivery',zoneId:zone.id,deliveryLabel:'Domicilio · '+zone.name,estimate:zone.estimate};
 }
 globalThis.AlHornoShopRules={defaults,validate,delivery};
})();
