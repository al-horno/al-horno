(() => {
  const api = window.AL_HORNO_API;
  const authDialog = document.getElementById('ah-auth');
  if (!api || !authDialog) return;

  const params = new URLSearchParams(location.hash.slice(1));
  const recovering = params.get('type') === 'recovery';
  let accessToken = recovering ? params.get('access_token') : null;
  let refreshToken = recovering ? params.get('refresh_token') : null;
  const linkError = params.has('error');
  if (recovering || linkError) history.replaceState(null, '', location.pathname + location.search);

  const dialog = document.createElement('dialog');
  dialog.className = 'auth-modal';
  dialog.id = 'ah-recovery';
  dialog.innerHTML = `<div class="row"><h2 id="recovery-title">Recuperar contraseña</h2><button type="button" class="close" aria-label="Cerrar recuperación">✕</button></div>
    <form id="recovery-email-form"><label>Correo de tu cuenta<input name="email" type="email" autocomplete="email" maxlength="200" required></label><button type="submit">Enviar enlace de recuperación</button></form>
    <form id="recovery-password-form" hidden><label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><label>Repite la contraseña<input name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><p class="muted">Usa al menos 8 caracteres. Guarda tu nueva contraseña.</p><button type="submit">Guardar nueva contraseña</button></form>
    <p id="recovery-status" role="status" aria-live="polite"></p><button type="button" class="text-button" id="recovery-again" hidden>Solicitar otro enlace</button><a class="account-link" id="recovery-login" href="./index.html" hidden>Volver para iniciar sesión</a>`;
  document.body.append(dialog);
  const emailForm = dialog.querySelector('#recovery-email-form');
  const passwordForm = dialog.querySelector('#recovery-password-form');
  const status = dialog.querySelector('#recovery-status');
  const again = dialog.querySelector('#recovery-again');
  const forgot = document.createElement('button');
  forgot.type = 'button';
  forgot.className = 'text-button';
  forgot.textContent = 'Olvidé mi contraseña';
  document.getElementById('ah-auth-form').after(forgot);

  function requestMode() {
    accessToken = refreshToken = null;
    passwordForm.reset();
    passwordForm.hidden = true;
    emailForm.hidden = false;
    again.hidden = true;
    dialog.querySelector('#recovery-title').textContent = 'Recuperar contraseña';
    status.textContent = '';
  }
  forgot.onclick = () => {
    requestMode();
    authDialog.close();
    dialog.showModal();
    emailForm.elements.email.focus();
  };
  again.onclick = requestMode;
  dialog.querySelector('.close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { accessToken = refreshToken = null; passwordForm.reset(); });

  async function send(path, body, token) {
    const response = await fetch(api + path, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})},
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'No se pudo completar. Intenta nuevamente.');
    return data;
  }
  emailForm.onsubmit = async event => {
    event.preventDefault();
    const button = emailForm.querySelector('button');
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = 'Enviando enlace…';
    try {
      const result = await send('/forgot-password', {email: emailForm.elements.email.value.trim()});
      status.textContent = result.message;
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  };
  passwordForm.onsubmit = async event => {
    event.preventDefault();
    const password = passwordForm.elements.password.value;
    const button = passwordForm.querySelector('button');
    if (button.disabled) return;
    if (password !== passwordForm.elements.confirm.value) { status.textContent = 'Las contraseñas no coinciden.'; return; }
    if (password.length < 8 || password.length > 128 || password.trim() !== password) { status.textContent = 'Usa entre 8 y 128 caracteres, sin espacios al principio ni al final.'; return; }
    button.disabled = true;
    status.textContent = 'Guardando contraseña…';
    try {
      const result = await send('/reset-password', {password, refreshToken}, accessToken);
      accessToken = refreshToken = null;
      passwordForm.reset();
      passwordForm.hidden = true;
      try { localStorage.removeItem('ahSession'); sessionStorage.removeItem('ahSession'); } catch {}
      status.textContent = result.message;
      again.hidden = true;
      dialog.querySelector('#recovery-login').hidden = false;
    } catch (error) { status.textContent = error.message; again.hidden = false; }
    finally { button.disabled = false; }
  };
  if (recovering || linkError) {
    const valid = !!(accessToken && refreshToken);
    emailForm.hidden = valid;
    passwordForm.hidden = !valid;
    dialog.querySelector('#recovery-title').textContent = valid ? 'Elige tu nueva contraseña' : 'Solicita un nuevo enlace';
    if (!valid) status.textContent = 'El enlace venció o está incompleto. Solicita uno nuevo con tu correo.';
    dialog.showModal();
  }
})();

