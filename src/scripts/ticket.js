// Floating Ticket Widget logic
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const launcher = document.getElementById('ticketLauncher');
    const widget = document.getElementById('ticketWidget');
    const closeBtn = widget ? widget.querySelector('.ticket-close') : null;
    const cancelBtn = widget ? widget.querySelector('.ticket-cancel') : null;
    const form = document.getElementById('ticketForm');
    const protocolBox = document.getElementById('ticketProtocol');

    function openWidget(){
      if (!widget) return;
      widget.classList.add('open');
      widget.setAttribute('aria-hidden', 'false');
    }
    function closeWidget(){
      if (!widget) return;
      widget.classList.remove('open');
      widget.setAttribute('aria-hidden', 'true');
    }

    // Openers: launcher + any .open-ticket link
    if (launcher) launcher.addEventListener('click', openWidget);
    document.querySelectorAll('.open-ticket').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = el.getAttribute('data-ticket-category');
        openWidget();
        if (cat) {
          const sel = document.getElementById('ticketCategory');
          if (sel) sel.value = cat;
        }
      });
    });

    // Close controls
    if (closeBtn) closeBtn.addEventListener('click', closeWidget);
    if (cancelBtn) cancelBtn.addEventListener('click', closeWidget);

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeWidget();
    });

    // Submit: cria ticket público (API public_tickets se disponível; não mistura com tickets do dashboard)
    if (form) {
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const name = document.getElementById('ticketName').value.trim();
        const email = document.getElementById('ticketEmail').value.trim();
        const category = document.getElementById('ticketCategory').value;
        const message = document.getElementById('ticketMessage').value.trim();

        if (!name || !email || !category || !message) {
          if (protocolBox) { protocolBox.hidden = false; protocolBox.textContent = 'Preencha todos os campos para gerar o protocolo.'; }
          return;
        }

        const ts = new Date();
        const submitBtn = form.querySelector('button[type="submit"]');
        const prevBtnHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...'; }

        const genProto = () => `PT-${ts.getTime()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        const showProto = (proto) => {
          if (protocolBox) { protocolBox.hidden = false; protocolBox.textContent = `Protocolo gerado: ${proto}`; }
        };
        const saveLocal = (proto) => {
          const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
          tickets.push({ code: proto, name, email, category, message, createdAt: ts.toISOString(), status: 'aberto' });
          localStorage.setItem('tickets', JSON.stringify(tickets));
        };
        const finish = () => {
          form.reset();
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = prevBtnHtml; }
        };

        // Gera protocolo imediatamente para melhor UX
        let localProto = genProto();
        saveLocal(localProto);
        showProto(localProto);

        // Tenta registrar no backend em background; se houver protocolo oficial, atualiza exibição
        if (window.SmartSolarStorage?.isRemote && window.SmartSolarStorage.isRemote()) {
          window.SmartSolarStorage.createPublicTicket({ nome: name, email, categoria: category, mensagem: message })
            .then(res => {
              if (res && res.protocolo) {
                localProto = res.protocolo;
                showProto(localProto);
              } else if (res && res.error) {
                try { console.warn('[Ticket] Erro backend:', res.error); } catch {}
              }
            })
            .catch(err => { try { console.warn('[Ticket] Falha ao enviar ao backend:', err); } catch {} })
            .finally(() => finish());
          return;
        }

        // Sem backend
        finish();
      });
    }
  });
})();
