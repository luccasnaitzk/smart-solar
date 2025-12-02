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
    let first = segs[0] || 'smartsolar';
    // If first segment looks like a filename (contains a dot), skip it to avoid paths like "dashboard.html/api"
    if (first && first.indexOf('.') !== -1) first = '';
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
  async getUser(email) {
    const res = await fetch(`${window.API_BASE}/users/get.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(()=>null);
    return data && data.user ? data.user : null;
  },
  async getUserRole(email) {
    try {
      const u = await this.getUser(email);
      return u && u.role ? u.role : 'viewer';
    } catch { return 'viewer'; }
  },
  async setUserRole(actorEmail, targetEmail, role) {
    const res = await fetch(`${window.API_BASE}/users/set_role.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor_email: actorEmail, target_email: targetEmail, role })
    });
    const data = await res.json().catch(()=>({ ok:false }));
    if (!res.ok || data.error) throw new Error(data.error || 'Falha ao definir role');
    return true;
  },
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
  async createReport(email, { titulo, tipo = 'geral', status = 'rascunho', periodo_inicio = null, periodo_fim = null, corpo = null, dados = null }) {
    const res = await fetch(`${window.API_BASE}/relatorios/create.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, titulo, tipo, status, periodo_inicio, periodo_fim, corpo, dados })
    });
    const data = await res.json().catch(()=>({ ok:false }));
    return data;
  },
  async listReports(email, { tipo = null, status = null, limit = 50, offset = 0, from = null, to = null } = {}) {
    const res = await fetch(`${window.API_BASE}/relatorios/list.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tipo, status, limit, offset, from, to })
    });
    if (!res.ok) return { relatorios: [], total: 0 };
    return res.json();
  },
  async getReport(email, id) {
    const res = await fetch(`${window.API_BASE}/relatorios/get.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, id })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.relatorio || null;
  },
  async updateReport(email, id, changes) {
    const res = await fetch(`${window.API_BASE}/relatorios/update.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, id, ...changes })
    });
    const data = await res.json().catch(()=>({ ok:false }));
    return data && data.ok;
  },
  async deleteReport(email, id) {
    const res = await fetch(`${window.API_BASE}/relatorios/delete.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, id })
    });
    const data = await res.json().catch(()=>({ ok:false }));
    return data && data.ok;
  },
  async createTicket(ticket) {
    // ticket: { email, titulo, tipo, nivel, descricao }
    const res = await fetch(`${window.API_BASE}/tickets/create.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    });
    return res.json();
  },
  async listTickets(email) {
    const res = await fetch(`${window.API_BASE}/tickets/list.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) return { tickets: [] };
    return res.json();
  },
  async createPublicTicket(data) {
    // data: { nome, email, categoria, mensagem }
    const res = await fetch(`${window.API_BASE}/public_tickets/create.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async listPublicTickets(email) {
    const res = await fetch(`${window.API_BASE}/public_tickets/list.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) return { tickets: [] };
    return res.json();
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