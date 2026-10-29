// A requested time is confirmed by the business; no availability is invented.
(() => {
 const form=document.getElementById('checkout');if(!form)return;
 const block=document.createElement('fieldset');block.className='delivery-options schedule-options';
 block.innerHTML='<legend>¿Cuándo quieres tu pedido?</legend><label>Momento del pedido<select name="scheduleMode"><option value="asap">Lo antes posible</option><option value="scheduled">Elegir día y hora</option></select></label><div id="schedule-fields" class="fields" hidden><label>Fecha deseada<input name="scheduleDate" type="date"></label><label>Hora deseada<input name="scheduleTime" type="time" step="60"></label></div><p class="muted">Hora de Colombia (San Gil). La fecha y hora solicitadas están sujetas a confirmación del negocio, tanto para domicilio como para recogida.</p><p id="schedule-preview" role="status" aria-live="polite"></p>';
 form.querySelector('.paylabel').before(block);
 const mode=form.elements.scheduleMode,day=form.elements.scheduleDate,time=form.elements.scheduleTime,preview=document.getElementById('schedule-preview');
 function update(){
  const scheduled=mode.value==='scheduled';document.getElementById('schedule-fields').hidden=!scheduled;
  day.required=time.required=scheduled;day.disabled=time.disabled=!scheduled;day.min=AlHornoShopRules.today();
  day.setCustomValidity('');time.setCustomValidity('');preview.textContent='';
  if(!scheduled){day.value=time.value='';return;}
  if(!day.value||!time.value)return;
  try{preview.textContent='Solicitado: '+AlHornoShopRules.scheduleLabel(AlHornoShopRules.schedule(Object.fromEntries(new FormData(form))));}
  catch(e){time.setCustomValidity(e.message);preview.textContent=e.message;}
 }
 for(const field of [mode,day,time])field.addEventListener('input',update);
 mode.addEventListener('change',update);form.addEventListener('reset',()=>setTimeout(update,0));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
 window.AlHornoSchedule={validate(){update();return AlHornoShopRules.schedule(Object.fromEntries(new FormData(form)))}};update();
})();
