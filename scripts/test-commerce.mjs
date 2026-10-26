import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
await import('../pages/pricing.js');
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
  if(table==='ah_profiles')data={username:'test'};
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
const client={from:query,rpc:async()=>({data:true,error:null}),storage:{getBucket:async()=>({data:{},error:null}),from:()=>({upload:async()=>{uploads++;return {data:{},error:null}},getPublicUrl:path=>({data:{publicUrl:'https://example.com/'+path}})})},auth:{getUser:async token=>({data:{user:token==='admin'?{id:'admin-id',email:'gamerpixelpulse@gmail.com',email_confirmed_at:'2026-10-09'}:token==='user'?{id:'user-id',email:'other@example.com',email_confirmed_at:'2026-10-09'}:token==='forged'?{id:'user-id',email:'other@example.com',email_confirmed_at:'2026-10-09',user_metadata:{role:'administrator'}}:null},error:null})}};
const photo=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fs.readFileSync(root+'supabase/photo.ts','utf8'))).toString('base64'));
const api=fs.readFileSync(root+'supabase/api.ts','utf8').replace(/^import .*;\r?\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(api),{...photo,AlHornoPricing:pricing,createClient:()=>client,Deno:{env:{get:()=>''},serve:f=>handler=f},URL,Request,Response,crypto,TextEncoder,Uint8Array,console});
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
failDatabase=true;assert.equal((await call('/catalog')).status,503);
assert.equal((await call('/orders','user',{...payload,requestKey:crypto.randomUUID()})).status,503);
console.log('PASS: configurable prices, unknown/free extras, malformed inputs, role forgery, admin create/update, version conflicts, new-product photos, public catalog, forged/stale totals, sold-out orders, idempotent retry, owner isolation, historical snapshots, database failures.');
