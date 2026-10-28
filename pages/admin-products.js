// Called inside the account controller; the API independently verifies administrator access.
window.mountProductEditor=({request,isAdmin})=>{
 const host=document.createElement('section');host.className='product-editor';
 host.innerHTML=`<div class="row"><div><span class="eyebrow">TU MENÚ</span><h3>Productos y precios</h3></div><button type="button" class="account-link" id="product-new">+ Nuevo postre</button></div>
 <label>Selecciona un postre<select id="product-edit-select"></select></label>
 <form id="product-edit-form"><div class="fields"><label>Nombre<input name="productName" required maxlength="100"></label><label>Categoría<input name="category" required maxlength="60" list="product-categories"></label><datalist id="product-categories"></datalist><label class="wide">Descripción<textarea name="description" required maxlength="600" rows="3"></textarea></label><label>Precio base (COP)<input name="price" type="number" min="1" max="1000000" step="1" required inputmode="numeric"></label><label>Disponibilidad<select name="available"><option value="true">Disponible para pedir</option><option value="false">Agotado por ahora</option></select></label></div>
 <div class="fields"><label>Precio de oferta (opcional)<input name="salePrice" type="number" min="1" max="1000000" step="1" placeholder="Sin oferta"></label><label>Etiqueta<select name="isNew"><option value="false">Sin etiqueta</option><option value="true">Nuevo</option></select></label><label>Ingredientes (opcional)<textarea name="ingredients" maxlength="600"></textarea></label><label>Alérgenos (opcional)<textarea name="allergens" maxlength="300"></textarea></label></div><p class="editor-hint">Todos los valores son pesos colombianos. El precio base incluye el tamaño Original.</p>
 <fieldset><legend>Tamaños</legend><p class="muted">Escribe el recargo sobre el precio base. Vacío significa «por cotizar»; 0 significa incluido.</p><div id="product-sizes"></div><button type="button" class="text-button" data-add-option="sizes">+ Agregar tamaño</button></fieldset>
 <fieldset><legend>Toppings</legend><p class="muted">El precio de cada topping se suma por unidad de postre.</p><div id="product-toppings"></div><button type="button" class="text-button" data-add-option="toppings">+ Agregar topping</button></fieldset>
 <div class="editor-actions"><button type="submit" id="product-save">Guardar cambios</button><button type="button" class="account-link" id="product-discard">Descartar cambios</button></div>
 <p id="product-edit-status" role="status" aria-live="polite"></p><p class="muted">Para cambiar la fotografía, usa «Fotos de tus postres» debajo. Primero guarda los productos nuevos.</p></form>`;
 const parent=$('ah-admin-products');parent.prepend(host);
 const form=$('product-edit-form'),select=$('product-edit-select'),status=$('product-edit-status');let current=null,dirty=false,busy=false;
 const msg=s=>{status.textContent=s};
 function optionRow(group,option,index){const locked=group==='sizes'&&index===0;return `<div class="option-editor-row" data-option-group="${group}"><label>Nombre<input data-option-name value="${escapeText(option.name)}" required maxlength="50" ${locked?'readonly':''}></label><label>Recargo (COP)<input data-option-price type="number" min="0" max="1000000" step="1" inputmode="numeric" placeholder="Por cotizar" value="${option.price??''}" ${locked?'readonly':''}></label>${locked?'<span class="muted">Incluido</span>':'<button type="button" class="text-button" data-remove-option aria-label="Quitar opción">Quitar</button>'}</div>`;}
 function load(id){
  const p=products.find(p=>p.id===id);current=p?structuredClone(p):{id:null,name:'',cat:'',desc:'',price:'',available:true,img:'./assets/al-horno-logo.png',sizes:[{name:'Original',price:0}],toppings:[]};
  form.elements.salePrice.value=current.salePrice??'';form.elements.isNew.value=String(current.isNew===true);form.elements.ingredients.value=current.ingredients||'';form.elements.allergens.value=current.allergens||'';form.elements.productName.value=current.name;form.elements.category.value=current.cat;form.elements.description.value=current.desc;form.elements.price.value=current.price;form.elements.available.value=String(current.available);
  for(const group of ['sizes','toppings'])$('product-'+group).innerHTML=current[group].map((o,i)=>optionRow(group,o,i)).join('');
  select.value=current.id||'';$('product-save').textContent=current.id?'Guardar cambios':'Crear postre';dirty=false;msg(current.id?'':'Completa los datos y guarda tu nuevo postre.');
 }
 function refreshList(preferred){
  if(dirty||busy)return;const id=preferred||current?.id||products[0]?.id;
  select.innerHTML='<option value="">Nuevo postre</option>'+products.map(p=>`<option value="${escapeText(p.id)}">${escapeText(p.name)}${p.available?'':' · Agotado'}</option>`).join('');
  $('product-categories').innerHTML=[...new Set(products.map(p=>p.cat))].map(c=>`<option value="${escapeText(c)}"></option>`).join('');load(id);
 }
 form.addEventListener('input',()=>dirty=true);form.addEventListener('change',()=>dirty=true);
 select.onchange=()=>{if(dirty){select.value=current?.id||'';msg('Guarda o descarta los cambios antes de elegir otro postre.');return;}load(select.value)};
 $('product-new').onclick=()=>{if(busy)return;if(dirty){msg('Guarda o descarta los cambios antes de crear otro postre.');return;}load(null);form.elements.productName.focus()};
 $('product-discard').onclick=()=>{if(!busy)load(current?.id)};
 form.addEventListener('click',e=>{const add=e.target.closest('[data-add-option]'),remove=e.target.closest('[data-remove-option]');if(busy)return;if(add){const group=add.dataset.addOption,container=$('product-'+group),count=container.children.length;if(count>=(group==='sizes'?8:12)){msg('Llegaste al máximo de opciones para este postre.');return;}container.insertAdjacentHTML('beforeend',optionRow(group,{name:'',price:null},count));dirty=true;container.lastElementChild.querySelector('input').focus()}if(remove){remove.closest('.option-editor-row').remove();dirty=true}});
 form.onsubmit=async e=>{
  e.preventDefault();if(busy||!isAdmin()||!current)return;
  let data;try{const readOptions=group=>[...$('product-'+group).children].map(row=>({name:row.querySelector('[data-option-name]').value,price:row.querySelector('[data-option-price]').value===''?null:Number(row.querySelector('[data-option-price]').value)}));data=pricing.validateProduct({salePrice:form.elements.salePrice.value===''?null:Number(form.elements.salePrice.value),isNew:form.elements.isNew.value==='true',ingredients:form.elements.ingredients.value,allergens:form.elements.allergens.value,name:form.elements.productName.value,cat:form.elements.category.value,desc:form.elements.description.value,price:Number(form.elements.price.value),available:form.elements.available.value==='true',img:current.baseImg||current.img,sizes:readOptions('sizes'),toppings:readOptions('toppings')});}catch(err){msg(err.message);return;}
  busy=true;for(const input of host.querySelectorAll('input,select,textarea,button'))input.disabled=true;msg('Guardando…');
  try{const r=await request(current.id?'/products/'+current.id:'/products',current.id?'PATCH':'POST',{...data,...(current.id?{version:current.version}:{})});dirty=false;current={...r.product};
   try{await window.AlHornoCatalog.refresh();busy=false;refreshList(r.product.id);msg('Guardado. Tus clientes ya pueden ver los cambios.');window.dispatchEvent(new Event('ah-products-saved'));}
   catch{msg('El producto se guardó. Vuelve a abrir Productos para actualizar la vista.');}
  }catch(err){msg(err.message+(err.status===409?' Pulsa Descartar cambios después de volver a abrir Productos para cargar la versión actual.':''));}
  finally{busy=false;for(const input of host.querySelectorAll('input,select,textarea,button'))input.disabled=false;}
 };
 return {refreshList,reset(){dirty=false;busy=false;current=null;form.reset();}};
};
