import assert from 'node:assert/strict';
import '../pages/shop-rules.js';
const r=globalThis.AlHornoShopRules,s={opening:[null,...Array.from({length:6},()=>({open:'10:00',close:'18:00'}))]};
const now=Date.parse('2026-11-03T15:00:00Z');
assert.doesNotThrow(()=>r.schedule({scheduleMode:'asap'},now,s));
for(const time of ['09:59','18:00','23:00'])assert.throws(()=>r.schedule({scheduleMode:'scheduled',scheduleDate:'2026-11-04',scheduleTime:time},now,s));
assert.throws(()=>r.schedule({scheduleMode:'scheduled',scheduleDate:'2026-11-08',scheduleTime:'12:00'},now,s));
assert.doesNotThrow(()=>r.schedule({scheduleMode:'scheduled',scheduleDate:'2026-11-04',scheduleTime:'10:00'},now,s));
assert.throws(()=>r.validateOpening([{open:'18:00',close:'10:00'},...Array(6).fill(null)]));
assert.deepEqual(r.nextStates({status:'preparando',payload:{fulfillment:'pickup'}}),['listo_recoger','cancelado']);
assert.deepEqual(r.nextStates({status:'entregado',payload:{}}),[]);
console.log('PASS V2: opening boundaries, Sunday closed, future delivery, pickup transitions and terminal states.');

