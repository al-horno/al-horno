// Shared photo overrides; the original catalog remains available if the service is offline.
(() => {
 const originals=new Map();let rows=[];
 function apply(){
  if(!products.length)return;
  for(const p of products){if(!originals.has(p.id))originals.set(p.id,p.img);p.img=rows.find(x=>x.product_id===p.id)?.image_url||originals.get(p.id);}
  catalog();
  if(selected)document.getElementById('detailPhoto').src=selected.img;
 }
 async function refresh(){
  if(!window.AL_HORNO_API)return;
  const response=await fetch(window.AL_HORNO_API+'/product-images',{cache:'no-store'});
  if(!response.ok)throw Error('No pudimos cargar las fotos guardadas. Intenta actualizar.');
  const data=await response.json();
  rows=data.images.filter(x=>typeof x.image_url==='string'&&x.image_url.startsWith('https://'));
  apply();
 }
 window.AlHornoPhotos={refresh,original:id=>originals.get(id)};
 window.addEventListener('ah-catalog-ready',apply);
 refresh().catch(()=>{});
 // Refresh when returning to the store on another device or browser tab.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh().catch(()=>{})});
})();
