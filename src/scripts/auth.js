// auth.clean.js — autenticação local com fallback para API remota
// Fluxos: login, registro e recuperação de senha (e-mail/SMS simulados)

document.addEventListener('DOMContentLoaded', () => {
  // Referências de UI (presentes em index.html/auth.html)
  const authBtn = document.getElementById('authBtn');
  const authModal = document.getElementById('authModal');
  const closeAuthModal = document.getElementById('closeAuthModal');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  const authHeaderTitle = document.querySelector('.auth-header h2');

  // Helpers utilitários
  const safeJson = (v, f = {}) => { try { return JSON.parse(v); } catch { return f; } };
  const nowISO = () => new Date().toISOString();

  const showMessage = (message, type = 'info') => {
    // Remove mensagens anteriores
    document.querySelectorAll('.auth-message').forEach(n => n.remove());
    const el = document.createElement('div');
    el.className = `auth-message auth-message-${type}`;
    el.innerHTML = `<div class="auth-message-content"><span>${message}</span></div>`;
    if (!document.getElementById('auth-message-styles')) {
      const style = document.createElement('style');
      style.id = 'auth-message-styles';
      style.textContent = `
        .auth-message{padding:12px 16px;margin:12px 0;border-radius:8px;font-size:14px}
        .auth-message-info{background:#e7f3ff;border:1px solid #cfe9ff;color:#0b74d1}
        .auth-message-success{background:#eefbe9;border:1px solid #c7f0d0;color:#1b7a2f}
        .auth-message-error{background:#fff0f0;border:1px solid #ffd4d4;color:#b00020}
      `;
      document.head.appendChild(style);
    }
    const container = document.querySelector('.auth-header') || document.body;
    container.parentNode.insertBefore(el, container.nextSibling);
    if (type !== 'error') setTimeout(() => el.remove(), 4500);
  };

  const setLoadingState = (formEl, isLoading, labels = { loading: '...', default: 'Enviar' }) => {
    if (!formEl) return;
    const btn = formEl.querySelector('button[type="submit"]') || formEl.querySelector('.btn-full');
    formEl.querySelectorAll('input,button,select,textarea').forEach(i => i.disabled = !!isLoading);
    if (!btn) return;
    if (isLoading) { btn.dataset.prev = btn.innerHTML || btn.textContent; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${labels.loading}`; }
    else { btn.innerHTML = btn.dataset.prev || labels.default; }
  };

  // Estado local (localStorage)
  const getUsers = () => safeJson(localStorage.getItem('users'), {});
  const setUsers = (obj) => localStorage.setItem('users', JSON.stringify(obj || {}));
  const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
  const saveResetCode = (key, rec) => { const all = safeJson(localStorage.getItem('resetCodes'), {}); all[key] = rec; localStorage.setItem('resetCodes', JSON.stringify(all)); };
  const getResetCode = (key) => safeJson(localStorage.getItem('resetCodes'), {})[key] || null;

  const updateAuthTitleForTab = (tab) => { if (authHeaderTitle) authHeaderTitle.textContent = tab === 'register' ? 'Crie sua conta' : 'Acesse sua conta'; };

  // Redireciona se já estiver logado e houver sessão remota válida
  (async () => {
    const isLoggedIn = localStorage.getItem('userLoggedIn') === 'true';
    const onGateway = /(index\.html?$|auth\.html?$|\/$)/i.test(location.pathname || '');
    if (!isLoggedIn || !onGateway) return;
    // aguarda API_READY curto
    const start = Date.now();
    await new Promise(r => { (function tick(){ if (window.API_READY===true || Date.now()-start>1200) return r(); setTimeout(tick,60); })(); });
    if (!window.API_BASE) return;
    try {
      const email = localStorage.getItem('userEmail') || '';
      const res = await fetch(window.API_BASE + '/users/get.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) });
      if (res.ok) { const j = await res.json(); if (j && j.user) location.href = 'dashboard.html'; }
    } catch {}
  })();

  // Modal open/close e abas
  if (authBtn && authModal) authBtn.addEventListener('click', () => {
    authModal.classList.add('active'); document.body.style.overflow = 'hidden';
    document.querySelectorAll('.auth-message').forEach(n => n.remove());
    const active = document.querySelector('.auth-tab.active'); updateAuthTitleForTab(active ? active.dataset.tab : 'login');
  });
  if (closeAuthModal && authModal) closeAuthModal.addEventListener('click', () => { authModal.classList.remove('active'); document.body.style.overflow = ''; });
  if (authModal) authModal.addEventListener('click', e => { if (e.target === authModal) { authModal.classList.remove('active'); document.body.style.overflow = ''; } });
  authTabs.forEach(tab => tab.addEventListener('click', function(){
    document.querySelectorAll('.auth-message').forEach(n => n.remove());
    authTabs.forEach(t => t.classList.remove('active')); this.classList.add('active');
    const name = this.dataset.tab; authForms.forEach(f => { f.classList.toggle('active', f.id === `${name}Form`); });
    updateAuthTitleForTab(name);
  }));

  // Fluxo LOCAL: usado quando não há API_BASE definida
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', (e) => {
    if (window.API_BASE) return; // remoto assumirá
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value?.trim() || '';
    const password = document.getElementById('loginPassword')?.value || '';
    if (!email || !password) { showMessage('Por favor, preencha todos os campos.', 'error'); return; }
    setLoadingState(loginForm, true, { loading:'Entrando...', default:'Entrar' });
    setTimeout(() => {
      const users = getUsers(); const u = users[email];
      if (!u || !u.password) { setLoadingState(loginForm,false); showMessage('E-mail não cadastrado. Crie uma conta primeiro.', 'error'); return; }
      if (u.password !== password) { setLoadingState(loginForm,false); showMessage('Senha incorreta.', 'error'); return; }
  localStorage.setItem('userLoggedIn','true'); localStorage.setItem('userEmail',email); localStorage.setItem('userName', u.name || email.split('@')[0]);
  try { const prev = localStorage.getItem('userCurrentAccess'); if (prev) localStorage.setItem('userLastAccess', prev); localStorage.setItem('userCurrentAccess', nowISO()); } catch {}
      setLoadingState(loginForm,false); showMessage('Login realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => { authModal?.classList.remove('active'); document.body.style.overflow=''; location.href='dashboard.html'; }, 900);
    }, 500);
  });

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', (e) => {
    if (window.API_BASE) return; // remoto assumirá
    e.preventDefault();
    const name = document.getElementById('registerName')?.value?.trim() || '';
    const email = document.getElementById('registerEmail')?.value?.trim() || '';
    const password = document.getElementById('registerPassword')?.value || '';
    const confirm = document.getElementById('registerConfirmPassword')?.value || '';
    const phone = document.getElementById('registerPhone')?.value?.trim() || '';
    if (!name || !email || !password || !confirm) { showMessage('Por favor, preencha todos os campos.', 'error'); return; }
    if (password !== confirm) { showMessage('As senhas não coincidem.', 'error'); return; }
    if (password.length < 6) { showMessage('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
    if (!document.getElementById('acceptTerms')?.checked) { showMessage('Você precisa aceitar os termos de uso.', 'error'); return; }
    if (phone) { const d = phone.replace(/\D/g,''); if (!(d.length===10||d.length===11)) { showMessage('Telefone inválido.', 'error'); return; } }
    const users = getUsers(); if (users[email]) { showMessage('Este e-mail já está cadastrado. Faça login ou use outro e-mail.', 'error'); return; }
    setLoadingState(registerForm,true,{ loading:'Criando conta...', default:'Criar conta' });
    setTimeout(() => {
      users[email] = { name, password, phone }; setUsers(users);
  localStorage.setItem('userLoggedIn','true'); localStorage.setItem('userEmail', email); localStorage.setItem('userName', name);
  try { const prev = localStorage.getItem('userCurrentAccess'); if (prev) localStorage.setItem('userLastAccess', prev); localStorage.setItem('userCurrentAccess', nowISO()); } catch {}
      setLoadingState(registerForm,false); showMessage('Cadastro realizado com sucesso! Redirecionando...', 'success');
      setTimeout(() => { authModal?.classList.remove('active'); document.body.style.overflow=''; location.href='dashboard.html'; }, 900);
    }, 600);
  });

  // Recuperação de senha (modal próprio — inline)
  function openForgotModal(prefillEmail) {
    const overlay = document.createElement('div'); overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10000';
    const card = document.createElement('div'); card.style.cssText = 'background:#23243a;color:#fff;border-radius:14px;padding:18px;min-width:320px;max-width:92vw;width:420px';
    card.innerHTML = `
      <h3 style="margin:0 0 12px;color:#00d4ff;display:flex;align-items:center;gap:8px"><i class=\"fas fa-unlock-alt\"></i> Recuperar senha</h3>
      <div id=\"step1\">
        <label style=\"display:block;font-weight:600;color:#a6e7ff;margin-bottom:6px\">Método</label>
        <div style=\"display:flex;gap:10px;margin-bottom:8px\">
          <label style=\"cursor:pointer;display:flex;align-items:center;gap:8px\"><input type=\"radio\" name=\"fpMethod\" value=\"email\" checked> E-mail</label>
          <label style=\"cursor:pointer;display:flex;align-items:center;gap:8px\"><input type=\"radio\" name=\"fpMethod\" value=\"sms\"> SMS</label>
        </div>
        <label style=\"display:block;font-weight:600;color:#a6e7ff;margin-bottom:6px\">E-mail da conta</label>
        <input id=\"fpEmail\" type=\"email\" placeholder=\"voce@exemplo.com\" style=\"width:100%;padding:10px;border-radius:8px;border:1px solid #3a3b54;background:#1c1d32;color:#fff\">
        <div id=\"phoneRow\" style=\"display:none;margin-top:8px\">
          <label style=\"display:block;font-weight:600;color:#a6e7ff;margin-bottom:6px\">Telefone (DDD)</label>
          <input id=\"fpPhone\" type=\"tel\" placeholder=\"(99) 9 9999-9999\" style=\"width:100%;padding:10px;border-radius:8px;border:1px solid #3a3b54;background:#1c1d32;color:#fff\">
        </div>
        <small style=\"display:block;margin-top:8px;color:#aeb7d0;opacity:.9\">Enviaremos um código de verificação (simulado).</small>
        <div id=\"fpMessage1\"></div>
        <div style=\"display:flex;gap:10px;justify-content:flex-end;margin-top:12px\"><button id=\"fpCancel1\" class=\"btn-secondary\">Cancelar</button><button id=\"fpSend\" class=\"btn-primary\">Enviar código</button></div>
      </div>
      <div id=\"step2\" style=\"display:none;margin-top:8px\">
        <label style=\"display:block;font-weight:600;color:#a6e7ff;margin-bottom:6px\">Código recebido</label>
        <input id=\"fpCode\" type=\"text\" placeholder=\"6 dígitos\" style=\"width:100%;padding:10px;border-radius:8px;border:1px solid #3a3b54;background:#1c1d32;color:#fff\">
        <div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px\">
          <label style=\"font-weight:600;color:#a6e7ff\">Nova senha<input id=\"fpPass\" type=\"password\" style=\"margin-top:6px;width:100%;padding:10px;border-radius:8px;border:1px solid #3a3b54;background:#1c1d32;color:#fff\"></label>
          <label style=\"font-weight:600;color:#a6e7ff\">Confirmar senha<input id=\"fpPass2\" type=\"password\" style=\"margin-top:6px;width:100%;padding:10px;border-radius:8px;border:1px solid #3a3b54;background:#1c1d32;color:#fff\"></label>
        </div>
        <small id=\"fpHint\" style=\"display:block;margin-top:8px;color:#aeb7d0;opacity:.9\"></small>
        <div id=\"fpMessage2\"></div>
        <div style=\"display:flex;gap:10px;justify-content:space-between;margin-top:12px\"><button id=\"fpBack\" class=\"btn-secondary\">Voltar</button><div style=\"display:flex;gap:10px\"><button id=\"fpCancel2\" class=\"btn-secondary\">Cancelar</button><button id=\"fpResend\" class=\"btn-secondary\">Reenviar (0)</button><button id=\"fpReset\" class=\"btn-primary\">Redefinir</button></div></div>
      </div>`;
    overlay.appendChild(card); document.body.appendChild(overlay);

    const emailEl = card.querySelector('#fpEmail');
    const phoneRow = card.querySelector('#phoneRow');
    const phoneEl = card.querySelector('#fpPhone');
    const codeEl = card.querySelector('#fpCode');
    const passEl = card.querySelector('#fpPass');
    const pass2El = card.querySelector('#fpPass2');
    const hintEl = card.querySelector('#fpHint');
    const step1 = card.querySelector('#step1');
    const step2 = card.querySelector('#step2');
    const btnSend = card.querySelector('#fpSend');
    const btnReset = card.querySelector('#fpReset');
    const btnBack = card.querySelector('#fpBack');
    const btnCancel1 = card.querySelector('#fpCancel1');
    const btnCancel2 = card.querySelector('#fpCancel2');
    const btnResend = card.querySelector('#fpResend');
    const msg1 = card.querySelector('#fpMessage1');
    const msg2 = card.querySelector('#fpMessage2');

    const showFP = (message, type, which=1) => {
      const host = which===1 ? msg1 : msg2;
      host.innerHTML = `<div style=\"padding:8px 12px;margin:8px 0;border-radius:6px;background:${type==='error'?'rgba(244,67,54,0.1)':'rgba(76,175,80,0.1)'};color:${type==='error'?'#f44336':'#4caf50'};border:1px solid ${type==='error'?'rgba(244,67,54,0.3)':'rgba(76,175,80,0.3)'}\">${message}</div>`;
    };

    const close = () => { overlay.remove(); };
    [btnCancel1, btnCancel2].forEach(b => b?.addEventListener('click', close));
    overlay.addEventListener('click', ev => { if (ev.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(ev){ if (ev.key==='Escape'){ close(); document.removeEventListener('keydown', onEsc); } });

    if (prefillEmail) emailEl.value = prefillEmail;
    card.querySelectorAll('input[name="fpMethod"]').forEach(r => r.addEventListener('change', () => {
      const v = card.querySelector('input[name="fpMethod"]:checked')?.value || 'email';
      phoneRow.style.display = v==='sms' ? 'block' : 'none';
    }));

    // Reenvio com cooldown
    let resendCount = 0; let lastSent = 0; const COOLDOWN = 20*1000; const MAX_RESENDS = 5;
    const updateResend = () => { if (!btnResend) return; btnResend.textContent = `Reenviar (${resendCount})`; btnResend.disabled = Date.now() - lastSent < COOLDOWN; };

    btnSend.addEventListener('click', async () => {
      const method = card.querySelector('input[name="fpMethod"]:checked')?.value || 'email';
      const email = emailEl.value.trim(); const phone = phoneEl.value.trim();
      if (!email) { showFP('Informe seu e-mail.', 'error', 1); emailEl.focus(); return; }
      if (window.API_BASE) {
        try {
          const payload = { email }; if (method==='sms') payload.phone = phone;
          const res = await fetch(window.API_BASE + '/auth/request_reset.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(await res.text());
          const j = await res.json(); hintEl.textContent = j.code ? `Código (demo): ${j.code}` : 'Código enviado. Verifique seu e-mail.';
          showFP('Código enviado (verifique seu e-mail/SMS).', 'success', 1);
          step1.style.display='none'; step2.style.display=''; lastSent=Date.now(); resendCount=0; updateResend(); setTimeout(()=>codeEl.focus(),0);
        } catch { showFP('Erro ao solicitar recuperação.', 'error', 1); }
        return;
      }
      // local
      const users = getUsers();
      if (method==='email') {
        if (!users[email]) { showFP('E-mail não cadastrado.', 'error', 1); return; }
        const code = genCode(); saveResetCode('email:'+email, { code, exp: Date.now()+10*60*1000, via:'email' }); hintEl.textContent = `Código (demo): ${code}`;
        showFP('Código enviado (simulado).', 'success', 1);
        step1.style.display='none'; step2.style.display=''; lastSent=Date.now(); resendCount=0; updateResend(); setTimeout(()=>codeEl.focus(),0);
        return;
      }
      if (!phone) { showFP('Informe o número de telefone.', 'error', 1); phoneEl.focus(); return; }
      let foundEmail = null; try { Object.keys(users).forEach(k => { if (users[k]?.phone && users[k].phone.replace(/\D/g,'') === phone.replace(/\D/g,'')) foundEmail = k; }); } catch {}
      if (!foundEmail) { showFP('Telefone não encontrado.', 'error', 1); return; }
      const code = genCode(); saveResetCode('sms:'+phone.replace(/\D/g,''), { code, exp: Date.now()+10*60*1000, via:'sms', email: foundEmail });
      hintEl.textContent = `Código (demo): ${code}`; showFP('Código enviado por SMS (simulado).', 'success', 1);
      emailEl.value = foundEmail; step1.style.display='none'; step2.style.display=''; lastSent=Date.now(); resendCount=0; updateResend(); setTimeout(()=>codeEl.focus(),0);
    });

    btnResend?.addEventListener('click', () => {
      if (Date.now()-lastSent < COOLDOWN) return; if (resendCount >= MAX_RESENDS) { showFP('Limite de reenvio atingido.', 'error', 1); return; }
      const method = card.querySelector('input[name="fpMethod"]:checked')?.value || 'email';
      const email = emailEl.value.trim(); const phone = phoneEl.value.trim(); if (!email) { showFP('Informe seu e-mail.', 'error', 1); return; }
      const code = genCode(); if (method==='email') saveResetCode('email:'+email, { code, exp: Date.now()+10*60*1000, via:'email' }); else saveResetCode('sms:'+phone.replace(/\D/g,''), { code, exp: Date.now()+10*60*1000, via:'sms', email });
      hintEl.textContent = `Código reenviado (demo): ${code}`; resendCount++; lastSent=Date.now(); updateResend(); showFP('Código reenviado (simulado).', 'success', 1);
    });

    btnBack.addEventListener('click', () => { step2.style.display='none'; step1.style.display=''; msg2.innerHTML=''; });
    btnReset.addEventListener('click', () => {
      const method = card.querySelector('input[name="fpMethod"]:checked')?.value || 'email';
      const email = emailEl.value.trim(); const phone = phoneEl.value.trim();
      const code = codeEl.value.trim(); const p1 = passEl.value.trim(); const p2 = pass2El.value.trim();
      if (!code) { showFP('Informe o código.', 'error', 2); codeEl.focus(); return; }
      const rec = method==='email' ? getResetCode('email:'+email) : getResetCode('sms:'+phone.replace(/\D/g,''));
      if (!rec) { showFP('Código expirado ou inválido. Envie novamente.', 'error', 2); return; }
      if (Date.now() > rec.exp) { showFP('Código expirado. Envie novamente.', 'error', 2); return; }
      if (code !== rec.code) { showFP('Código inválido.', 'error', 2); return; }
      if (!p1 || p1.length < 6) { showFP('A senha deve ter pelo menos 6 caracteres.', 'error', 2); passEl.focus(); return; }
      if (p1 !== p2) { showFP('As senhas não coincidem.', 'error', 2); pass2El.focus(); return; }
      const targetEmail = method==='email' ? email : (rec.email || email);
      const users = getUsers(); if (!users[targetEmail]) { showFP('Usuário não encontrado.', 'error', 2); return; }
      users[targetEmail] = { ...(users[targetEmail]||{}), password: p1 }; setUsers(users);
      const loginEmail = document.getElementById('loginEmail'); const loginPassword = document.getElementById('loginPassword');
      if (loginEmail) loginEmail.value = targetEmail; if (loginPassword) loginPassword.value = p1;
      document.querySelector('.auth-tab[data-tab="login"]')?.click();
      showFP('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success', 2);
      setTimeout(() => { overlay.remove(); showMessage('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success'); }, 1200);
    });
  }

  document.getElementById('forgotPassword')?.addEventListener('click', (e) => { e.preventDefault(); openForgotModal(document.getElementById('loginEmail')?.value || ''); });

  // Integração com API remota (se definida)
  (function remote() {
    const API = () => (typeof window.API_BASE === 'string' && window.API_BASE) ? window.API_BASE : null;
    const waitReady = (ms=1200) => new Promise(r => { const s=Date.now(); (function t(){ if (window.API_READY===true||Date.now()-s>=ms) return r(!!API()); setTimeout(t,60); })(); });
    const api = async (path, payload) => { const res = await fetch(API()+path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload||{}) }); if (!res.ok) { let txt=''; try{txt=await res.text();}catch{} throw new Error(txt||res.statusText);} return res.json(); };
    const setLoggedIn = (u) => {
      const name = u.name || (u.email ? u.email.split('@')[0] : 'Usuário');
  localStorage.setItem('userLoggedIn','true'); localStorage.setItem('userEmail', u.email); localStorage.setItem('userName', name);
  try { const prev = localStorage.getItem('userCurrentAccess'); if (prev) localStorage.setItem('userLastAccess', prev); localStorage.setItem('userCurrentAccess', nowISO()); } catch {}
      try { const users = getUsers(); users[u.email] = { ...(users[u.email]||{}), name, phone:u.phone, city:u.city, state:u.state }; setUsers(users); } catch {}
    };
    const remoteRegister = async (name, email, password, phone) => { const payload = { name, email, password }; if (phone) payload.phone = phone; const { user } = await api('/auth/register.php', payload); setLoggedIn(user); return user; };
    const remoteLogin = async (email, password) => { const { user } = await api('/auth/login.php', { email, password }); setLoggedIn(user); return user; };

    document.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!API()) await waitReady();
      if (!API()) return; // sem API → fluxo local permanece

      if (form.id === 'registerForm' || form.matches?.('.register-form')) {
        e.preventDefault();
        const name = form.querySelector('#registerName, [name="name"]')?.value?.trim();
        const email = form.querySelector('#registerEmail, [name="email"]')?.value?.trim();
        const password = form.querySelector('#registerPassword, [name="password"]')?.value || '';
        if (!name || !email || !password) { showMessage('Preencha nome, e-mail e senha.', 'error'); return; }
        if (password.length < 6) { showMessage('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
        if (!document.getElementById('acceptTerms')?.checked) { showMessage('Você precisa aceitar os termos de uso.', 'error'); return; }
        setLoadingState(form, true, { loading:'Criando conta...', default:'Criar conta' });
        try { const phone = form.querySelector('#registerPhone')?.value?.trim() || ''; await remoteRegister(name, email, password, phone); showMessage('Cadastro realizado com sucesso! Redirecionando...', 'success'); setTimeout(()=>location.href='dashboard.html', 1200); }
        catch (err) { setLoadingState(form,false,{loading:'Criando conta...',default:'Criar conta'}); let msg='Erro ao cadastrar. Tente novamente.'; try{const j=JSON.parse(err.message||''); if (j?.error) msg=String(j.error);}catch{ if(err?.message) msg=String(err.message);} if (msg.toLowerCase().includes('e-mail') && msg.toLowerCase().includes('cadastrad')) msg = 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.'; showMessage(msg,'error'); }
      }

      if (form.id === 'loginForm' || form.matches?.('.login-form')) {
        e.preventDefault();
        const email = form.querySelector('#loginEmail, [name="email"]')?.value?.trim();
        const password = form.querySelector('#loginPassword, [name="password"]')?.value || '';
        if (!email || !password) { showMessage('Informe e-mail e senha.', 'error'); return; }
        setLoadingState(form, true, { loading:'Entrando...', default:'Entrar' });
        try { await remoteLogin(email, password); showMessage('Login realizado com sucesso! Redirecionando...', 'success'); setTimeout(()=>location.href='dashboard.html', 1200); }
        catch { setLoadingState(form,false,{loading:'Entrando...',default:'Entrar'}); showMessage('Seu email ou senha estão incorretos, tente novamente', 'error'); }
      }
    }, true);

    (async () => { await waitReady(); console.info('[SmartSolar]', API()? 'Modo remoto ON → '+API(): 'Modo local (sem API)'); })();
  })();
});
