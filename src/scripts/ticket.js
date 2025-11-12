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

    // Submit: simulate ticket creation and generate protocol
    if (form) {
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const name = document.getElementById('ticketName').value.trim();
        const email = document.getElementById('ticketEmail').value.trim();
        const category = document.getElementById('ticketCategory').value;
        const message = document.getElementById('ticketMessage').value.trim();

        if (!name || !email || !category || !message) return;

        // Generate simple protocol code
        const ts = new Date();
        const code = `SS-${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${ts.getHours()}${ts.getMinutes()}${ts.getSeconds()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

        // Persist minimal ticket to localStorage (no backend)
        const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
        tickets.push({ code, name, email, category, message, createdAt: ts.toISOString(), status: 'aberto' });
        localStorage.setItem('tickets', JSON.stringify(tickets));

        // Show protocol and reset
        if (protocolBox) {
          protocolBox.hidden = false;
          protocolBox.textContent = `Protocolo gerado: ${code}`;
        }
        form.reset();
      });
    }
  });
})();
