/* SmartSolar Dashboard – Refatorado e Estabilizado
 * Principais melhorias:
 * - Um único DOMContentLoaded
 * - Remoção de duplicatas (atualizarCards, renderPlacas, modais, etc.)
 * - Guards para elementos inexistentes (evita ReferenceError que para os gráficos)
 * - Inicialização única de gráficos + função restartCharts se abrir aba depois
 * - Loop de simulação resiliente com try/catch
 * - Atualizações em tempo real para aba Análises (Forecast, Radar, Heatmap, Ranking, Timeline)
 * - Badge de alertas e Ticket modal preservados
 */

(function () {
  const TICK_MS = 2000;

  const SS = {
    placas: [],
    panelState: {},     // estado por placa
    panelEvents: [],    // eventos timeline
    charts: {},         // refs Chart.js
    sparks: {},         // sparklines
    sim: { interval: null, lastTick: 0 },
    els: {},
    inited: false,
    // Escopo de visualização: 'geral' ou uma placa específica
    scope: { mode: 'geral', placa: null },
    // Escopo temporal: 'day' | 'week' | 'month'
    timeScope: (localStorage.getItem('timeScope') || 'day'),
    // Fatores estáveis por sessão para extrapolar semana/mês a partir do dia corrente (simulação)
    scopeFactors: { week: 6.5, month: 27.5 },
    clockInterval: null,
    currentReport: []   // dados do relatório gerado
  };

  // História de energia para gráficos de produção (dia/semana)
  SS.simHistory = {
    dayBins: Array(6).fill(0), // 0h-4h, 4h-8h, 8h-12h, 12h-16h, 16h-20h, 20h-24h
    week: [],                  // últimos 7 dias: [{ label:'Seg', value:0 }, ...]
    dayKey: '',                // AAAA-MM-DD
    dailyAccum: 0              // acumulado do dia atual
  };

  function getDayKey(d = new Date()) {
    return d.toISOString().slice(0,10);
  }
  function getPtBrWeekLabel(d = new Date()) {
    const map = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    return map[d.getDay()];
  }
  function initSimHistory() {
    SS.simHistory.dayKey = getDayKey();
    // Preenche últimos 7 dias com labels corretos e valor 0
    SS.simHistory.week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      SS.simHistory.week.push({ label: getPtBrWeekLabel(d), value: 0 });
    }
    SS.simHistory.dayBins = Array(6).fill(0);
    SS.simHistory.dailyAccum = 0;
  }

  /* --------------------- UTIL --------------------- */
  function $(id) { return document.getElementById(id); }
  // ---------- Proteção de acesso: exige login válido no backend ----------
  async function requireBackendAuth() {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      location.href = 'auth.html'; return false;
    }
    // Aguarda remote.js sinalizar pronto (até 1.2s)
    const wait = () => new Promise(r=>{
      const s=Date.now(); (function t(){ if (window.API_READY===true||Date.now()-s>1200) return r(); setTimeout(t,60); })();
    });
    await wait();
    if (!window.API_BASE) { location.href = 'auth.html'; return false; }
    try {
      const res = await fetch(window.API_BASE + '/users/get.php', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('auth');
      const j = await res.json();
      if (!j || !j.user) { location.href = 'auth.html'; return false; }
      // Guarda o ID do cliente (user_id) para uso nas listas de placas e afins
      try {
        SS.userId = j.user.id;
        localStorage.setItem('userId', String(j.user.id));
      } catch {}
      return true;
    } catch { location.href = 'auth.html'; return false; }
  }
  function safeNumber(v, d = 0) { const n = parseFloat(v); return isNaN(n) ? d : n; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* --------------------- ESTADO --------------------- */
  function initPlacasDefault() {
    // Do not auto-seed placas for new users.
    // Previously the app created 3 sample placas here. That caused new users to
    // have pre-populated panels on first login. We now keep the list empty so
    // users can add their own placas and the simulation will start from zero.
    if (!SS.placas.length) {
      SS.placas = [];
    }
  }
  function ensurePanelState() {
    SS.placas.forEach(p => {
      if (!SS.panelState[p.nome]) {
        SS.panelState[p.nome] = {
          eff: 0.85 + Math.random() * 0.1,
            tempC: 28 + Math.random() * 6,
            genKwh: 0,
            powerKw: 0,
            prevPowerKw: 0,
            activeTicks: 0,
            totalTicks: 0,
            idealKwh: 0,
            actualKwh: 0,
            lastStatus: p.status,
            lastLowEventAt: 0
        };
      }
    });
  }

  /* --------------------- DOM CACHE --------------------- */
  function cacheElements() {
    const ids = [
      "powerNow","loadNow","energyToday","revenueToday","co2Saved","efficiency",
      "totalPlacas","potenciaTotal","economia","faturamento","gaugePotencia","gaugeValue",
      "placaTable","placaForm","placaNome","placaPotencia","placaStatus","placaCadastrarBtn",
      "placaNomeError","placaPotenciaError","placaSuccess","analysisRange",
      "analysisHeatmap","analysisRanking","analysisTimeline","analysisHeatMetric",
      "analysisEventType","analysisEventSeverity","analysisPR","analysisUptime",
  "analysisCO2","analysisAuto","darkToggle","pageTitle",
      "supportFab","supportPanel","supportClose","supportBadge","supportWhatsApp",
      "supportTicket","openTicketFab","ticketFabBadge","toggleView","section-dashboard",
      "section-placas","placaMiniSelect","year","footerYear","userMenu","profileModal","closeProfile",
      "editProfileBtn","saveProfile","cancelEdit","profileView","profileEdit","profileName",
      "profileEmail","profileStatus","editName","editEmail","editStatus","userProfileImg",
      "editProfileImg","previewProfileImg","logoutBtn","userSearch","addUserBtn","addUser",
      "removeUserBtn","removeUser","userPermSelect","setPermBtn","permUserName","emailNotify",
      "smsNotify","alertLowGen","saveNotifications","headerTime","headerTimeValue"
      ,"usersSearch","btnAddUser","usersList","userModal","closeUserModal",
      "userForm","userName","userEmail","userRole","saveUserBtn","cancelUserBtn",
      "inviteBtn","inviteLinkBtn","inviteArea","inviteLink","inviteCopyBtn","inviteEmailBtn"
    ];
    ids.forEach(id => SS.els[id] = $(id));
  }

  /* --------------------- RELÓGIO HEADER --------------------- */
  function initClock() {
    const el = SS.els.headerTimeValue || $("headerTimeValue");
    if (!el) return; // se elemento não existir, não faz nada
    // Evita múltiplos intervals se init() for chamado de forma defensiva
    if (SS.clockInterval) clearInterval(SS.clockInterval);
    const update = () => {
      try {
        const now = new Date();
        // Formato HH:MM:SS 24h
        el.textContent = now.toLocaleTimeString('pt-BR', { hour12: false });
      } catch { /* noop */ }
    };
    update();
    SS.clockInterval = setInterval(update, 1000);
  }

  /* --------------------- USUÁRIOS / PERMISSÕES --------------------- */
  function loadUsersObj() {
    try {
      const raw = localStorage.getItem('users');
      if (!raw) return {};
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        const obj = {};
        data.forEach(v => {
          const k = String(v).trim();
          const isEmail = k.includes('@');
          obj[k] = { name: isEmail ? k.split('@')[0] : k, email: isEmail ? k : '' };
        });
        return obj;
      }
      return data && typeof data === 'object' ? data : {};
    } catch { return {}; }
  }
  function saveUsersObj(obj) { localStorage.setItem('users', JSON.stringify(obj || {})); }
  function getUserPerms() { return JSON.parse(localStorage.getItem('userPerms') || '{}'); }
  function setUserPerm(key, perm) {
    const perms = getUserPerms();
    perms[key] = perm;
    localStorage.setItem('userPerms', JSON.stringify(perms));
  }
  // Lista de usuários que DEVEM aparecer na aba Usuários (adicionados manualmente)
  function getManagedUsers() {
    try { return JSON.parse(localStorage.getItem('managedUsers') || '[]'); } catch { return []; }
  }
  function setManagedUsers(arr) { localStorage.setItem('managedUsers', JSON.stringify(Array.isArray(arr)?arr:[])); }
  function addManagedUser(key) {
    const arr = getManagedUsers();
    if (!arr.includes(key)) { arr.push(key); setManagedUsers(arr); }
  }
  function removeManagedUser(key) {
    const arr = getManagedUsers();
    const i = arr.indexOf(key);
    if (i !== -1) { arr.splice(i,1); setManagedUsers(arr); }
  }
  function findUserKey(obj, query) {
    if (!query) return null;
    const q = query.toLowerCase();
    return Object.keys(obj).find(k => {
      const u = obj[k] || {};
      return k.toLowerCase() === q ||
        (u.name || '').toLowerCase() === q ||
        (u.email || '').toLowerCase() === q;
    });
  }
  function updateUserList() {
    try {
      // Modern rendering into #usersList with delegated handlers for performance
      const modernWrap = $('usersList');
      const legacyList = $('userList');
      const usersObj = loadUsersObj();
      const perms = getUserPerms();
      // Filtra apenas usuários que foram adicionados manualmente
      const managed = new Set(getManagedUsers());
      const keys = Object.keys(usersObj).filter(k => managed.has(k));
      const q = (SS.els.usersSearch?.value || SS.els.userSearch?.value || '').trim().toLowerCase();

      if (modernWrap) {
        // Use DocumentFragment to minimize reflows
        const frag = document.createDocumentFragment();
        if (!keys.length) {
          const no = document.createElement('div');
          no.style.color = '#e63946';
          no.style.padding = '12px';
          no.textContent = 'Nenhum usuário adicionado. Use “Adicionar Usuário”.';
          modernWrap.innerHTML = '';
          modernWrap.appendChild(no);
          return;
        }
        const filtered = keys.filter(k => {
          if (!q) return true;
          const u = usersObj[k] || {};
          return (u.name || k).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
        });
        filtered.forEach(k => {
          const u = usersObj[k] || {};
          const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||k)}&background=00d4ff&color=fff&rounded=true`;
          const card = document.createElement('div');
          card.className = 'user-card';
          card.dataset.key = k;
          card.innerHTML = `
          <div class="user-meta">
            <img src="${avatar}" class="user-avatar" alt="">
            <div class="user-info">
              <div class="name">${escapeHtml(u.name || k)}</div>
              <div class="email">${escapeHtml(u.email || '')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div class="user-role ${perms[k]==='admin'?'admin':'viewer'}">${perms[k]==='admin'?'Administrador':'Visualizador'}</div>
            <div class="user-actions">
              <button class="btn-edit-user" data-key="${encodeURIComponent(k)}" title="Editar"><i class="fas fa-pen"></i></button>
              <button class="btn-del-user" data-key="${encodeURIComponent(k)}" title="Remover"><i class="fas fa-trash"></i></button>
            </div>
          </div>`;
          frag.appendChild(card);
        });
        modernWrap.innerHTML = '';
        modernWrap.appendChild(frag);
        return;
      }

      // legacy rendering into ul#userList (kept minimal)
      if (!legacyList) return;
      legacyList.innerHTML = '';
      if (!keys.length) {
        legacyList.innerHTML = '<li style="color:#e63946;padding:6px 4px;">Nenhum usuário adicionado</li>';
        return;
      }
      const frag2 = document.createDocumentFragment();
      keys.filter(k => {
        if (!q) return true;
        const u = usersObj[k] || {};
        return (u.name || k).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      }).forEach(k => {
        const u = usersObj[k] || {};
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||k)}&background=00d4ff&color=fff`;
        const li = document.createElement('li');
        li.className = 'user-item';
        li.dataset.key = k;
        li.innerHTML = `
        <img class="user-avatar" src="${avatar}" alt="">
        <span class="user-name" title="${u.email || k}">${u.name || k}</span>
        <select class="user-role-select">
          <option value="viewer" ${perms[k]==='viewer'?'selected':''}>Visualizador</option>
          <option value="admin" ${perms[k]==='admin'?'selected':''}>Administrador</option>
        </select>
        <button class="user-remove-btn" title="Remover">&times;</button>`;
        frag2.appendChild(li);
      });
      legacyList.appendChild(frag2);
    } catch (err) {
      console.error('updateUserList error', err);
      // degrade gracefully
      const modernWrap = $('usersList');
      if (modernWrap) modernWrap.innerHTML = '<div style="color:#e63946;padding:12px;">Erro ao carregar usuários</div>';
      const legacyList = $('userList'); if (legacyList) legacyList.innerHTML = '<li style="color:#e63946;padding:6px 4px;">Erro ao carregar usuários</li>';
      return;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]);
  }

  function openUserModal(mode = 'add', key = null) {
    const modal = $('userModal');
    const title = $('userModalTitle');
    const form = $('userForm');
    if (!modal || !form) return;
    modal.setAttribute('aria-hidden', 'false');
    form.dataset.mode = mode;
    form.dataset.key = key || '';
    if (mode === 'edit' && key) {
      const users = loadUsersObj();
      const u = users[key] || {};
      $('userName').value = u.name || '';
      $('userEmail').value = u.email || key;
      $('userRole').value = (getUserPerms()[key] || 'viewer');
      title.textContent = 'Editar Usuário';
    } else {
      title.textContent = 'Adicionar Usuário';
      $('userName').value = '';
      $('userEmail').value = '';
      $('userRole').value = 'viewer';
    }
  }

  function closeUserModal() {
    const modal = $('userModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
  }

  function saveUserFromForm(e) {
    if (e && e.preventDefault) e.preventDefault();
    const form = $('userForm');
    if (!form) return;
    const mode = form.dataset.mode || 'add';
    const key = form.dataset.key || '';
    const name = ($('userName').value || '').trim();
    const email = ($('userEmail').value || '').trim();
    const role = ($('userRole').value || 'viewer');
    if (!name || !email) { alert('Preencha nome e email'); return; }
    const users = loadUsersObj();
    // use email as key
    const k = email;
    // Se modo edição e chave mudou, migrar dados/permissões/managedUsers
    if (mode === 'edit' && key && key !== k) {
      const prev = users[key];
      if (prev) delete users[key];
      const perms = getUserPerms();
      if (perms[key]) { perms[k] = perms[key]; delete perms[key]; localStorage.setItem('userPerms', JSON.stringify(perms)); }
      // Atualiza managedUsers: troca a chave antiga pela nova
      const arr = getManagedUsers();
      const idx = arr.indexOf(key);
      if (idx !== -1) { arr.splice(idx,1,k); setManagedUsers(arr); }
    }
    users[k] = { name, email };
    saveUsersObj(users);
    const perms2 = getUserPerms(); perms2[k] = role; localStorage.setItem('userPerms', JSON.stringify(perms2));
    // Garante que apareça na lista (apenas usuários adicionados manualmente)
    addManagedUser(k);
    closeUserModal();
    updateUserList();
  }

  /* --------------------- USER INVITES --------------------- */
  function generateInviteToken(len = 28) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let t = '';
    for (let i=0;i<len;i++) t += chars.charAt(Math.floor(Math.random()*chars.length));
    return t;
  }

  function getInvites() {
    try { return JSON.parse(localStorage.getItem('invites')||'[]'); } catch { return []; }
  }
  function saveInvite(inv) {
    const arr = getInvites(); arr.push(inv); localStorage.setItem('invites', JSON.stringify(arr));
  }

  function sendInviteEmail(email, link) {
    const subject = encodeURIComponent('Convite para SmartSolar');
    const body = encodeURIComponent(`Olá,\n\nVocê recebeu um convite para acessar o SmartSolar. Clique no link abaixo para se cadastrar:\n\n${link}\n\nSe não solicitou, ignore esta mensagem.\n\nAtt.,\nSmartSolar`);
    // open mail client
    window.open(`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`);
  }

  function handleGenerateInvite(sendImmediately = false) {
    const email = ($('userEmail').value || '').trim();
    if (!email) return alert('Informe o e-mail do usuário antes de gerar convite.');
    const token = generateInviteToken(32);
    const link = `${location.origin}${location.pathname.replace(/[^/]*$/,'')}register.html?invite=${token}`;
    const inv = { email, token, createdAt: Date.now() };
    saveInvite(inv);
    const area = $('inviteArea');
    if (area) area.style.display = 'flex';
    const input = $('inviteLink'); if (input) input.value = link;
    if (sendImmediately) sendInviteEmail(email, link);
  }

  /* --------------------- ALERTAS DESATIVADOS --------------------- */
  function loadAlertas() { return []; }
  function renderAlertas() { /* removido */ }
  function updateSupportBadge() {
    // Oculta badges se existirem
    const badge1 = SS.els.supportBadge;
    const badge2 = SS.els.ticketFabBadge;
    [badge1, badge2].forEach(b => { if (b) { b.textContent=''; b.style.display='none'; } });
  }

  /* --------------------- PLACAS (CRUD SIMPLES) --------------------- */
  function renderPlacas() {
    const table = SS.els.placaTable;
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const uid = SS.userId || localStorage.getItem('userId') || '-';
    SS.placas.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-uid" title="ID do cliente">${uid}</td>
        <td>${p.nome}</td>
        <td>${p.potencia} kWp</td>
        <td>${p.status}</td>
        <td>
          <button class="btn-secondary btn-edit" data-i="${idx}">Editar</button>
          <button class="btn-secondary btn-dup" data-i="${idx}">Duplicar</button>
          <button class="btn-secondary btn-rem" data-i="${idx}">Remover</button>
        </td>`;
      tbody.appendChild(tr);
    });
    // Atualiza o seletor rápido ao lado do título
    try { renderPlacaMiniSelect(); } catch(e) {}
  }

  // Mini seletor de placas na própria dashboard (sem sair para a seção Placas)
  function setScope(mode, placaName = null) {
    SS.scope = { mode, placa: placaName };
    // Realça seleção no mini seletor se estiver aberto
    const wrap = SS.els.placaMiniSelect;
    if (wrap) {
      const chips = wrap.querySelectorAll('.placa-chip');
      chips.forEach(chip => {
        const type = chip.getAttribute('data-type');
        const name = chip.getAttribute('data-name');
        const active = (mode === 'geral' && type === 'geral') || (mode === 'placa' && type === 'placa' && name === placaName);
        chip.classList.toggle('active', active);
      });
    }
    const title = SS.els.pageTitle;
    if (title) title.textContent = mode === 'geral' ? 'Dashboard — Geral' : `Dashboard — ${placaName}`;
  }

  function renderPlacaMiniSelect() {
    const wrap = SS.els.placaMiniSelect;
    if (!wrap) return;
    // Renderiza um popover estilizado com busca e lista
    wrap.innerHTML = '';
    wrap.style.display = wrap._open ? '' : 'none';
    wrap.classList.add('placa-mini-select');

    const box = document.createElement('div');
    box.className = 'placa-picker';
    box.innerHTML = `
      <div class="placa-picker-header">
        <i class="fas fa-layer-group"></i>
        <span>Selecionar visão</span>
      </div>
      <div class="placa-picker-search">
        <i class="fas fa-search"></i>
        <input id="placaPickerSearch" type="search" placeholder="Buscar placa..." autocomplete="off" />
      </div>
      <div class="picker-list" id="placaPickerList"></div>
    `;
    wrap.appendChild(box);

    const listEl = box.querySelector('#placaPickerList');
    const addItem = (type, name, meta, status = '') => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-item';
      btn.setAttribute('data-type', type);
      if (type === 'placa') btn.setAttribute('data-name', name);
      const isActive = (SS.scope.mode === 'geral' && type === 'geral') || (SS.scope.mode === 'placa' && type === 'placa' && name === SS.scope.placa);
      if (isActive) btn.classList.add('active');
      btn.innerHTML = `
        <span class="left">
          <i class="fas ${type==='geral' ? 'fa-layer-group' : 'fa-solar-panel'}"></i>
          <span class="name">${type==='geral' ? 'GERAL' : escapeHtml(name)}</span>
        </span>
        <span class="meta">
          ${status ? `<span class="status-dot" data-status="${status}"></span>` : ''}
          ${meta ? `<span class="meta-text">${meta}</span>` : ''}
        </span>`;
      listEl.appendChild(btn);
    };

    // Item GERAL
    addItem('geral', '', 'Todas as placas');
    // Itens de placas
    SS.placas.forEach(p => addItem('placa', p.nome, `${(p.potencia||0).toFixed(2)} kWp`, p.status||''));

    // Filtro local
    const search = box.querySelector('#placaPickerSearch');
    if (search && !search._bound) {
      search._bound = true;
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        listEl.querySelectorAll('.picker-item').forEach(it => {
          const nm = (it.querySelector('.name')?.textContent || '').toLowerCase();
          it.style.display = (!q || nm.includes(q)) ? '' : 'none';
        });
      });
    }

    // Seleção
    if (!wrap._bound) {
      wrap._bound = true;
      wrap.addEventListener('click', (e) => {
        const it = e.target.closest('.picker-item');
        if (!it) return;
        const type = it.getAttribute('data-type');
        if (type === 'geral') setScope('geral'); else setScope('placa', it.getAttribute('data-name'));
        wrap._open = false;
        wrap.style.display = 'none';
      });
    }
  }
  // Atualiza imediatamente componentes de análise após mudanças estruturais em placas
  function refreshAnalisesImmediate() {
    // análises removidas
  }
  function bindPlacaTable() {
    const table = SS.els.placaTable;
    if (!table) return;
    if (table._bound) return;
    table._bound = true;
    table.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const idx = +btn.dataset.i;
      if (isNaN(idx)) return;
      if (btn.classList.contains('btn-rem')) {
        SS.placas.splice(idx, 1);
        ensurePanelState();
        renderPlacas();
        renderPlacaMiniSelect();
        atualizarCards();
        if (typeof updatePlacasDoughnut === 'function') updatePlacasDoughnut();
        syncPlacasRemoteDebounced();
      } else if (btn.classList.contains('btn-dup')) {
        const base = SS.placas[idx];
        if (!base) return;
        let newName = base.nome + ' (Cópia)';
        let c = 2;
        while (SS.placas.some(p => p.nome.toLowerCase() === newName.toLowerCase())) {
          newName = base.nome + ` (Cópia ${c++})`;
        }
        SS.placas.push({ ...base, nome: newName });
        ensurePanelState();
        renderPlacas();
        renderPlacaMiniSelect();
        atualizarCards();
        if (typeof updatePlacasDoughnut === 'function') updatePlacasDoughnut();
        syncPlacasRemoteDebounced();
      } else if (btn.classList.contains('btn-edit')) {
        openEditPlacaModal(idx);
      }
    });
  }
  function openEditPlacaModal(idx) {
    const p = SS.placas[idx];
    if (!p) return;
    closeModalById('editPlacaModal');
    const ov = document.createElement('div');
    ov.id = 'editPlacaModal';
    Object.assign(ov.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    });
    ov.innerHTML = `
      <div style="background:#23243a;padding:28px 22px;border-radius:16px;min-width:260px;max-width:92vw;width:auto;box-sizing:border-box;">
        <h3 style="margin:0 0 14px;color:#00d4ff;">Editar Placa</h3>
        <label style="color:#fff;font-weight:500;display:block;margin-bottom:8px;">Nome
          <input id="editNome" value="${p.nome}" style="width:100%;padding:8px;border:1px solid #444;border-radius:6px;background:#1c1d32;color:#fff;margin-top:4px;">
        </label>
        <label style="color:#fff;font-weight:500;display:block;margin-bottom:8px;">Potência (kWp)
          <input id="editPot" type="number" step="0.01" value="${p.potencia}" style="width:100%;padding:8px;border:1px solid #444;border-radius:6px;background:#1c1d32;color:#fff;margin-top:4px;">
        </label>
        <label style="color:#fff;font-weight:500;display:block;margin-bottom:14px;">Status
          <select id="editStatus" style="width:100%;padding:8px;border:1px solid #444;border-radius:6px;background:#1c1d32;color:#fff;margin-top:4px;">
            <option ${p.status==='Ativa'?'selected':''}>Ativa</option>
            <option ${p.status==='Inativa'?'selected':''}>Inativa</option>
            <option ${p.status==='Manutenção'?'selected':''}>Manutenção</option>
          </select>
        </label>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="savePlaca" class="btn-primary" style="background:#00d4ff;color:#111;font-weight:700;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;">Salvar</button>
          <button id="cancelPlaca" class="btn-secondary" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', ev => { if (ev.target === ov) closeModalById('editPlacaModal'); });
    ov.querySelector('#cancelPlaca').onclick = () => closeModalById('editPlacaModal');
    ov.querySelector('#savePlaca').onclick = () => {
      const nome = ov.querySelector('#editNome').value.trim();
      const pot = safeNumber(ov.querySelector('#editPot').value, p.potencia);
      const status = ov.querySelector('#editStatus').value;
      if (!nome || pot <= 0) return alert('Dados inválidos.');
      SS.placas[idx] = { nome, potencia: +pot.toFixed(2), status };
      ensurePanelState();
      renderPlacas();
  renderPlacaMiniSelect();
      atualizarCards();
      updatePlacasDoughnut();
      refreshAnalisesImmediate();
      // Sincroniza com backend, se disponível
      if (typeof syncPlacasRemoteDebounced === 'function') syncPlacasRemoteDebounced();
      closeModalById('editPlacaModal');
    };
  }
  function closeModalById(id) {
    const m = $(id);
    if (m && m.parentNode) m.parentNode.removeChild(m);
  }

  /* --------------------- KPIs --------------------- */
  function atualizarCards() {
    let total = SS.placas.length;
    let pot = SS.placas.reduce((s, p) => s + (p.potencia || 0), 0);
    if (SS.scope.mode === 'placa' && SS.scope.placa) {
      total = 1;
      const p = SS.placas.find(x => x.nome === SS.scope.placa);
      pot = p ? (p.potencia || 0) : 0;
    }
    if (SS.els.totalPlacas) SS.els.totalPlacas.textContent = total;
    if (SS.els.potenciaTotal) SS.els.potenciaTotal.textContent = pot.toFixed(2) + ' kWp';
    if (SS.els.economia) SS.els.economia.textContent = 'R$ ' + (pot * 20).toFixed(2);
    if (SS.els.faturamento) SS.els.faturamento.textContent = 'R$ ' + (pot * 100).toFixed(2);
  }
  function updateGauge(valKw) {
    if (SS.els.gaugePotencia) {
      const pct = clamp01(valKw / 8) * 100;
      SS.els.gaugePotencia.style.setProperty('--val', pct);
    }
    if (SS.els.gaugeValue) SS.els.gaugeValue.textContent = valKw.toFixed(1) + ' kW';
  }

  /* --------------------- CHARTS --------------------- */
  function initCharts() {
    if (typeof Chart === 'undefined') return;

    // Evitar recriar se já existem
    if (!SS.charts.realtime) {
      const ctx = $('realtimeChart');
      if (ctx) SS.charts.realtime = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
          { label: 'Geração', data: [], borderColor: '#4361ee', backgroundColor: 'rgba(67,97,238,0.12)', fill:true, tension:0.35 },
          { label: 'Consumo', data: [], borderColor: '#f72585', backgroundColor: 'rgba(247,37,133,0.12)', fill:true, tension:0.35 }
        ]},
        options: baseLineOptions('Hora','kW')
      });
    }
    if (!SS.charts.monitoring) {
      const ctx = $('monitoringChart');
      if (ctx) SS.charts.monitoring = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Geração (kW)', data: [], borderColor: '#00d4ff', backgroundColor:'rgba(0,212,255,0.12)', fill:true, tension:0.35 }]},
        options: baseLineOptions('Tempo','kW')
      });
    }
    if (!SS.charts.dailyBar) {
      const ctx = $('dailyBarChart');
      if (ctx) SS.charts.dailyBar = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], datasets:[{ label:'kWh', data:[4,5,6,7,5,4,6], backgroundColor:'#4361ee', borderRadius:6 }]},
        options: {
          responsive:true, maintainAspectRatio:false,
          scales:{ y:{ beginAtZero:true, title:{display:true,text:'kWh'} } }
        }
      });
    }
    if (!SS.charts.placaDoughnut) {
      const ctx = $('placaDoughnut');
      if (ctx) SS.charts.placaDoughnut = new Chart(ctx, {
        type:'doughnut',
        data:{ labels:['Ativas','Inativas','Manutenção'], datasets:[{ data:[0,0,0], backgroundColor:['#2a9d8f','#999','#ffcc00'] }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
      });
      updatePlacasDoughnut();
    }
    if (!SS.charts.radiation) {
      const ctx = $('solarRadiationChart');
      if (ctx) SS.charts.radiation = new Chart(ctx, {
        type:'line',
        data:{ labels:["6h","8h","10h","12h","14h","16h","18h"],
          datasets:[{ label:'Radiação (W/m²)', data:[200,450,750,950,850,600,300], borderColor:'#ffcc00', backgroundColor:'rgba(255,204,0,0.12)', fill:true, tension:0.35 }]},
        options: baseLineOptions('', 'W/m²')
      });
    }
    // Gráficos de análises removidos

    initSparklines();
    updateChartsTheme();
  }

  // Pré-preenche gráficos com histórico sintético para evitar linha reta inicial
  function seedInitialCharts() {
    if (!SS.charts.realtime && !SS.charts.monitoring) return; // garante que initCharts já rodou
    const now = Date.now();
    const points = 15; // ~15 amostras prévias
    const baseIrr = () => 0.2 + Math.random()*0.15; // variação suave inicial
    let lastPower = 0;
    for (let i = points; i > 0; i--) {
      const t = new Date(now - i * (TICK_MS));
      // Simula uma leve curva ascendente com ruído
      const factor = 0.4 + ( (points - i) / points ) * 0.4; // 0.4 .. 0.8
      const noise = 0.85 + Math.random()*0.3;
      const potTotal = SS.placas.reduce((s,p)=> s + p.potencia, 0) || 1;
      const power = potTotal * factor * noise * 0.6; // kW aproximado inicial
      const load = power * (0.8 + Math.random()*0.4);
      lastPower = power;
      if (SS.charts.realtime) {
        const c = SS.charts.realtime;
        c.data.labels.push(t.toLocaleTimeString());
        c.data.datasets[0].data.push(+power.toFixed(2));
        c.data.datasets[1].data.push(+load.toFixed(2));
      }
      if (SS.charts.monitoring) {
        const m = SS.charts.monitoring;
        m.data.labels.push(t.toLocaleTimeString());
        m.data.datasets[0].data.push(+power.toFixed(2));
      }
    }
    if (SS.charts.realtime) SS.charts.realtime.update();
    if (SS.charts.monitoring) SS.charts.monitoring.update();
  }

  function baseLineOptions(xTitle, yTitle, noAnim) {
    return {
      responsive:true,
      maintainAspectRatio:false,
      animation: noAnim ? { duration:0 } : { duration:0 },
      scales:{
        x:{ title:{ display: !!xTitle, text:xTitle } },
        y:{ beginAtZero:true, title:{ display: !!yTitle, text:yTitle } }
      },
      plugins:{ legend:{ labels:{ color:'#fff' } } }
    };
  }

  function initSparklines() {
    const defs = [
      { id:'spark-powerNow', color:'#00d4ff' },
      { id:'spark-loadNow', color:'#ffcc00' },
      { id:'spark-energyToday', color:'#4361ee' },
      { id:'spark-revenueToday', color:'#2a9d8f' }
    ];
    defs.forEach(d => {
      if (SS.sparks[d.id]) return;
      const el = $(d.id);
      if (!el) return;
      SS.sparks[d.id] = new Chart(el, {
        type:'line',
        data:{ labels:[], datasets:[{ data:[], borderColor:d.color, backgroundColor:'transparent', borderWidth:2, pointRadius:0, tension:0.35 }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{enabled:false} }, scales:{ x:{display:false}, y:{display:false} } }
      });
    });
  }

  function pushSpark(id, v) {
    const ch = SS.sparks[id];
    if (!ch) return;
    ch.data.labels.push('');
    ch.data.datasets[0].data.push(v);
    if (ch.data.datasets[0].data.length > 40) {
      ch.data.datasets[0].data.shift();
      ch.data.labels.shift();
    }
    ch.update();
  }

  function updatePlacasDoughnut() {
    const ch = SS.charts.placaDoughnut;
    if (!ch) return;
    const counts = { Ativa:0, Inativa:0, 'Manutenção':0 };
    SS.placas.forEach(p => { if (counts[p.status] != null) counts[p.status]++; });
    ch.data.datasets[0].data = [counts.Ativa, counts.Inativa, counts['Manutenção']];
    ch.update();
  }

  function updateChartsTheme() {
    const isDark = (document.body.getAttribute('data-theme') || 'dark') === 'dark';
    const g = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    const t = isDark ? '#f0f0f0' : '#222';
    Object.values(SS.charts).concat(Object.values(SS.sparks)).forEach(ch => {
      if (!ch) return;
      if (ch.options.scales) {
        ['x','y'].forEach(ax => {
          if (ch.options.scales[ax]) {
            if (ch.options.scales[ax].grid) ch.options.scales[ax].grid.color = g;
            if (ch.options.scales[ax].ticks) ch.options.scales[ax].ticks.color = t;
            if (ch.options.scales[ax].title) ch.options.scales[ax].title.color = t;
          }
        });
      }
      if (ch.options.plugins?.legend?.labels) ch.options.plugins.legend.labels.color = t;
      ch.update();
    });
  }

  /* --------------------- TIME FILTER (Hoje / Semana / Mês) --------------------- */
  function initTimeFilter() {
    try {
      const container = document.querySelector('.time-filter');
      if (!container || container._bound) return;
      container._bound = true;
      const btns = Array.from(container.querySelectorAll('.filter-btn'));
      const scopes = ['day','week','month'];
      const map = new Map();
      // assume order: Hoje, Semana, Mês
      btns.forEach((b, i) => map.set(b, scopes[i] || 'day'));
      const applyActive = () => btns.forEach(b => b.classList.toggle('active', map.get(b) === SS.timeScope));
      btns.forEach(btn => btn.addEventListener('click', () => {
        const scope = map.get(btn) || 'day';
        if (SS.timeScope === scope) return;
        setTimeScope(scope);
        applyActive();
      }));
      // initial state
      applyActive();
      // ensure UI reflects saved scope on load
      updateScopeDependentUI();
    } catch (e) { /* noop */ }
  }

  function setTimeScope(scope) {
    SS.timeScope = scope;
    try { localStorage.setItem('timeScope', scope); } catch {}
    updateScopeDependentUI();
  }

  function updateScopeDependentUI() {
    // Atualiza títulos de KPIs Energia/Economia e gráfico de barras
    try {
      // KPI headings
      const energyTitle = (SS.els.energyToday && SS.els.energyToday.closest('.kpi')?.querySelector('h3')) || null;
      const revenueTitle = (SS.els.revenueToday && SS.els.revenueToday.closest('.kpi')?.querySelector('h3')) || null;
      if (energyTitle) {
        energyTitle.textContent = SS.timeScope === 'day' ? 'Energia Hoje' : (SS.timeScope === 'week' ? 'Energia (Semana)' : 'Energia (Mês)');
      }
      if (revenueTitle) {
        revenueTitle.textContent = SS.timeScope === 'day' ? 'Economia Diária' : (SS.timeScope === 'week' ? 'Economia Semanal' : 'Economia Mensal');
      }
      // Bar chart header text (produçao)
      const barCard = document.getElementById('dailyBarChart')?.closest('.card');
      if (barCard) {
        const h3 = barCard.querySelector('.card-header-modern h3');
        if (h3) {
          h3.textContent = SS.timeScope === 'day' ? 'Produção Hoje' : (SS.timeScope === 'week' ? 'Produção Semanal' : 'Produção Mensal');
        }
      }
      recomputeDailyBar();
    } catch (e) { /* noop */ }
  }

  function recomputeDailyBar() {
    const ch = SS.charts.dailyBar;
    if (!ch) return;
    // Labels e dados conforme escopo, usando histórico da simulação
    if (SS.timeScope === 'day') {
      ch.data.labels = ['0h','4h','8h','12h','16h','20h'];
      ch.data.datasets[0].data = SS.simHistory.dayBins.map(v => +v.toFixed(2));
      ch.options.scales.y.title = { display:true, text:'kWh (dia)' };
    } else if (SS.timeScope === 'week') {
      ch.data.labels = SS.simHistory.week.map(d => d.label);
      ch.data.datasets[0].data = SS.simHistory.week.map(d => +d.value.toFixed(2));
      ch.options.scales.y.title = { display:true, text:'kWh (semana)' };
    } else {
      // Mês aproximado a partir da semana atual: soma dos 7 dias, distribuído em 4 semanas com pequena variação
      const sumWeek = SS.simHistory.week.reduce((s, d) => s + d.value, 0) || 0;
      const labels = ['Sem 1','Sem 2','Sem 3','Sem 4'];
      const factors = [0.95, 1.1, 0.9, 1.05];
      const base = sumWeek; // uma semana observada
      const data = factors.map(f => +((base * f)).toFixed(2));
      ch.data.labels = labels;
      ch.data.datasets[0].data = data;
      ch.options.scales.y.title = { display:true, text:'kWh (mês)' };
    }
    ch.update();
  }

  /* --------------------- ANÁLISES desativadas --------------------- */
  function renderAnalysisHeatmap() { /* noop */ }
  function renderAnalysisRanking() { /* noop */ }
  function renderAnalysisTimeline() { /* noop */ }
  function updateAnalysisKPIs() { /* noop */ }

  /* --------------------- SIMULAÇÃO --------------------- */
  function simulationTick() {
    const now = Date.now();
    SS.sim.lastTick = now;
    const irradiance = 0.2 + Math.max(0, Math.sin((now/1000/60)*Math.PI/6))*0.8; // 0.2..1
    let totalPower = 0;
    let totalLoad = 0;
    SS.placas.forEach(p => {
      const st = SS.panelState[p.nome];
      if (!st) return;
      st.prevPowerKw = st.powerKw || 0;
      const statusFactor = p.status === 'Ativa' ? 1 : (p.status === 'Manutenção' ? 0.5 : 0);
      const idealKw = (p.potencia||0) * irradiance;
      const tempAdj = 1 - Math.max(0, ((st.tempC||30)-25)*0.004);
      const noise = 0.9 + Math.random()*0.2;
      st.powerKw = Math.max(0, idealKw * (st.eff||0.9) * tempAdj * noise * statusFactor);
      st.genKwh += st.powerKw * (TICK_MS/3600000); // kWh increment
      st.idealKwh += idealKw * (TICK_MS/3600000);
      st.actualKwh += st.powerKw * (TICK_MS/3600000);
      st.totalTicks++;
      if (statusFactor>0.1 && st.powerKw>0.01) st.activeTicks++;
      st.tempC = (st.tempC||30) + (Math.random()-0.5)*0.4;
      st.eff = clamp01((st.eff||0.9) + (Math.random()-0.5)*0.01);
      const panelLoad = st.powerKw * (0.7 + Math.random()*0.6);
      st.loadKw = panelLoad;
      totalPower += st.powerKw;
      totalLoad += panelLoad;
      // Eventos (gên. baixa)
      const expected = idealKw;
      if (expected>0.3 && st.powerKw < expected*0.4) {
        if (!st.lastLowEventAt || (now - st.lastLowEventAt) > 120000) {
          SS.panelEvents.push({ time: now, tipo:'geracao', sev:'baixa', desc:`Geração baixa em ${p.nome}` });
          st.lastLowEventAt = now;
        }
      }
      if (st.lastStatus !== p.status) {
        SS.panelEvents.push({ time: now, tipo:'manutencao', sev: p.status==='Inativa'?'alta':'media', desc:`${p.nome} agora ${p.status}` });
        st.lastStatus = p.status;
      }
    });
    SS.panelEvents = SS.panelEvents.slice(-300);

    // Atualiza histórico de produção (delta kWh neste tick)
    try {
      const deltaKwhAll = totalPower * (TICK_MS/3600000);
      const nowDate = new Date();
      const curKey = getDayKey(nowDate);
      if (curKey !== SS.simHistory.dayKey) {
        // Virada do dia: empurra novo dia para a semana
        SS.simHistory.dayKey = curKey;
        SS.simHistory.dayBins = Array(6).fill(0);
        SS.simHistory.dailyAccum = 0;
        // Avança a janela de 7 dias
        SS.simHistory.week.shift();
        SS.simHistory.week.push({ label: getPtBrWeekLabel(nowDate), value: 0 });
      }
      // Bin de 4h
      const idx = Math.min(5, Math.floor(nowDate.getHours()/4));
      SS.simHistory.dayBins[idx] += deltaKwhAll;
      SS.simHistory.dailyAccum += deltaKwhAll;
      // Atualiza o dia atual na semana (última posição)
      if (SS.simHistory.week.length === 7) {
        SS.simHistory.week[6].value += deltaKwhAll;
      }
    } catch (e) { /* noop */ }

    // Consolida métricas conforme escopo selecionado
    let power = totalPower;
    let load = Math.max(0.5, totalLoad);
    let energy;
    if (SS.scope.mode === 'placa' && SS.scope.placa) {
      const st = SS.panelState[SS.scope.placa] || {};
      power = st.powerKw || 0;
      load = Math.max(0.1, st.loadKw || (power * 0.9));
      energy = st.actualKwh || 0;
    } else {
      energy = SS.placas.reduce((s,p)=> s + (SS.panelState[p.nome]?.actualKwh||0), 0);
    }
    updateGauge(power);
    if (SS.els.powerNow) SS.els.powerNow.textContent = power.toFixed(1) + ' kW';
    if (SS.els.loadNow) SS.els.loadNow.textContent = load.toFixed(1) + ' kW';
  // KPIs de energia/receita conforme escopo temporal selecionado
  const tariff = parseFloat(localStorage.getItem('tariff') || '0.95') || 0.95;
  let energyShown = energy;
  if (SS.timeScope === 'week') energyShown = energy * SS.scopeFactors.week;
  else if (SS.timeScope === 'month') energyShown = energy * SS.scopeFactors.month;
  if (SS.els.energyToday) SS.els.energyToday.textContent = energyShown.toFixed(1) + ' kWh';
  const rev = energyShown * tariff;
  if (SS.els.revenueToday) SS.els.revenueToday.textContent = 'R$ ' + rev.toFixed(2);
    if (SS.els.co2Saved) SS.els.co2Saved.textContent = (energy*0.85).toFixed(1) + ' kg';
    const eff = clamp01(power / Math.max(load, 0.1)) * 100;
    if (SS.els.efficiency) SS.els.efficiency.textContent = eff.toFixed(0) + ' %';
    SS._lastPower = power;
    SS._lastLoad = load;
    SS._lastEff = eff;

    atualizarCards();

    // KPIs spark
  pushSpark('spark-powerNow', power);
  pushSpark('spark-loadNow', load);
  pushSpark('spark-energyToday', energyShown);
  pushSpark('spark-revenueToday', rev);

    // Charts principais
    if (SS.charts.realtime) {
      const c = SS.charts.realtime;
      c.data.labels.push(new Date().toLocaleTimeString());
      c.data.datasets[0].data.push(power);
      c.data.datasets[1].data.push(load);
      if (c.data.labels.length > 30) {
        c.data.labels.shift();
        c.data.datasets.forEach(ds => ds.data.shift());
      }
      c.update();
    }
    if (SS.charts.monitoring) {
      const c = SS.charts.monitoring;
      c.data.labels.push(new Date().toLocaleTimeString());
      c.data.datasets[0].data.push(power);
      if (c.data.labels.length > 20) {
        c.data.labels.shift();
        c.data.datasets[0].data.shift();
      }
      c.update();
    }

    // Forecast e análises removidos
    // Recalcula gráfico de barras de produção de tempos em tempos (leve)
    if ((SS._tickCount = (SS._tickCount||0) + 1) % 3 === 0) {
      recomputeDailyBar();
    }
  }

  function startSimulation() {
    if (SS.sim.interval) clearInterval(SS.sim.interval);
    SS.sim.interval = setInterval(() => {
      try { simulationTick(); } catch (e) { /* falha silenciosa */ }
    }, TICK_MS);
  }

  /* --------------------- SUPORTE / TICKET --------------------- */
  function bindSupport() {
    const { supportFab, supportPanel, supportClose, supportWhatsApp, supportTicket, openTicketFab } = SS.els;
    function openPanel() {
      if (!supportPanel) return;
      supportPanel.hidden = false;
      requestAnimationFrame(()=> supportPanel.classList.add('open'));
      supportFab && supportFab.classList.add('active');
    }
    function closePanel() {
      if (!supportPanel) return;
      supportPanel.classList.remove('open');
      supportFab && supportFab.classList.remove('active');
      setTimeout(()=> { if (!supportPanel.classList.contains('open')) supportPanel.hidden = true; }, 220);
    }
    function toggle() { supportPanel && (supportPanel.hidden ? openPanel() : closePanel()); }
    supportFab?.addEventListener('click', toggle);
    supportClose?.addEventListener('click', closePanel);
    document.addEventListener('click', e => {
      if (!supportPanel || supportPanel.hidden) return;
      if (!supportPanel.contains(e.target) && !supportFab?.contains(e.target)) closePanel();
    });
    supportWhatsApp?.addEventListener('click', () =>
      window.open('https://wa.me/5519995983782?text=Olá%20SmartSolar%20-%20preciso%20de%20ajuda.', '_blank')
    );
    function openTicketModal() {
      closeModalById('ticketModalOverlay');
      const ov = document.createElement('div');
      ov.id = 'ticketModalOverlay';
      Object.assign(ov.style, {
        position:'fixed', inset:'0', background:'rgba(0,0,0,0.7)', 
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center', 
        zIndex:10000, animation:'fadeIn 0.2s ease'
      });
      const emailPref = localStorage.getItem('userEmail') || localStorage.getItem('notifyEmail') || '';
      ov.innerHTML = `
  <div class="ticket-modal-card">
          <div class="ticket-modal-header">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span class="ticket-modal-icon">
                <i class="fas fa-ticket-alt"></i>
              </span>
              <h3>Abrir Chamado de Suporte</h3>
            </div>
            <button id="tkClose" class="ticket-modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="ticket-modal-body">
            <label class="ticket-label">
              <span><i class="fas fa-heading"></i> Título</span>
              <input id="tkTitulo" class="ticket-input" placeholder="Descreva brevemente o problema">
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <label class="ticket-label">
                <span><i class="fas fa-tag"></i> Tipo</span>
                <select id="tkTipo" class="ticket-input">
                  <option>Suporte</option><option>Geração</option><option>Manutenção</option><option>Sistema</option>
                </select>
              </label>
              <label class="ticket-label">
                <span><i class="fas fa-exclamation-circle"></i> Prioridade</span>
                <select id="tkNivel" class="ticket-input">
                  <option>Informativo</option><option>Baixo</option><option>Médio</option><option>Alto</option>
                </select>
              </label>
            </div>
            <label class="ticket-label">
              <span><i class="fas fa-envelope"></i> E-mail</span>
              <input id="tkEmail" value="${emailPref}" type="email" class="ticket-input" placeholder="seu@email.com">
            </label>
            <label class="ticket-label">
              <span><i class="fas fa-align-left"></i> Descrição Detalhada</span>
              <textarea id="tkDesc" rows="4" class="ticket-input" placeholder="Forneça mais detalhes sobre o problema..."></textarea>
            </label>
            <div class="ticket-modal-actions">
              <button id="tkCancel" class="ticket-btn-cancel">
                <i class="fas fa-times"></i> Cancelar
              </button>
              <button id="tkSubmit" class="ticket-btn-submit">
                <i class="fas fa-paper-plane"></i> Enviar Chamado
              </button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(ov);
      const titulo = ov.querySelector('#tkTitulo');
      const btnSend = ov.querySelector('#tkSubmit');
      const btnCancel = ov.querySelector('#tkCancel');
      const btnClose = ov.querySelector('#tkClose');
      titulo?.focus();
      btnCancel.addEventListener('click', ()=> closeModalById('ticketModalOverlay'));
      btnClose.addEventListener('click', ()=> closeModalById('ticketModalOverlay'));
      ov.addEventListener('click', ev => { if (ev.target===ov) closeModalById('ticketModalOverlay'); });
      btnSend.addEventListener('click', ()=> {
        const ti = titulo.value.trim();
        if (!ti) return alert('Informe um título.');
        const tipo = ov.querySelector('#tkTipo').value;
        const nivel = ov.querySelector('#tkNivel').value;
        const em = ov.querySelector('#tkEmail').value.trim();
        const de = ov.querySelector('#tkDesc').value.trim();
        if (em && !localStorage.getItem('notifyEmail')) localStorage.setItem('notifyEmail', em);
        const novo = { data: new Date().toLocaleString(), tipo, descricao: ti + (de? ' – '+de:''), nivel };
        let arr = loadAlertas(); arr.unshift(novo);
        localStorage.setItem('alertas', JSON.stringify(arr));
        renderAlertas();
        updateSupportBadge();
        closeModalById('ticketModalOverlay');
        alert('Chamado registrado com sucesso! ✓');
      });
    }
    supportTicket?.addEventListener('click', () => { openPanel(); openTicketModal(); });
    openTicketFab?.addEventListener('click', (e)=> { e.preventDefault(); openTicketModal(); });
  }

  /* --------------------- TEMA --------------------- */
  function initTheme() {
    const stored = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', stored);
    if (SS.els.darkToggle) SS.els.darkToggle.textContent = stored === 'dark' ? '☀️' : '🌙';
    // Sincroniza select de tema se existir
    const themeSelectEl = document.getElementById('themeSelect');
    if (themeSelectEl) themeSelectEl.value = stored;
    SS.els.darkToggle?.addEventListener('click', () => {
      const cur = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', cur);
      localStorage.setItem('theme', cur);
      SS.els.darkToggle.textContent = cur === 'dark' ? '☀️' : '🌙';
      // Atualiza select para refletir mudança via botão
      if (themeSelectEl) themeSelectEl.value = cur;
      updateChartsTheme();
    });
  }

  /* --------------------- VIEW / TABS SIMPLES --------------------- */
  function initTabs() {
    const tabs = document.querySelectorAll('.tab[data-section]');
    const sections = document.querySelectorAll('main section');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = 'section-' + tab.dataset.section;
        sections.forEach(s => s.hidden = s.id !== target);
        if (SS.els.pageTitle) SS.els.pageTitle.textContent = tab.textContent.trim();
        // Ao trocar de aba, garante que modais específicos sejam fechados e overlays removidos
        try {
          cleanupOverlays();
          if (target !== 'section-usuarios') closeUserModal();
          // Se abriu relatórios, preenche datas padrão
          if (target === 'section-relatorios') initReportDates();
        } catch(e){ console.warn('Erro ao alternar abas:', e); }
        // Aba de análises removida
      });
    });
  }

  // Remove overlays/modals que possam ter sido criados dinamicamente e ficaram presos
  function cleanupOverlays() {
    try {
      // ids que usamos para modais temporários
      const ids = ['editPlacaModal','ticketModalOverlay','userModalOverlay'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      // Também garante que o modal embutido seja fechado
      const um = $('userModal'); if (um) um.setAttribute('aria-hidden','true');
    } catch (e) { console.warn('cleanupOverlays falhou', e); }
  }

  /* --------------------- CONFIGURAÇÕES - TABS --------------------- */
  function initConfigTabs() {
    const configTabs = document.querySelectorAll('.config-tab');
    const configPanels = document.querySelectorAll('.config-panel');
    
    configTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetPanel = tab.dataset.configTab;
        
        // Remove active de todas as tabs e painéis
        configTabs.forEach(t => t.classList.remove('active'));
        configPanels.forEach(p => p.classList.remove('active'));
        
        // Ativa a tab e painel selecionados
        tab.classList.add('active');
        const panel = document.querySelector(`[data-config-panel="${targetPanel}"]`);
        if (panel) panel.classList.add('active');
      });
    });

    // Seletores de tema visual
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        themeOptions.forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        // Atualiza o select oculto e aplica o tema
        const themeSelect = $('themeSelect');
        if (themeSelect) {
          themeSelect.value = theme;
          document.body.setAttribute('data-theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('theme', theme);
          updateChartsTheme();
        }
      });
    });

    // Sincroniza estado inicial do tema
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const activeThemeOption = document.querySelector(`.theme-option[data-theme="${currentTheme}"]`);
    if (activeThemeOption) {
      themeOptions.forEach(o => o.classList.remove('active'));
      activeThemeOption.classList.add('active');
    }
  }

  /* --------------------- RELATÓRIOS --------------------- */
  function initReportDates() {
    const dateStart = $('dateStart');
    const dateEnd = $('dateEnd');
    if (!dateStart || !dateEnd) return;
    
    // Define data de fim como hoje
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    // Define data de início como 7 dias atrás
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    if (!dateStart.value) dateStart.value = startDateStr;
    if (!dateEnd.value) dateEnd.value = endDate;
  }

  function generateReport(startDate, endDate) {
    const tbody = $('reportsTable')?.querySelector('tbody');
    if (!tbody) return;

    // Limpa tabela anterior
    tbody.innerHTML = '';

    // Gera dados simulados baseados nas datas
    const start = new Date(startDate);
    const end = new Date(endDate);
    const reports = [];

    // Simula alguns relatórios de exemplo
    let currentDate = new Date(start);
    while (currentDate <= end) {
      const dateStr = currentDate.toLocaleDateString('pt-BR');
      
      // Geração de energia
      const energiaGerada = (Math.random() * 50 + 30).toFixed(2);
      reports.push({
        data: dateStr,
        tipo: 'Geração',
        descricao: 'Energia gerada no dia',
        valor: `${energiaGerada} kWh`
      });

      // Consumo
      const consumo = (Math.random() * 40 + 20).toFixed(2);
      reports.push({
        data: dateStr,
        tipo: 'Consumo',
        descricao: 'Energia consumida',
        valor: `${consumo} kWh`
      });

      // Economia (aleatório a cada 3 dias)
      if (Math.random() > 0.7) {
        const economia = (Math.random() * 100 + 50).toFixed(2);
        reports.push({
          data: dateStr,
          tipo: 'Economia',
          descricao: 'Economia estimada',
          valor: `R$ ${economia}`
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Renderiza na tabela
    reports.forEach(report => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${report.data}</td>
        <td><span class="report-type ${report.tipo.toLowerCase()}">${report.tipo}</span></td>
        <td>${report.descricao}</td>
        <td><strong>${report.valor}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    // Salva no estado para exportação
    SS.currentReport = reports;

    // Habilita exportação
    try { const btn = $('exportCsv'); if (btn) btn.disabled = false; } catch(e) { /* noop */ }

    alert(`Relatório gerado com ${reports.length} registros!`);
  }

  function exportReportToCsv() {
    if (!SS.currentReport || SS.currentReport.length === 0) {
      return alert('Gere um relatório antes de exportar.');
    }

    // Cria CSV
    let csv = 'Data,Tipo,Descrição,Valor\n';
    SS.currentReport.forEach(r => {
      csv += `"${r.data}","${r.tipo}","${r.descricao}","${r.valor}"\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_smartsolar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Relatório exportado com sucesso!');
  }

  /* --------------------- EVENTOS FORM / BUSCAS --------------------- */
  function bindForms() {
    // Placa form
    if (SS.els.placaForm && !SS.els.placaForm._bound) {
      SS.els.placaForm._bound = true;
      SS.els.placaForm.addEventListener('submit', e => {
        e.preventDefault();
        const nome = SS.els.placaNome?.value.trim();
        const pot = safeNumber(SS.els.placaPotencia?.value, 0);
        const status = SS.els.placaStatus?.value || 'Ativa';
        if (!nome || pot <= 0) return alert('Dados inválidos.');
        if (SS.placas.some(p => p.nome.toLowerCase() === nome.toLowerCase()))
          return alert('Nome já existe.');
        SS.placas.push({ nome, potencia: +pot.toFixed(2), status });
        ensurePanelState();
        renderPlacas();
  renderPlacaMiniSelect();
        atualizarCards();
        updatePlacasDoughnut();
        refreshAnalisesImmediate();
        SS.els.placaForm.reset();
        // Atualiza estado do botão após reset (volta a disabled se necessário)
        if (typeof placaUpdateBtnState === 'function') placaUpdateBtnState();
        // Sincroniza com backend, se disponível
        if (typeof syncPlacasRemoteDebounced === 'function') syncPlacasRemoteDebounced();
      });
    }

    // Habilita / desabilita o botão de cadastrar conforme validade dos campos
    function placaUpdateBtnState() {
      const btn = SS.els.placaCadastrarBtn;
      if (!btn) return;
      const nome = (SS.els.placaNome?.value || '').trim();
      const pot = safeNumber(SS.els.placaPotencia?.value, 0);
      const valid = nome.length >= 2 && pot > 0;
      btn.disabled = !valid;
    }
    // Limpa mensagens de erro/sucesso e atualiza estado inicialmente
    try { if (SS.els.placaNomeError) SS.els.placaNomeError.hidden = true; } catch(e){}
    try { if (SS.els.placaPotenciaError) SS.els.placaPotenciaError.hidden = true; } catch(e){}
    placaUpdateBtnState();
    // Escuta alterações para atualizar o botão em tempo real
    ['input','change'].forEach(ev => {
      SS.els.placaNome?.addEventListener(ev, placaUpdateBtnState);
      SS.els.placaPotencia?.addEventListener(ev, placaUpdateBtnState);
      SS.els.placaStatus?.addEventListener(ev, placaUpdateBtnState);
    });
    // Busca usuários
    if (SS.els.userSearch && !SS.els.userSearch._deb) {
      let t;
      const h = () => { clearTimeout(t); t = setTimeout(updateUserList, 180); };
      ['input','change','keyup'].forEach(ev => SS.els.userSearch.addEventListener(ev, h));
      SS.els.userSearch._deb = true;
    }
    // Add user
    SS.els.addUserBtn?.addEventListener('click', () => {
      const val = (SS.els.addUser?.value || '').trim();
      if (!val) return alert('Informe nome ou e-mail.');
      const obj = loadUsersObj();
      if (obj[val]) return alert('Já existe.');
      const isEmail = val.includes('@');
      obj[val] = { name: isEmail ? val.split('@')[0] : val, email: isEmail ? val : '' };
      saveUsersObj(obj);
      setUserPerm(val, 'viewer');
      addManagedUser(val); // aparece apenas quando adicionado manualmente
      SS.els.addUser.value = '';
      updateUserList();
      alert('Usuário adicionado.');
    });
    // Remove user
    SS.els.removeUserBtn?.addEventListener('click', () => {
      const q = (SS.els.removeUser?.value || '').trim();
      if (!q) return;
      const obj = loadUsersObj();
      const key = findUserKey(obj, q);
      if (!key) return alert('Não encontrado.');
      delete obj[key];
      saveUsersObj(obj);
      const perms = getUserPerms(); delete perms[key];
      localStorage.setItem('userPerms', JSON.stringify(perms));
      removeManagedUser(key);
      SS.els.removeUser.value = '';
    });

    // Modern users panel bindings
    // open add user modal
    if (SS.els.btnAddUser && !SS.els.btnAddUser._bound) {
      SS.els.btnAddUser._bound = true;
      SS.els.btnAddUser.addEventListener('click', () => openUserModal('add'));
    }
    // search in new users panel
    if (SS.els.usersSearch && !SS.els.usersSearch._deb) {
      SS.els.usersSearch._deb = true;
      SS.els.usersSearch.addEventListener('input', debounce(updateUserList, 180));
    }
    // Delegated click handler for the users list (better performance than per-item listeners)
    if (SS.els.usersList && !SS.els.usersList._delegate) {
      SS.els.usersList._delegate = true;
      SS.els.usersList.addEventListener('click', function (e) {
        const editBtn = e.target.closest('.btn-edit-user');
        if (editBtn) {
          const key = decodeURIComponent(editBtn.getAttribute('data-key') || '');
          openUserModal('edit', key);
          return;
        }
        const delBtn = e.target.closest('.btn-del-user');
        if (delBtn) {
          const key = decodeURIComponent(delBtn.getAttribute('data-key') || '');
          if (!confirm('Remover usuário? Essa ação é irreversível.')) return;
          const obj = loadUsersObj(); delete obj[key]; saveUsersObj(obj);
          const p = getUserPerms(); delete p[key]; localStorage.setItem('userPerms', JSON.stringify(p));
          removeManagedUser(key);
          updateUserList();
          return;
        }
      });
    }
    // Legacy list delegation (if present)
    if ($('userList') && !$('userList')._delegate) {
      const legacy = $('userList');
      legacy._delegate = true;
      legacy.addEventListener('click', function (e) {
        const rem = e.target.closest('.user-remove-btn');
        if (rem) {
          const li = rem.closest('li');
          const key = li && li.dataset && li.dataset.key;
          if (!key) return;
          const obj = loadUsersObj(); delete obj[key]; saveUsersObj(obj);
          const p = getUserPerms(); delete p[key]; localStorage.setItem('userPerms', JSON.stringify(p));
          removeManagedUser(key);
          updateUserList();
        }
      });
      legacy.addEventListener('change', function (e) {
        const sel = e.target.closest('.user-role-select');
        if (sel) {
          const li = sel.closest('li');
          const key = li && li.dataset && li.dataset.key;
          if (!key) return;
          setUserPerm(key, sel.value);
        }
      });
    }
    // modal close / cancel
    if (SS.els.closeUserModal && !SS.els.closeUserModal._bound) {
      SS.els.closeUserModal._bound = true;
      SS.els.closeUserModal.addEventListener('click', closeUserModal);
    }
    if (SS.els.cancelUserBtn && !SS.els.cancelUserBtn._bound) {
      SS.els.cancelUserBtn._bound = true;
      SS.els.cancelUserBtn.addEventListener('click', closeUserModal);
    }
    // user form submit
    if (SS.els.userForm && !SS.els.userForm._bound) {
      SS.els.userForm._bound = true;
      SS.els.userForm.addEventListener('submit', saveUserFromForm);
    }
    // Invite buttons
    if (SS.els.inviteBtn && !SS.els.inviteBtn._bound) {
      SS.els.inviteBtn._bound = true;
      SS.els.inviteBtn.addEventListener('click', () => handleGenerateInvite(true));
    }
    if (SS.els.inviteLinkBtn && !SS.els.inviteLinkBtn._bound) {
      SS.els.inviteLinkBtn._bound = true;
      SS.els.inviteLinkBtn.addEventListener('click', () => handleGenerateInvite(false));
    }
    if (SS.els.inviteCopyBtn && !SS.els.inviteCopyBtn._bound) {
      SS.els.inviteCopyBtn._bound = true;
      SS.els.inviteCopyBtn.addEventListener('click', () => {
        const input = SS.els.inviteLink || $('inviteLink');
        if (!input) return;
        input.select();
        try { navigator.clipboard.writeText(input.value); alert('Link copiado.'); } catch(e) { input.setSelectionRange(0, input.value.length); document.execCommand('copy'); alert('Link copiado.'); }
      });
    }
    if (SS.els.inviteEmailBtn && !SS.els.inviteEmailBtn._bound) {
      SS.els.inviteEmailBtn._bound = true;
      SS.els.inviteEmailBtn.addEventListener('click', () => {
        const input = SS.els.inviteLink || $('inviteLink');
        const email = ($('userEmail').value||'').trim();
        if (!input || !input.value) return alert('Gere um link antes de enviar.');
        if (!email) return alert('Preencha o e-mail antes de enviar.');
        sendInviteEmail(email, input.value);
      });
    }
    // Permissão direta
    SS.els.setPermBtn?.addEventListener('click', () => {
      const q = (SS.els.permUserName?.value || '').trim();
      if (!q) return;
      const obj = loadUsersObj();
      const key = findUserKey(obj, q);
      if (!key) return alert('Usuário não cadastrado.');
      setUserPerm(key, SS.els.userPermSelect?.value || 'viewer');
      updateUserList();
      alert('Permissão atualizada.');
    });
    // Notificações
    if (SS.els.emailNotify) SS.els.emailNotify.value = localStorage.getItem('notifyEmail') || '';
    if (SS.els.smsNotify) SS.els.smsNotify.value = localStorage.getItem('notifySMS') || '';
    if (SS.els.alertLowGen) SS.els.alertLowGen.checked = localStorage.getItem('alertLowGen') === 'true';
    SS.els.saveNotifications?.addEventListener('click', () => {
      if (SS.els.emailNotify) localStorage.setItem('notifyEmail', SS.els.emailNotify.value);
      if (SS.els.smsNotify) localStorage.setItem('notifySMS', SS.els.smsNotify.value);
      if (SS.els.alertLowGen) localStorage.setItem('alertLowGen', SS.els.alertLowGen.checked);
      alert('Notificações salvas.');
    });

    // Filtros análises
    SS.els.analysisHeatMetric?.addEventListener('change', renderAnalysisHeatmap);
    SS.els.analysisEventType?.addEventListener('change', renderAnalysisTimeline);
    SS.els.analysisEventSeverity?.addEventListener('change', renderAnalysisTimeline);
    SS.els.analysisRange?.addEventListener('change', () => {
      if (SS.charts.forecast) SS.charts.forecast.update();
    });

    // Limpar alertas
    SS.els.clearAlerts?.addEventListener('click', () => {
      localStorage.setItem('alertas', JSON.stringify([]));
      renderAlertas();
      updateSupportBadge();
    });

    // Relatórios - Gerar relatório
    const reportForm = $('reportForm');
    const dateStart = $('dateStart');
    const dateEnd = $('dateEnd');
    const reportsTable = $('reportsTable');
  const exportCsvBtn = $('exportCsv');
  const clearReportsBtn = $('clearReports');

    if (reportForm && !reportForm._bound) {
      reportForm._bound = true;
      reportForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!dateStart || !dateStart.value || !dateEnd || !dateEnd.value) {
          return alert('Por favor, selecione as datas de início e fim.');
        }
        generateReport(dateStart.value, dateEnd.value);
      });
    }

    // Exportar CSV
    if (exportCsvBtn && !exportCsvBtn._bound) {
      exportCsvBtn._bound = true;
      exportCsvBtn.addEventListener('click', exportReportToCsv);
    }

    // Estado inicial do botão Exportar
    if (exportCsvBtn) {
      exportCsvBtn.disabled = !(SS.currentReport && SS.currentReport.length > 0);
    }

    // Limpar Relatórios
    if (clearReportsBtn && !clearReportsBtn._bound) {
      clearReportsBtn._bound = true;
      clearReportsBtn.addEventListener('click', () => {
        try {
          const tbody = $('reportsTable')?.querySelector('tbody');
          if (tbody) tbody.innerHTML = '';
          SS.currentReport = [];
          // Desabilita exportação quando não há dados
          const btn = $('exportCsv'); if (btn) btn.disabled = true;
          alert('Relatórios limpos.');
        } catch (e) { /* noop */ }
      });
    }

    // Logout (limpa apenas chaves de autenticação; preserva preferências e foto)
    SS.els.logoutBtn?.addEventListener('click', () => {
      try {
        const authKeys = [
          'userLoggedIn', 'userEmail', 'userName',
          'userId', 'resetCodes', 'userCurrentAccess'
        ];
        authKeys.forEach(k => localStorage.removeItem(k));
        // Mantém: userProfileImg, users, theme, lang, notifyEmail/SMS, etc.
        sessionStorage.clear();
      } catch {}
      window.location.href = 'index.html';
    });

    /* ---------------- CONFIGURAÇÕES (Parâmetros / Limites / Preferências) ---------------- */
    // Carregar valores persistidos
    const plantCapacity = $('plantCapacity');
    const tariff = $('tariff');
    const minGen = $('minGen');
    const maxDelta = $('maxDelta');
    const themeSelect = $('themeSelect');
    const langSelect = $('langSelect');
    const saveSettings = $('saveSettings');
    const saveThresholds = $('saveThresholds');
    const backupBtn = $('backupBtn');
    const restoreBtn = $('restoreBtn');

    // Util para parse seguro
    const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

    // Inicialização de campos se já salvos
    if (plantCapacity) {
      const v = localStorage.getItem('plantCapacity');
      if (v) plantCapacity.value = v;
    }
    if (tariff) {
      const v = localStorage.getItem('tariff');
      if (v) tariff.value = v;
    }
    if (minGen) {
      const v = localStorage.getItem('minGen');
      if (v) minGen.value = v;
    }
    if (maxDelta) {
      const v = localStorage.getItem('maxDelta');
      if (v) maxDelta.value = v;
    }
    if (themeSelect) {
      const cur = localStorage.getItem('theme') || document.body.getAttribute('data-theme') || 'dark';
      themeSelect.value = cur;
      themeSelect.addEventListener('change', () => {
        const val = themeSelect.value;
        document.body.setAttribute('data-theme', val);
        localStorage.setItem('theme', val);
        updateChartsTheme();
        if (SS.els.darkToggle) SS.els.darkToggle.textContent = val === 'dark' ? '☀️' : '🌙';
      });
    }
    // Suporte simples a idioma (stub) – se existir função futura setLanguage
    function setLanguage(lang){
      localStorage.setItem('lang', lang);
      // Placeholder: aqui poderia percorrer map de traduções
    }
    if (langSelect) {
      const cur = localStorage.getItem('lang') || 'pt';
      langSelect.value = cur;
      langSelect.addEventListener('change', () => setLanguage(langSelect.value));
    }

    saveSettings?.addEventListener('click', () => {
      if (plantCapacity) localStorage.setItem('plantCapacity', plantCapacity.value);
      if (tariff) localStorage.setItem('tariff', tariff.value);
      alert('Parâmetros salvos.');
    });
    saveThresholds?.addEventListener('click', () => {
      if (minGen) localStorage.setItem('minGen', minGen.value);
      if (maxDelta) localStorage.setItem('maxDelta', maxDelta.value);
      alert('Limites salvos.');
    });

    // Backup & Restore simples
    backupBtn?.addEventListener('click', () => {
      const keys = [
        'users','userPerms','alertas','tickets','theme','lang','plantCapacity','tariff','minGen','maxDelta',
        'notifyEmail','notifySMS','alertLowGen','userProfileImg'
      ];
      const data = {};
      keys.forEach(k => { const v = localStorage.getItem(k); if (v!=null) data[k]=v; });
      const blob = new Blob([JSON.stringify({ ts:Date.now(), data }, null, 2)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'smartsolar-backup.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    restoreBtn?.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'application/json';
      inp.onchange = () => {
        const file = inp.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = ev => {
          try {
            const json = JSON.parse(ev.target.result);
            if (!json || !json.data) return alert('Arquivo inválido.');
            Object.entries(json.data).forEach(([k,v]) => localStorage.setItem(k, v));
            alert('Restauração concluída. Recarregando...');
            window.location.reload();
          } catch { alert('Falha ao restaurar.'); }
        };
        r.readAsText(file);
      };
      inp.click();
    });
  }

  /* --------------------- PERFIL (Modal simples) --------------------- */
  function initProfile() {
    const {
      profileModal, userMenu, closeProfile, editProfileBtn,
      saveProfile, cancelEdit, profileView, profileEdit,
      profileName, profileEmail, profileStatus, editName,
      editEmail, editStatus, userProfileImg, editProfileImg, previewProfileImg
    } = SS.els;

  if (!profileModal || !userMenu) return;
  profileModal.style.display = 'none';
  // When clicking the avatar image, navigate to the dedicated profile page
  // (we prefer a full page for profile editing instead of an in-dashboard modal)
  const menuImg = userMenu.querySelector('img');
  if (menuImg) menuImg.addEventListener('click', ()=> { window.location.href = 'profile.html'; });
    closeProfile?.addEventListener('click', ()=> profileModal.style.display = 'none');

    editProfileBtn?.addEventListener('click', ()=> {
      profileView?.classList.add('hidden');
      profileEdit?.classList.remove('hidden');
      if (editName && profileName) editName.value = profileName.textContent;
      if (editEmail && profileEmail) editEmail.value = profileEmail.textContent;
      if (editStatus && profileStatus) editStatus.value = profileStatus.textContent;
    });
    cancelEdit?.addEventListener('click', ()=> {
      profileView?.classList.remove('hidden');
      profileEdit?.classList.add('hidden');
    });
    saveProfile?.addEventListener('click', ()=> {
      if (profileName && editName) profileName.textContent = editName.value;
      if (profileEmail && editEmail) profileEmail.textContent = editEmail.value;
      if (profileStatus && editStatus) profileStatus.textContent = editStatus.value;
      // Persiste o nome atualizado
      if (editName && editName.value) localStorage.setItem('userName', editName.value);
      if (previewProfileImg && previewProfileImg.src.startsWith('data:image')) {
        localStorage.setItem('userProfileImg', previewProfileImg.src);
        if (userProfileImg) userProfileImg.src = previewProfileImg.src;
        // sidebar menu
        const img = userMenu.querySelector('img');
        if (img) img.src = previewProfileImg.src;
      }
      profileView?.classList.remove('hidden');
      profileEdit?.classList.add('hidden');
  // Update the sidebar name element (support either an <a id="openProfilePage"> or a span)
  const menuNameEl = userMenu.querySelector('#openProfilePage') || userMenu.querySelector('a.user-name-link') || userMenu.querySelector('span');
  if (menuNameEl && editName) menuNameEl.textContent = editName.value;
  // ensure global sync as well
  try { syncSidebarDisplayName(); } catch(e) { /* noop */ }
    });
    editProfileImg?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = ev => { if (previewProfileImg) previewProfileImg.src = ev.target.result; };
      r.readAsDataURL(file);
    });

    // Preenche nome/email iniciais
    const userEmail = localStorage.getItem('userEmail');
    const userName = localStorage.getItem('userName');
    // Prefer the registered full name stored in the users object (if present),
    // fall back to localStorage.userName or the email prefix.
    let displayName = '';
    try {
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (userEmail && users[userEmail] && users[userEmail].name) displayName = users[userEmail].name;
    } catch (e) { /* ignore parse errors */ }
    if (!displayName) displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Usuário');
    if (profileEmail && userEmail) profileEmail.textContent = userEmail;
    if (profileName) profileName.textContent = displayName;
    // Avatar e nome do modal de perfil
    if (userProfileImg) {
      const saved = localStorage.getItem('userProfileImg');
      if (saved) userProfileImg.src = saved;
      else userProfileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00d4ff&color=fff`;
    }
    // Sincroniza também o menu lateral (avatar + nome)
    if (userMenu) {
      const menuImg = userMenu.querySelector('img');
      // Prefer the explicit link with id 'openProfilePage', otherwise try class or span
      const menuNameEl = userMenu.querySelector('#openProfilePage') || userMenu.querySelector('a.user-name-link') || userMenu.querySelector('span');
      if (menuNameEl) menuNameEl.textContent = displayName;
      const saved = localStorage.getItem('userProfileImg');
      const avatarUrl = saved || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00d4ff&color=fff`;
      if (menuImg) menuImg.src = avatarUrl;
      // Make the entire rounded user area clickable to open the full profile page.
      // If the click targets an internal link (<a>), allow the default behavior instead.
      userMenu.addEventListener('click', (ev) => {
        if (ev.target.closest('a')) return;
        window.location.href = 'profile.html';
      });
    }
    // Ensure sidebar shows registered name + avatar in a robust way
    function syncSidebarDisplayName() {
      try {
        const email = localStorage.getItem('userEmail') || '';
        let displayName = '';
        try {
          const users = JSON.parse(localStorage.getItem('users') || '{}');
          if (email && users[email] && users[email].name) displayName = users[email].name;
        } catch (e) { /* ignore */ }
        if (!displayName) displayName = localStorage.getItem('userName') || (email ? email.split('@')[0] : 'Usuário');

        const menuEl = document.getElementById('openProfilePage') || document.querySelector('.user-menu a.user-name-link') || document.querySelector('.user-menu span');
        if (menuEl) menuEl.textContent = displayName;
        const menuImg = document.querySelector('.user-menu img');
        if (menuImg) {
          const saved = localStorage.getItem('userProfileImg');
          menuImg.src = saved || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00d4ff&color=fff`;
          menuImg.alt = displayName;
          menuImg.title = displayName;
        }
      } catch (e) { /* noop */ }
    }
  }

  /* --------------------- VIEW TOGGLE (Dashboard / Placas) --------------------- */
  function bindToggleView() {
    const toggleView = SS.els.toggleView;
    const mini = SS.els.placaMiniSelect || $('placaMiniSelect');
    
    // Inicialmente escondido
    if (mini) {
      mini._open = false;
      mini.style.display = 'none';
    }
    
    if (toggleView) {
      toggleView.style.display = '';
      toggleView.style.pointerEvents = '';
      toggleView.style.opacity = '';
      toggleView.removeAttribute('aria-disabled');
      
      // Limpa handlers antigos e reanexa
      const fresh = toggleView.cloneNode(true);
      toggleView.parentNode.replaceChild(fresh, toggleView);
      SS.els.toggleView = document.getElementById('toggleView');
      
      SS.els.toggleView.addEventListener('click', (e) => {
        e.preventDefault();
        const el = SS.els.placaMiniSelect || $('placaMiniSelect');
        if (!el) return;
        el._open = !el._open;
        el.style.display = el._open ? '' : 'none';
        if (el._open) renderPlacaMiniSelect();
      });
      
      // Fecha ao clicar fora
      document.addEventListener('click', (e) => {
        const el = SS.els.placaMiniSelect || $('placaMiniSelect');
        const btn = SS.els.toggleView;
        if (!el || !el._open) return;
        if (!el.contains(e.target) && !btn.contains(e.target)) {
          el._open = false;
          el.style.display = 'none';
        }
      });
    }
  }

  /* --------------------- INIT --------------------- */
  async function init() {
  if (SS.inited) return;
  SS.inited = true;

  // Bloqueia acesso se não autenticado no backend
  const ok = await requireBackendAuth();
  if (!ok) return;

  cacheElements();
  ensurePanelState();
  if (!SS.panelEvents.length) SS.panelEvents.push({ time: Date.now(), tipo:'sistema', sev:'baixa', desc:'Monitor iniciado' });

  initTheme();
  initTabs();
  initConfigTabs();
  bindForms();
  bindSupport();
  initProfile();
  initTimeFilter();
  // sync sidebar name in case it's still using the placeholder
  try { syncSidebarDisplayName(); } catch(e) { /* noop */ }
  bindToggleView();
  initClock();

  renderPlacas();
  bindPlacaTable(); // Necessário para botões de Editar / Duplicar / Remover
  atualizarCards();

  // Carrega e sincroniza com o Neon (se API estiver rodando)
  loadPlacasFromRemoteIfAny();

  renderAlertas();
  updateSupportBadge();
  updateUserList();
  initCharts();
  seedInitialCharts();
  // Inicializa histórico da simulação
  initSimHistory();
  // Renderiza o gráfico de barras conforme escopo logo após criar os charts
  recomputeDailyBar();

  updateAnalysisKPIs();
  renderAnalysisHeatmap();
  renderAnalysisRanking();
  renderAnalysisTimeline();

  // Ano no rodapé
  const currentYear = new Date().getFullYear();
  if (SS.els.year) SS.els.year.textContent = currentYear;
  if (SS.els.footerYear) SS.els.footerYear.textContent = currentYear;

  startSimulation();
}

  document.addEventListener('DOMContentLoaded', init);

  // Expose para debug opcional
  window.SmartSolar = SS;
  // ...existing code...
  function debounce(fn, ms = 400) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  async function loadPlacasFromRemoteIfAny() {
    try {
      const email = localStorage.getItem('userEmail') || '';
      if (!window.SmartSolarStorage?.isRemote() || !email) return;
      const remote = await window.SmartSolarStorage.fetchPlacas(email);
      if (remote && remote.length) {
        SS.placas = remote.map(p => ({ nome: p.nome, potencia: Number(p.potencia) || 0, status: p.status || 'ativa' }));
        ensurePanelState();
        renderPlacas();
        atualizarCards();
        if (typeof updatePlacasDoughnut === 'function') updatePlacasDoughnut();
      }
      // Prefer registered name in local users storage when available
      let name = 'Usuário';
      try {
        const users = JSON.parse(localStorage.getItem('users') || '{}');
        name = (email && users[email] && users[email].name) ? users[email].name : (localStorage.getItem('userName') || 'Usuário');
      } catch (e) { name = localStorage.getItem('userName') || 'Usuário'; }
      window.SmartSolarStorage.ensureUser(email, name);
    } catch (e) {
      console.warn('Falha ao carregar placas remotas:', e.message);
    }
  }

  const syncPlacasRemoteDebounced = debounce(async () => {
    try {
      const email = localStorage.getItem('userEmail') || '';
      if (!window.SmartSolarStorage?.isRemote() || !email) return;
      await window.SmartSolarStorage.syncPlacas(email, SS.placas);
    } catch (e) {
      console.warn('Falha ao sincronizar placas remotas:', e.message);
    }
  }, 600);

})();