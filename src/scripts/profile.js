// profile.js - simple profile page logic using localStorage
document.addEventListener('DOMContentLoaded', function () {
  const profileImg = document.getElementById('profileImg');
  const profileFile = document.getElementById('profileFile');
  const inputName = document.getElementById('inputName');
  const inputEmail = document.getElementById('inputEmail');
  const inputStatus = document.getElementById('inputStatus');
  const profileForm = document.getElementById('profileForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const lastAccessEl = document.getElementById('lastAccess');

  // Helpers
  function fmtDateBR(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString('pt-BR');
  }

  function loadUser() {
    const name = localStorage.getItem('userName') || 'Usuário';
    const email = localStorage.getItem('userEmail') || '';
    const img = localStorage.getItem('userProfileImg') || profileImg.src;
    const last = fmtDateBR(localStorage.getItem('userLastAccess'));

    inputName.value = name;
    inputEmail.value = email;
    profileImg.src = img;
    lastAccessEl.textContent = last;
  }

  function dataURLfromFile(file, cb) {
    const reader = new FileReader();
    reader.onload = function (e) { cb(e.target.result); };
    reader.readAsDataURL(file);
  }

  // File preview
  profileFile.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    dataURLfromFile(f, function (dataUrl) {
      profileImg.src = dataUrl;
    });
  });

  // Save
  profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    const status = inputStatus.value;

    if (!name || !email) {
      alert('Por favor, informe nome e e-mail.');
      return;
    }

    // persist
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userProfileImg', profileImg.src);
    localStorage.setItem('userStatus', status);
    localStorage.setItem('userLoggedIn', 'true');

    // confirm and return to dashboard
    alert('Perfil salvo. Voltando ao painel.');
    window.location.href = 'dashboard.html';
  });

  // Cancel
  cancelBtn.addEventListener('click', function () {
    window.location.href = 'dashboard.html';
  });

  // Logout
  logoutBtn && logoutBtn.addEventListener('click', function () {
    // Clear login flags but keep users list if present
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
  });

  // initialize
  loadUser();
});
// profile.js - load and edit user profile
document.addEventListener('DOMContentLoaded', function(){
  const pv = document.getElementById('profileView');
  const pe = document.getElementById('profileEdit');
  const goEdit = document.getElementById('goEdit');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const profileForm = document.getElementById('profileForm');

  const pvName = document.getElementById('pvName');
  const pvEmail = document.getElementById('pvEmail');
  const pvCpf = document.getElementById('pvCpf');
  const pvPhone = document.getElementById('pvPhone');
  const pvCity = document.getElementById('pvCity');
  const pvState = document.getElementById('pvState');
  const pvLastAccess = document.getElementById('pvLastAccess');
  const profileImage = document.getElementById('profileImage');
  const previewImg = document.getElementById('previewImg');

  const inputName = document.getElementById('inputName');
  const inputEmail = document.getElementById('inputEmail');
  const inputCpf = document.getElementById('inputCpf');
  const inputPhone = document.getElementById('inputPhone');
  const inputCity = document.getElementById('inputCity');
  const inputState = document.getElementById('inputState');
  const inputProfileImg = document.getElementById('inputProfileImg');

  function fmtDateBR2(s){ if(!s)return '-'; const d=new Date(s); return isNaN(d.getTime())? s : d.toLocaleString('pt-BR'); }
  function loadFromLocal() {
    const email = localStorage.getItem('userEmail') || '';
    const name = localStorage.getItem('userName') || '';
    const last = fmtDateBR2(localStorage.getItem('userLastAccess'));
    const img = localStorage.getItem('userProfileImg');
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const u = users[email] || {};
    pvName.textContent = name || (email ? email.split('@')[0] : 'Usuário');
    pvEmail.textContent = email || '-';
    pvCpf.textContent = u.cpf || '-';
    pvPhone.textContent = u.phone || '-';
    pvCity.textContent = u.city || '-';
    pvState.textContent = u.state || '-';
    pvLastAccess.textContent = last;
    profileImage.src = img || `https://ui-avatars.com/api/?name=${encodeURIComponent(pvName.textContent)}&background=00d4ff&color=fff`;
    previewImg.src = profileImage.src;

    // fill edit form
    inputName.value = name || '';
    inputEmail.value = email || '';
    inputCpf.value = u.cpf || '';
    inputPhone.value = u.phone || '';
    inputCity.value = u.city || '';
    inputState.value = u.state || '';
  }

  async function loadRemote() {
    // Try API if available
    if (!window.API_BASE) return false;
    try {
      const email = localStorage.getItem('userEmail');
      if (!email) return false;
      const res = await fetch(`${window.API_BASE}/users/get.php`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email })
      });
      if (!res.ok) return false;
      const j = await res.json();
      if (!j || !j.user) return false;
      const u = j.user;
      pvName.textContent = u.name || pvName.textContent;
      pvEmail.textContent = u.email || pvEmail.textContent;
      pvCpf.textContent = u.cpf || pvCpf.textContent || '-';
      pvPhone.textContent = u.phone || pvPhone.textContent || '-';
      pvCity.textContent = u.city || pvCity.textContent || '-';
      pvState.textContent = u.state || pvState.textContent || '-';
      // Usa o mais recente entre o remoto e o local (se ambos válidos)
      try {
        const localLast = localStorage.getItem('userLastAccess');
        const remoteLast = u.last_access;
        const dLocal = localLast ? new Date(localLast) : null;
        const dRemote = remoteLast ? new Date(remoteLast) : null;
        let chosen = localLast;
        if (dLocal && dRemote && !isNaN(dLocal) && !isNaN(dRemote)) {
          chosen = (dRemote.getTime() > dLocal.getTime()) ? remoteLast : localLast;
        } else if (dRemote && !isNaN(dRemote)) {
          chosen = remoteLast;
        }
        if (chosen) pvLastAccess.textContent = fmtDateBR2(chosen);
      } catch { /* noop */ }
      // no profile image from API currently
      return true;
    } catch (e) {
      return false;
    }
  }

  // initial load: try remote then local fallback
  (async ()=>{
    const ok = await loadRemote();
    loadFromLocal();
  })();

  goEdit?.addEventListener('click', ()=>{
    pv.classList.add('hidden');
    pe.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  // simple toast helper
  function showToast(msg, timeout = 3000) {
    const el = document.getElementById('profileToast');
    if (!el) { alert(msg); return; }
    el.textContent = msg; el.classList.remove('hidden'); setTimeout(()=> el.classList.add('show'), 10);
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=> el.classList.add('hidden'), 240); }, timeout);
  }
  cancelEditBtn?.addEventListener('click', ()=>{
    pe.classList.add('hidden');
    pv.classList.remove('hidden');
  });

  inputProfileImg?.addEventListener('change', e=>{
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev=> previewImg.src = ev.target.result; r.readAsDataURL(f);
  });

  // click avatar edit button in view to open edit panel and focus file input
  const avatarEditBtn = document.querySelector('.avatar-edit-btn');
  if (avatarEditBtn) avatarEditBtn.addEventListener('click', ()=>{ goEdit?.click(); setTimeout(()=> inputProfileImg?.click(), 400); });

  // quick change password button — opens forgot password modal if available
  const changePwdBtn = document.getElementById('changePasswordQuick');
  if (changePwdBtn) changePwdBtn.addEventListener('click', ()=>{
    // Open the change password modal in-profile (prefer explicit change requiring old password)
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
      modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
      const old = document.getElementById('oldPassword'); if (old) old.value = '';
      const nw = document.getElementById('newPassword'); if (nw) nw.value = '';
      const cnf = document.getElementById('confirmNewPassword'); if (cnf) cnf.value = '';
      // focus the old password input for accessibility
      setTimeout(()=>{ if (old) try { old.focus(); } catch(e){} }, 80);
      return;
    }
    const prefill = document.getElementById('loginEmail')?.value || localStorage.getItem('userEmail') || '';
    if (typeof openForgotModal === 'function') openForgotModal(prefill); else alert('Abra o modal de recuperação na tela de autenticação.');
  });

  // Change password modal handlers
  const changePwdModal = document.getElementById('changePasswordModal');
  const changePwdForm = document.getElementById('changePasswordForm');
  const cancelChangePwd = document.getElementById('cancelChangePwd');
  if (cancelChangePwd) cancelChangePwd.addEventListener('click', ()=>{ if (changePwdModal) { changePwdModal.classList.add('hidden'); changePwdModal.setAttribute('aria-hidden','true'); } });
  
  // Toggle password visibility
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = this.querySelector('i');
      if (!input || !icon) return;
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
  // Robust fallback: delegated handler in case direct binding failed or script ran before element
  document.addEventListener('click', function (ev) {
    const btn = ev.target.closest && ev.target.closest('#cancelChangePwd');
    if (btn) {
      ev.preventDefault();
      if (changePwdModal) { changePwdModal.classList.add('hidden'); changePwdModal.setAttribute('aria-hidden','true'); }
    }
  });

  // Also bind directly to the modal to handle clicks inside Opera (some versions
  // may behave differently with document-level delegation). This ensures the
  // Cancel button and backdrop close work reliably.
  if (changePwdModal) {
    changePwdModal.addEventListener('click', function (ev) {
      const btn = ev.target.closest && ev.target.closest('#cancelChangePwd');
      if (btn) {
        ev.preventDefault();
        changePwdModal.classList.add('hidden'); changePwdModal.setAttribute('aria-hidden','true');
        return;
      }
      // do nothing on backdrop clicks to avoid accidental closes
    });
  }
  // close on Escape
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' || ev.key === 'Esc') {
      if (changePwdModal && changePwdModal.getAttribute('aria-hidden') === 'false') {
        changePwdModal.classList.add('hidden'); changePwdModal.setAttribute('aria-hidden','true');
      }
    }
  });
  if (changePwdForm) changePwdForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const oldPwd = document.getElementById('oldPassword')?.value || '';
    const newPwd = document.getElementById('newPassword')?.value || '';
    const confirmPwd = document.getElementById('confirmNewPassword')?.value || '';
    const email = localStorage.getItem('userEmail') || '';
    if (!email) { alert('Nenhum usuário logado.'); return; }
    if (!oldPwd || !newPwd || !confirmPwd) { alert('Preencha todos os campos.'); return; }
    if (newPwd.length < 6) { alert('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { alert('A nova senha e a confirmação não coincidem.'); return; }
    // Verify stored password locally
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const u = users[email] || {};
    if (!u.password) {
      // no local password available — cannot verify old password
      const proceed = confirm('Não existe senha armazenada localmente para este usuário. Deseja usar recuperação de senha no modal de autenticação?');
      if (proceed) {
        if (typeof openForgotModal === 'function') { changePwdModal.classList.add('hidden'); openForgotModal(email); }
        else alert('Abra o modal de recuperação na tela de autenticação.');
      }
      return;
    }
    if (u.password !== oldPwd) { alert('Senha antiga incorreta.'); return; }

    // Update local password
    users[email].password = newPwd;
    localStorage.setItem('users', JSON.stringify(users));

    // Try server update if API exists (best-effort)
    if (window.API_BASE) {
      try {
        await fetch(`${window.API_BASE}/auth/change_password.php`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ email, oldPassword: oldPwd, newPassword: newPwd })
        });
      } catch (err) { console.warn('remote change password failed', err); }
    }

    alert('Senha alterada com sucesso.');
    if (changePwdModal) { changePwdModal.classList.add('hidden'); changePwdModal.setAttribute('aria-hidden','true'); }
  });

  // clicking on a field edit icon opens the edit panel and focuses the corresponding input
  document.querySelectorAll('.detail-row .field-edit').forEach(btn => {
    btn.addEventListener('click', (ev)=>{
      const row = ev.target.closest('.detail-row');
      const field = row?.getAttribute('data-field');
      if (!field) return;
      goEdit?.click();
      setTimeout(()=>{
        const map = { cpf: 'inputCpf', phone: 'inputPhone', city: 'inputCity', state: 'inputState' };
        const target = document.getElementById(map[field]);
        if (target) { target.focus(); target.scrollIntoView({behavior:'smooth', block:'center'}); }
      }, 450);
    });
  });

  // live-preview name changes: when editing name, update preview avatar initials and pvName in real-time
  inputName?.addEventListener('input', ()=>{
    const v = inputName.value.trim() || (localStorage.getItem('userName') || 'Usuário');
    pvName.textContent = v;
    // update preview avatar using ui-avatars if no image set
    const saved = localStorage.getItem('userProfileImg');
    if (!saved) {
      const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(v)}&background=00d4ff&color=fff`;
      previewImg.src = url; profileImage.src = url;
    }
  });

  profileForm?.addEventListener('submit', async function(e){
    e.preventDefault();
    // basic validation
    if (!inputName.value || !inputEmail.value) { alert('Nome e email são obrigatórios'); return; }
    const email = inputEmail.value.trim();
    const name = inputName.value.trim();
    const cpf = inputCpf.value.trim();
    const phone = inputPhone.value.trim();
    const city = inputCity.value.trim();
    const state = inputState.value.trim();

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    users[email] = users[email] || {};
    users[email].name = name;
    users[email].cpf = cpf;
    users[email].phone = phone;
    users[email].city = city;
    users[email].state = state;
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
    if (previewImg.src && previewImg.src.startsWith('data:image')) {
      localStorage.setItem('userProfileImg', previewImg.src);
    }

    // try remote update if API exists
    if (window.API_BASE) {
      try {
        const res = await fetch(`${window.API_BASE}/users/update.php`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ email, name, cpf, phone, city, state })
        });
        if (res.ok) {
          // optionally parse result
        }
      } catch (err) { console.warn('remote update failed', err); }
    }

    // update UI
    loadFromLocal();
    pe.classList.add('hidden');
    pv.classList.remove('hidden');
  showToast('Perfil atualizado.');
    // sync sidebar if present
    try {
      const opener = window.opener || window.parent;
      // update nothing — dashboard reads from localStorage on load
    } catch {}
  });
});
