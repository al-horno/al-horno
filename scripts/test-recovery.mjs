import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {JSDOM} from '../../commerce-test-tools/node_modules/jsdom/lib/api.js';

const root = new URL('../', import.meta.url);
let handler, sentEmail, changedPassword, signedOut = false;
const client = {
  rpc: async () => ({data: true, error: null}),
  auth: {
    resetPasswordForEmail: async (email, options) => { sentEmail = {email, options}; return {error: null}; },
    getUser: async token => ({data: {user: token === 'valid' ? {id: 'owner'} : null}, error: null}),
    setSession: async tokens => ({data: {user: {id: tokens.refresh_token === 'valid-refresh' ? 'owner' : 'other'}}, error: null}),
    updateUser: async ({password}) => { changedPassword = password; return {error: null}; },
    signOut: async ({scope}) => { signedOut = scope === 'global'; return {error: null}; }
  }
};
const source = fs.readFileSync(new URL('supabase/api.ts', root), 'utf8').replace(/^import .*;\r?\n/gm, '');
vm.runInNewContext(stripTypeScriptTypes(source), {
  createClient: () => client, Deno: {env: {get: () => ''}, serve: callback => { handler = callback; }},
  URL, Request, Response, crypto, TextEncoder, Uint8Array
});
async function call(path, body, token) {
  return handler(new Request('https://test/functions/v1/al-horno-api' + path, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})}, body: JSON.stringify(body)
  }));
}
assert.equal((await call('/forgot-password', {email: 'invalid'})).status, 400);
assert.equal((await call('/forgot-password', {email: 'Example@example.com'})).status, 200);
assert.equal(sentEmail.email, 'example@example.com');
assert.equal(sentEmail.options.redirectTo, 'https://al-horno.github.io/al-horno/');
const reset = {password: 'Test-only-password-123', refreshToken: 'valid-refresh'};
assert.equal((await call('/reset-password', reset)).status, 401);
assert.equal((await call('/reset-password', reset, 'guest.test')).status, 401);
assert.equal((await call('/reset-password', {...reset, password: 'short'}, 'valid')).status, 400);
assert.equal((await call('/reset-password', {...reset, refreshToken: 'other'}, 'valid')).status, 401);
assert.equal(changedPassword, undefined);
assert.equal((await call('/reset-password', reset, 'valid')).status, 200);
assert.equal(changedPassword, reset.password);
assert.equal(signedOut, true);

function page(hash = '') {
  const dom = new JSDOM('<dialog id="ah-auth"><form id="ah-auth-form"></form></dialog>', {url: 'https://al-horno.github.io/al-horno/' + hash, runScripts: 'outside-only'});
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.AL_HORNO_API = 'https://test/functions/v1/al-horno-api';
  let calls = 0;
  w.fetch = async (url, options) => { calls++; return new Response(JSON.stringify({message: 'Contraseña actualizada'})); };
  w.eval(fs.readFileSync(new URL('pages/recovery.js', root), 'utf8'));
  return {w, calls: () => calls};
}
const recovery = page('#type=recovery&access_token=valid&refresh_token=valid-refresh');
assert.equal(recovery.w.location.hash, '');
const form = recovery.w.document.getElementById('recovery-password-form');
assert.equal(form.hidden, false);
form.elements.password.value = 'test-password-123';
form.elements.confirm.value = 'different';
await form.onsubmit({preventDefault() {}});
assert.equal(recovery.calls(), 0);
form.elements.confirm.value = form.elements.password.value;
await form.onsubmit({preventDefault() {}});
assert.equal(recovery.calls(), 1);
assert.equal(form.hidden, true);
assert.equal(form.elements.password.value, '');
assert.equal(recovery.w.localStorage.length, 0);
assert.equal(recovery.w.sessionStorage.length, 0);
const expired = page('#error=access_denied&error_code=otp_expired');
assert.equal(expired.w.location.hash, '');
assert.equal(expired.w.document.getElementById('recovery-email-form').hidden, false);
recovery.w.close(); expired.w.close();
console.log('PASS recovery API and UI: invalid/guest tokens rejected, matching session required, validation, password update, global sign-out, fragment removal, confirmation mismatch and expired-link retry. No real email or password changed.');

