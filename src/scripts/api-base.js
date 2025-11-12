// Força o uso da API do XAMPP em localhost e ativa modo remoto
// Ajuste se necessário o caminho base
window.API_BASE = 'http://localhost/smartsolar/api';
try { localStorage.setItem('useRemoteAPI','true'); } catch {}
