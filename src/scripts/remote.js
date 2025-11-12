// Auto-detecção do endpoint da API
// Regras:
// - Opt-out: localStorage.useRemoteAPI === 'false' => nunca usar API
// - Opt-in manual: localStorage.useRemoteAPI === 'true' => força API (se disponível)
// - Padrão: tentar detectar automaticamente quando servido por http(s)
(function autoDetectApi() {
  try {
    const opt = localStorage.getItem('useRemoteAPI');
    if (opt === 'false') { window.API_BASE = undefined; window.API_READY = true; return; }
    if (window.API_BASE) { window.API_READY = true; return; }

    const isHttp = /^https?:/i.test(location.protocol);
    const origin = isHttp ? location.origin : 'http://localhost';
    const segs = (isHttp ? location.pathname : '/smartsolar/').split('/').filter(Boolean);
    const first = segs[0] || 'smartsolar';
    const candidates = [];
    if (first && first.toLowerCase() !== 'api') candidates.push(`${origin}/${first}/api`);
    candidates.push(`${origin}/api`);
    candidates.push('http://localhost/smartsolar/api');
    candidates.push('http://localhost/api');

    const tryPing = async (base) => {
      try {
        const res = await fetch(`${base}/ping.php`, { method: 'GET' });
        if (!res.ok) return false;
        const j = await res.json().catch(()=>null);
        return !!(j && j.ok);
      } catch { return false; }
    };

    (async () => {
      let found = null;
      for (const c of candidates) {
        // Se opt-in manual, só usa primeiro candidato padrão
        if (opt === 'true') {
          if (await tryPing(c)) { found = c; break; }
          continue;
        }
        if (await tryPing(c)) { found = c; break; }
      }
      if (found) {
        window.API_BASE = found;
        // console.debug('[SmartSolar] API detectada em', found);
      } else {
        window.API_BASE = undefined;
      }
      window.API_READY = true;
    })();
  } catch { window.API_READY = true; }
})();

// Adaptador simples para integrar com dashboard.js
window.SmartSolarStorage = {
  isRemote() { return !!window.API_BASE; },
  async fetchPlacas(email) {
    const res = await fetch(`${window.API_BASE}/placas/list.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.placas || [];
  },
  async syncPlacas(email, placas) {
    const res = await fetch(`${window.API_BASE}/placas/sync.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, placas })
    });
    return res.ok;
  },
  async ensureUser(email, name) {
    // Opcional: criar/garantir usuário via register se não existir
    try {
      const res = await fetch(`${window.API_BASE}/users/get.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.user) return true;
      // Cria usuário rapidamente (senha aleatória)
      await fetch(`${window.API_BASE}/auth/register.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: Math.random().toString(36).slice(2) })
      });
      return true;
    } catch { return false; }
  }
};

// Sincroniza cedo o nome/avatár no menu lateral se o elemento existir na página.
// Roda em qualquer página que carregue este script (ex.: dashboard), antes do init pesado.
document.addEventListener('DOMContentLoaded', () => {
  try {
    const email = localStorage.getItem('userEmail') || '';
    let displayName = '';
    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (email && users[email] && users[email].name) displayName = users[email].name;
    } catch {}
    if (!displayName) displayName = localStorage.getItem('userName') || (email ? email.split('@')[0] : '');

    const nameEl = document.getElementById('openProfilePage')
      || document.querySelector('.user-menu a.user-name-link')
      || document.querySelector('.user-menu span');
    if (nameEl && displayName) nameEl.textContent = displayName;

    const imgEl = document.querySelector('.user-menu img');
    if (imgEl && displayName) {
      const saved = localStorage.getItem('userProfileImg');
      imgEl.src = saved || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00d4ff&color=fff`;
      imgEl.alt = displayName;
      imgEl.title = displayName;
    }
  } catch {}
});