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

  // Recuperação de senha (design novo; e-mail ou telefone; envio real via API)
  function openForgotModal(prefillContact) {
    const overlay = document.createElement('div'); overlay.className = 'fp-overlay';
    const card = document.createElement('div'); card.className = 'fp-card';
    card.innerHTML = `
      <div class="fp-header">
        <h3><i class="fas fa-unlock-alt"></i> Recuperar acesso</h3>
        <button id="fpCloseX" class="fp-close btn-secondary" aria-label="Fechar"><i class="fas fa-times"></i></button>
      </div>
      <div id="step1" class="fp-step">
        <label class="fp-label">E-mail ou Telefone</label>
        <input id="fpContact" class="fp-input" type="text" placeholder="voce@exemplo.com ou (19) 99999-9999">
        <small class="fp-hint">Enviaremos um código de 6 dígitos que expira em 15 minutos.</small>
        <div id="fpMessage1"></div>
        <div class="fp-actions end"><button id="fpSend" class="btn-primary">Enviar código</button><button id="fpCancel1" class="btn-tertiary">Fechar</button></div>
      </div>
      <div id="step2" class="fp-step" style="display:none">
        <div class="fp-step2-header">
          <label class="fp-label">Código</label>
          <button id="fpResend" class="btn-secondary fp-resend" disabled>Reenviar em 60s</button>
        </div>
        <input id="fpCode" class="fp-input fp-code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6 dígitos">
        <div class="fp-grid">
          <label class="fp-label">Nova senha<input id="fpPass" class="fp-input" type="password"></label>
          <label class="fp-label">Confirmar senha<input id="fpPass2" class="fp-input" type="password"></label>
        </div>
        <div id="fpMessage2"></div>
        <div class="fp-actions between"><button id="fpBack" class="btn-secondary">Voltar</button><div class="fp-actions-right"><button id="fpReset" class="btn-primary">Redefinir Senha</button><button id="fpCancel2" class="btn-tertiary">Cancelar</button></div></div>
      </div>`;
    overlay.appendChild(card); document.body.appendChild(overlay);

    const contactEl = card.querySelector('#fpContact');
    const codeEl = card.querySelector('#fpCode');
    const passEl = card.querySelector('#fpPass');
    const pass2El = card.querySelector('#fpPass2');
    const step1 = card.querySelector('#step1');
    const step2 = card.querySelector('#step2');
    const btnSend = card.querySelector('#fpSend');
    const btnReset = card.querySelector('#fpReset');
    const btnBack = card.querySelector('#fpBack');
    const btnCancel1 = card.querySelector('#fpCancel1');
    const btnCancel2 = card.querySelector('#fpCancel2');
    const btnCloseX = card.querySelector('#fpCloseX');
    const btnResend = card.querySelector('#fpResend');
    const msg1 = card.querySelector('#fpMessage1');
    const msg2 = card.querySelector('#fpMessage2');

    let targetEmail = ''; // definido pela API após solicitar código (via email ou telefone)
    let lastTTL = 0; let cooldownLeft = 60; let timer = null;
    const COOLDOWN = 60; // segundos

    const showFP = (message, type, which=1) => {
      const host = which===1 ? msg1 : msg2;
      host.innerHTML = `<div class="fp-message ${type}">${message}</div>`;
    };
    const close = () => { if (timer) clearInterval(timer); overlay.remove(); };
    ;[btnCancel1, btnCancel2, btnCloseX].forEach(b => b?.addEventListener('click', close));
    overlay.addEventListener('click', ev => { if (ev.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(ev){ if (ev.key==='Escape'){ close(); document.removeEventListener('keydown', onEsc); } });

    if (prefillContact) contactEl.value = prefillContact;

    const startCooldown = (ttl)=>{
      cooldownLeft = Math.max(1, Math.min(COOLDOWN, Math.floor(ttl||COOLDOWN)));
      btnResend.disabled = true;
      btnResend.textContent = `Reenviar em ${cooldownLeft}s`;
      if (timer) clearInterval(timer);
      timer = setInterval(()=>{
        cooldownLeft -= 1;
        if (cooldownLeft <= 0) { clearInterval(timer); btnResend.disabled = false; btnResend.textContent = 'Reenviar código'; return; }
        btnResend.textContent = `Reenviar em ${cooldownLeft}s`;
      }, 1000);
    };

    const detect = (v)=> (/@/.test(v) ? { email: v.trim(), phone: '' } : { email: '', phone: v.trim() });

    btnSend.addEventListener('click', async () => {
      const v = (contactEl.value||'').trim();
      if (!v) { showFP('Informe e-mail ou telefone.', 'error', 1); contactEl.focus(); return; }
      if (!window.API_BASE) { showFP('API indisponível. Tente novamente mais tarde.', 'error', 1); return; }
      try {
        btnSend.disabled = true; btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        const payload = detect(v);
        const res = await fetch(window.API_BASE + '/auth/request_reset.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || !j.ok) throw new Error(j.error||'Falha ao enviar o código.');
        targetEmail = j.email || '';
        lastTTL = j.ttl || COOLDOWN;
        if (j.dev_code) {
          showFP(`Código de teste (dev): ${j.dev_code}`, 'success', 1);
        } else {
          showFP('Código enviado. Verifique seu e-mail ou SMS.', 'success', 1);
        }
        if (j.dev_code) { codeEl.value = String(j.dev_code); }
        step1.style.display='none'; step2.style.display=''; startCooldown(lastTTL);
        setTimeout(()=>codeEl.focus(),0);
      } catch (err) {
        showFP(err?.message||'Erro ao solicitar recuperação.', 'error', 1);
      } finally {
        btnSend.disabled = false; btnSend.textContent = 'Enviar código';
      }
    });

    btnResend?.addEventListener('click', async () => {
      if (!window.API_BASE) return; // nada a fazer sem API
      const v = (contactEl.value||'').trim(); if (!v) return;
      try {
        btnResend.disabled = true; btnResend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reenviando...';
        const payload = detect(v);
        const res = await fetch(window.API_BASE + '/auth/request_reset.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        const j = await res.json().catch(()=>({}));
        if (!res.ok || !j.ok) throw new Error(j.error||'Falha ao reenviar.');
        targetEmail = j.email || targetEmail; lastTTL = j.ttl || COOLDOWN; startCooldown(lastTTL);
        if (j.dev_code) {
          showFP(`Novo código (dev): ${j.dev_code}`, 'success', 2);
          codeEl.value = String(j.dev_code);
        } else {
          showFP('Novo código enviado. Verifique sua caixa de entrada.', 'success', 2);
        }
      } catch (err) {
        showFP(err?.message||'Erro ao reenviar código.', 'error', 2);
      } finally {
        btnResend.innerHTML = 'Reenviar código'; btnResend.disabled = true; // será reabilitado pelo timer
      }
    });

    btnBack.addEventListener('click', () => { step2.style.display='none'; step1.style.display=''; msg2.innerHTML=''; if (timer) { clearInterval(timer); btnResend.textContent='Reenviar em 60s'; btnResend.disabled=true; }});
    btnReset.addEventListener('click', async () => {
      const code = codeEl.value.trim(); const p1 = passEl.value.trim(); const p2 = pass2El.value.trim();
      if (!code) { showFP('Informe o código.', 'error', 2); codeEl.focus(); return; }
      if (!p1 || p1.length < 6) { showFP('A senha deve ter pelo menos 6 caracteres.', 'error', 2); passEl.focus(); return; }
      if (p1 !== p2) { showFP('As senhas não coincidem.', 'error', 2); pass2El.focus(); return; }
      if (!window.API_BASE) { showFP('API indisponível. Tente novamente mais tarde.', 'error', 2); return; }
      try {
        btnReset.disabled = true; btnReset.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redefinindo...';
        const res = await fetch(window.API_BASE + '/auth/reset_password.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: targetEmail, code, password: p1 }) });
        const j = await res.json().catch(()=>({})); if (!res.ok || !j.ok) throw new Error(j.error||'Falha ao redefinir senha.');
        const loginEmail = document.getElementById('loginEmail'); const loginPassword = document.getElementById('loginPassword');
        if (loginEmail && targetEmail) loginEmail.value = targetEmail; if (loginPassword) loginPassword.value = p1;
        document.querySelector('.auth-tab[data-tab="login"]')?.click();
        showFP('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success', 2);
        setTimeout(() => { close(); showMessage('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success'); }, 1100);
      } catch (err) {
        showFP(err?.message||'Não foi possível redefinir a senha.', 'error', 2);
      } finally { btnReset.disabled = false; btnReset.textContent = 'Redefinir'; }
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
      localStorage.setItem('userLoggedIn','true');
      localStorage.setItem('userEmail', u.email);
      localStorage.setItem('userName', name);
      // Persistir role se fornecida pela API (login/register atualizados para retornar role)
      if (u.role) {
        try { localStorage.setItem('userRole', String(u.role).toLowerCase()); } catch {}
      }
      try {
        const prev = localStorage.getItem('userCurrentAccess');
        if (prev) localStorage.setItem('userLastAccess', prev);
        localStorage.setItem('userCurrentAccess', nowISO());
      } catch {}
      try {
        const users = getUsers();
        users[u.email] = { ...(users[u.email]||{}), name, phone:u.phone, city:u.city, state:u.state };
        setUsers(users);
      } catch {}
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
