import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../',import.meta.url).pathname.replace(/^\/(?:([A-Za-z]):)/,'$1:');
await import('../pages/pricing.js');
await import('../pages/shop-rules.js');
const shopRules=globalThis.AlHornoShopRules;let settings={data:shopRules.defaults(),version:1},reviewRows=[];
const pricing=globalThis.AlHornoPricing;
const original=JSON.parse(fs.readFileSync(root+'supabase/products.json','utf8'));
const sample=pricing.validateProduct({...pricing.defaults(original[0]),price:10000,sizes:[{name:'Original',price:0},{name:'Grande',price:4000}],toppings:[{name:'Chocolate',price:1500},{name:'Fresas',price:null}]});
assert.equal(pricing.quote(sample,{qty:2,size:'Grande',toppings:['Chocolate']}).lineTotal,31000);
assert.equal(pricing.quote(sample,{qty:1,size:'Original',toppings:['Fresas']}).extrasPending,true);
assert.equal(pricing.quote({...sample,toppings:[{name:'Chocolate',price:0}]},{qty:1,size:'Original',toppings:['Chocolate']}).extrasPending,false);
for(const x of [{qty:0,size:'Original',toppings:[]},{qty:1,size:'bad',toppings:[]},{qty:1,size:'Original',toppings:['Chocolate','Chocolate']},{qty:1,size:'Original',toppings:['unknown']}])assert.throws(()=>pricing.quote(sample,x));
for(const patch of [{price:-1},{price:1.5},{price:null},{price:'10000'},{sizes:[{name:'Original',price:500}]},{toppings:[{name:'X',price:0},{name:'x',price:0}]},{img:'javascript:alert(1)'},{available:'true'}])assert.throws(()=>pricing.validateProduct({...sample,...patch}));
let rows=original.map((p,i)=>({id:p.id,data:pricing.validateProduct(pricing.defaults(p)),version:1,created_at:i})),orderRows=[],imageRows=[],handler,failDatabase=false,uploads=0;
function query(table){let filters={},mode='select',record,single=false,head=false;
 const q={select(_cols,opt){head=!!opt?.head;return q},eq(k,v){filters[k]=v;return q},limit(){return q},order(){return q},maybeSingle(){single=true;return q},single(){single=true;return q},insert(v){mode='insert';record=v;return q},update(v){mode='update';record=v;return q},upsert(v){mode='upsert';record=v;return q},delete(){mode='delete';return q},then(resolve){
  let data=null,error=null,count=null;
  if(table==='ah_shop_settings'){if(mode==='update'){if(filters.version===settings.version){settings={...settings,...record};data=settings;}else data=null;}else data=settings;}
  else if(table==='ah_reviews'){if(mode==='insert'){if(reviewRows.some(x=>x.owner_id===record.owner_id&&x.product_id===record.product_id))error={code:'23505'};else reviewRows.push({...record,id:crypto.randomUUID()});}else data=reviewRows.filter(x=>x.product_id===filters.product_id).map(({alias,rating,body,id})=>({alias,rating,body,id}));}
  else if(table==='ah_profiles')data={username:'test'};
  else if(table==='ah_admins')data=filters.user_id==='admin-id'?{user_id:'admin-id'}:null;
  else if(table==='ah_guests')data={owner_id:'guest-id',expires_at:'2099-01-01'};
  else if(failDatabase)error={message:'offline'};
  else if(table==='ah_products'){
   const matches=r=>Object.entries(filters).every(([k,v])=>r[k]===v);
   if(mode==='insert'){record={...record,version:1};rows.push(record);data=record}
   else if(mode==='update'){const i=rows.findIndex(matches);if(i>=0){rows[i]={...rows[i],...record};data=rows[i]}}
   else if(head)count=rows.length;
   else data=single?rows.find(matches)||null:rows.filter(matches);
  }else if(table==='ah_orders'){
   const matches=r=>Object.entries(filters).every(([k,v])=>r[k]===v);
   if(mode==='insert'){record={...record,id:crypto.randomUUID(),status:'recibido',version:1,created_at:new Date().toISOString()};orderRows.push(record);data=record;}
   else data=single?orderRows.find(matches)||null:orderRows.filter(matches);
  }else if(table==='ah_product_images'){
   if(mode==='upsert'){imageRows=[record];data=record;}else if(mode==='delete')imageRows=imageRows.filter(x=>x.product_id!==filters.product_id);else data=imageRows;
  }
  return Promise.resolve(resolve({data,error,count}));
 }};return q;
}
const client={from:query,rpc:async name=>({data:name==='ah_bestsellers'?[]:name==='ah_business_stats'?{today:0,pending:0,weekValue:0,monthValue:0}:true,error:null}),storage:{getBucket:async()=>({data:{},error:null}),from:()=>({upload:async()=>{uploads++;return {data:{},error:null}},getPublicUrl:path=>({data:{publicUrl:'https://example.com/'+path}})})},auth:{getUser:async token=>({data:{user:token==='admin'?{id:'admin-id',email:'gamerpixelpulse@gmail.com',email_confirmed_at:'2026-10-09'}:token==='user'?{id:'user-id',email:'other@example.com',email_confirmed_at:'2026-10-09'}:token==='forged'?{id:'user-id',email:'other@example.com',email_confirmed_at:'2026-10-09',user_metadata:{role:'administrator'}}:null},error:null})}};
const photo=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fs.readFileSync(root+'supabase/photo.ts','utf8'))).toString('base64'));
const api=fs.readFileSync(root+'supabase/api.ts','utf8').replace(/^import .*;\r?\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(api),{...photo,AlHornoShopRules:shopRules,AlHornoPricing:pricing,createClient:()=>client,Deno:{env:{get:()=>''},serve:f=>handler=f},URL,Request,Response,crypto,TextEncoder,Uint8Array,console});
async function call(path,token,body,method=body?'POST':'GET'){return handler(new Request('https://test.supabase.co/functions/v1/al-horno-api'+path,{method,headers:{Origin:'https://al-horno.github.io','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}));}
assert.equal((await (await call('/catalog')).json()).products.length,20);
for(const [token,code] of [[null,401],['guest.token',403],['user',403],['forged',403]]){
 assert.equal((await call('/products',token,sample)).status,code);
 assert.equal((await call('/products/w1',token,{...sample,version:1},'PATCH')).status,code);
}
assert.equal((await call('/products','admin',{...sample,price:-1})).status,400);
let r=await call('/products/w1','admin',{...sample,version:1},'PATCH');assert.equal(r.status,200);assert.equal((await r.json()).product.version,2);
assert.equal((await call('/products/w1','admin',{...sample,version:1},'PATCH')).status,409);
r=await call('/products','admin',{...sample,name:'Test create'});assert.equal(r.status,201);const created=(await r.json()).product;
assert.equal((await (await call('/catalog')).json()).products.find(p=>p.id===created.id).name,'Test create');
const png='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
assert.equal((await call('/products/'+created.id+'/image','admin',{image:png})).status,200);assert.equal(uploads,1);
assert.match((await (await call('/catalog')).json()).products.find(p=>p.id===created.id).img,/example.com/);
const payload={requestKey:crypto.randomUUID(),name:'Test',phone:'3000000000',address:'Test address',notes:'',payment:'Efectivo',items:[{id:'w1',qty:2,size:'Grande',toppings:['Chocolate'],note:'',expectedPrice:15500,expectedVersion:2,expectedPending:false}]};
assert.equal((await call('/orders','user',{...payload,items:[{...payload.items[0],expectedPrice:1}]})).status,409);assert.equal(orderRows.length,0);
assert.equal((await call('/orders','user',{...payload,items:[{...payload.items[0],expectedVersion:1}]})).status,409);
assert.equal((await call('/orders','user',{...payload,items:[{...payload.items[0],toppings:['Not allowed']}]})).status,409);
r=await call('/orders','user',payload);assert.equal(r.status,201);const order=(await r.json()).order;
assert.equal(order.payload.subtotal,31000);assert.equal(order.payload.total,35500);assert.equal(order.payload.extrasPending,false);
assert.equal((await (await call('/orders','user',payload)).json()).order.id,order.id);assert.equal(orderRows.length,1);
assert.equal((await (await call('/orders','guest.other')).json()).orders.length,0);
r=await call('/orders','guest.test',{...payload,requestKey:crypto.randomUUID(),items:[{id:'w1',qty:1,size:'Original',toppings:['Fresas'],note:'',expectedPrice:10000,expectedPending:true,expectedVersion:2}]});assert.equal(r.status,201);assert.equal((await r.json()).order.payload.extrasPending,true);
await call('/products/w1','admin',{...sample,available:false,version:2},'PATCH');
assert.equal((await call('/orders','user',{...payload,requestKey:crypto.randomUUID()})).status,409);
// Existing stored orders keep their original snapshots after menu edits.
assert.equal(orderRows[0].payload.total,35500);assert.equal(orderRows[0].payload.items[0].name,sample.name);
// Delivery, promotions, settings authorization and verified reviews.
assert.equal((await call('/settings','user',{...shopRules.defaults(),version:1},'PATCH')).status,403);
assert.equal((await call('/business-stats','user')).status,403);
const newSettings={...shopRules.defaults(),pickup:true,pickupAddress:'Local de prueba',zones:[{id:'general',name:'Centro',price:6000,estimate:'Prueba'},{id:'north',name:'Norte',price:8000,estimate:''}],version:1};
assert.equal((await call('/settings','admin',newSettings,'PATCH')).status,200);
assert.equal((await call('/settings','admin',newSettings,'PATCH')).status,409);
assert.equal((await call('/products/w1','admin',{...sample,version:3,salePrice:8000},'PATCH')).status,200);
let next={...payload,requestKey:crypto.randomUUID(),items:[{id:'w1',qty:1,size:'Original',toppings:[],note:'',expectedPrice:8000,expectedVersion:4}],fulfillment:'pickup',settingsVersion:2,expectedDelivery:0};
assert.equal((await call('/orders','user',{...next,expectedDelivery:1})).status,409);
let pickup=await (await call('/orders','user',next)).json();assert.equal(pickup.order.payload.total,8000);assert.equal(pickup.order.payload.address,'Local de prueba');
assert.equal((await call('/orders','user',{...next,requestKey:crypto.randomUUID(),fulfillment:'delivery',zoneId:'bad'})).status,409);
let zoneOrder=await (await call('/orders','user',{...next,requestKey:crypto.randomUUID(),fulfillment:'delivery',zoneId:'north',expectedDelivery:8000})).json();assert.equal(zoneOrder.order.payload.total,16000);
const review={orderId:pickup.order.id,productId:'w1',rating:5,alias:'Comprador',body:'Prueba aislada'};
assert.equal((await call('/reviews','user',review)).status,403);
orderRows.find(o=>o.id===pickup.order.id).status='entregado';
assert.equal((await call('/reviews','guest.token',review)).status,403);
assert.equal((await call('/reviews','user',{...review,productId:'w2'})).status,403);
assert.equal((await call('/reviews','user',{...review,rating:6})).status,400);
assert.equal((await call('/reviews','user',review)).status,201);
assert.equal((await call('/reviews','user',review)).status,409);
const publicReviews=await (await call('/reviews?product=w1')).json();assert.equal(publicReviews.reviews.length,1);assert.equal(publicReviews.reviews[0].owner_id,undefined);
assert.throws(()=>pricing.validateProduct({...sample,salePrice:11000}));
assert.throws(()=>shopRules.validate({...newSettings,zones:[{id:'x',name:'X',price:-1,estimate:''}]}));
assert.throws(()=>shopRules.validate({...newSettings,pickupAddress:''}));
assert.throws(()=>shopRules.validate({...newSettings,instagram:'javascript:alert(1)'}));

// Scheduled requests are normalized to Colombia time and validated again on the server.
const fixedNow=Date.parse('2026-10-29T04:30:00Z');assert.equal(shopRules.today(fixedNow),'2026-10-28');
assert.equal(shopRules.schedule({scheduleMode:'scheduled',scheduleDate:'2026-10-29',scheduleTime:'14:30'},fixedNow).scheduledFor,'2026-10-29T19:30:00.000Z');
assert.equal(shopRules.schedule({scheduleMode:'asap'},fixedNow).scheduledFor,null);
for(const choice of [{scheduleMode:'other'},{scheduleMode:'scheduled'},{scheduleMode:'scheduled',scheduleDate:'2026-02-30',scheduleTime:'12:00'},{scheduleMode:'scheduled',scheduleDate:'2026-10-29',scheduleTime:'25:00'},{scheduleMode:'scheduled',scheduleDate:'2026-10-28',scheduleTime:'23:00'}])assert.throws(()=>shopRules.schedule(choice,fixedNow));
const futureDay=shopRules.today(Date.now()+2*86400000),scheduledPayload={...next,requestKey:crypto.randomUUID(),scheduleMode:'scheduled',scheduleDate:futureDay,scheduleTime:'14:30'};
let scheduledResponse=await call('/orders','user',scheduledPayload);assert.equal(scheduledResponse.status,201);const scheduledOrder=(await scheduledResponse.json()).order;
assert.equal(scheduledOrder.payload.scheduledFor,futureDay+'T19:30:00.000Z');assert.equal(scheduledOrder.payload.scheduleTimezone,'America/Bogota');assert.equal(scheduledOrder.payload.total,8000);
assert.equal((await (await call('/orders','user',{...scheduledPayload,scheduleDate:'2020-01-01'})).json()).order.id,scheduledOrder.id);
assert.equal((await call('/orders','user',{...scheduledPayload,requestKey:crypto.randomUUID(),scheduleDate:'2020-01-01'})).status,409);
assert.equal((await call('/orders','user',{...scheduledPayload,requestKey:crypto.randomUUID(),scheduleTime:''})).status,409);
assert.match(shopRules.scheduleLabel(scheduledOrder.payload),/Colombia/);
console.log('PASS scheduled orders: strict dates, Colombia timezone, future-only, stored snapshot, stable retries, legacy ASAP.');

failDatabase=true;assert.equal((await call('/catalog')).status,503);
assert.equal((await call('/orders','user',{...payload,requestKey:crypto.randomUUID()})).status,503);
console.log('PASS: configurable prices, unknown/free extras, malformed inputs, role forgery, admin create/update, version conflicts, new-product photos, public catalog, forged/stale totals, sold-out orders, idempotent retry, owner isolation, historical snapshots, database failures.');

