// register.js - Script específico para a página de registro
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    // Função para mostrar mensagens
    const showMessage = (message, type = 'info') => {
        // Remove mensagens existentes
        const existingMessages = document.querySelectorAll('.auth-message');
        existingMessages.forEach(msg => msg.remove());
        
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message auth-message-${type}`;
        messageEl.innerHTML = `
            <div class="auth-message-content">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Adiciona antes do formulário
        const authContent = document.querySelector('.auth-content');
        if (authContent) {
            authContent.insertBefore(messageEl, authContent.firstChild);
        }
        
        // Auto-remove mensagens de sucesso/info após 5 segundos
        if (type !== 'error') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.style.opacity = '0';
                    messageEl.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => messageEl.remove(), 300);
                }
            }, 5000);
        }
    };

    // Adiciona estilos para as mensagens
    if (!document.querySelector('#auth-message-styles')) {
        const style = document.createElement('style');
        style.id = 'auth-message-styles';
        style.textContent = `
            .auth-message {
                padding: 12px 16px;
                margin: 0 0 16px 0;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                animation: slideDown 0.3s ease;
            }
            .auth-message-error {
                background: rgba(244, 67, 54, 0.1);
                border: 1px solid rgba(244, 67, 54, 0.3);
                color: #f44336;
            }
            .auth-message-success {
                background: rgba(76, 175, 80, 0.1);
                border: 1px solid rgba(76, 175, 80, 0.3);
                color: #4caf50;
            }
            .auth-message-info {
                background: rgba(33, 150, 243, 0.1);
                border: 1px solid rgba(33, 150, 243, 0.3);
                color: #2196f3;
            }
            .auth-message-content {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Submit do formulário de cadastro
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const cpf = (document.getElementById('registerCPF')?.value || '').trim();
            const phone = (document.getElementById('registerPhone')?.value || '').trim();
            const city = (document.getElementById('registerCity')?.value || '').trim();
            const state = (document.getElementById('registerState')?.value || '').trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            // Validações
            if (!name || !email || !password || !confirmPassword) {
                showMessage('Por favor, preencha todos os campos.', 'error');
                return;
            }

            // Validações adicionais: CPF e telefone (se informados devem ter formato mínimo)
            const cpfDigits = cpf.replace(/\D/g,'');
            if (cpf && cpfDigits.length !== 11) {
                showMessage('CPF inválido. Informe 11 dígitos.', 'error');
                return;
            }
            const phoneDigits = phone.replace(/\D/g,'');
            if (phone && !(phoneDigits.length === 10 || phoneDigits.length === 11)) {
                showMessage('Telefone inválido. Informe DDD + número (10 ou 11 dígitos).', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem.', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
                return;
            }
            
            if (!document.getElementById('acceptTerms').checked) {
                showMessage('Você precisa aceitar os termos de uso.', 'error');
                return;
            }

            // Verificar se email já existe (armazenamento local)
            const users = getUsersObj();
            if (users[email]) {
                showMessage('Este e-mail já está cadastrado. Faça login ou use outro e-mail.', 'error');
                return;
            }
            
            // Feedback visual: carregando
            const submitBtn = registerForm.querySelector('.btn-full');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
            submitBtn.disabled = true;
            
            // Try remote registration if API is available; otherwise fallback to local storage
            (async function doRegister() {
                // Helper: wait until remote detection is finished (or timeout)
                const waitForApiReady = (timeout = 2000) => new Promise(resolve => {
                    const start = Date.now();
                    (function check() {
                        if (window.API_READY) return resolve(true);
                        if (Date.now() - start > timeout) return resolve(false);
                        setTimeout(check, 50);
                    })();
                });

                const apiReady = await waitForApiReady(2000);
                const useRemote = apiReady && !!window.API_BASE;

                if (useRemote) {
                    try {
                        const res = await fetch(`${window.API_BASE}/auth/register.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, email, password, cpf: cpf || '', phone: phone || '', city: city || '', state: state || '' })
                        });

                        if (res.status === 409) {
                            // Email already exists remotely
                            submitBtn.innerHTML = originalText;
                            submitBtn.disabled = false;
                            showMessage('Este e-mail já está cadastrado (servidor). Faça login ou use outro e-mail.', 'error');
                            return;
                        }

                        if (!res.ok) throw new Error('Erro ao comunicar com o servidor.');

                        const j = await res.json().catch(()=>null);
                        if (j && j.user) {
                            // Successful remote registration
                            localStorage.setItem('userLoggedIn', 'true');
                            localStorage.setItem('userEmail', email);
                            localStorage.setItem('userName', name);
                            // Inicializa acesso atual; último acesso permanece vazio no primeiro login
                            try { localStorage.setItem('userCurrentAccess', new Date().toISOString()); } catch {}

                            // Keep additional profile fields locally for client features
                            users[email] = { name, password, cpf: cpf || '', phone: phone || '', city: city || '', state: state || '' };
                            setUsersObj(users);

                            // Do not create default placas for new users. Keep initial
                            // set empty so the user must add placas manually.
                            try {
                                const defaultPlacas = [];
                                if (window.SmartSolarStorage && typeof window.SmartSolarStorage.syncPlacas === 'function') {
                                    await window.SmartSolarStorage.syncPlacas(email, defaultPlacas);
                                } else {
                                    // fallback: try direct fetch (send empty array)
                                    await fetch(`${window.API_BASE}/placas/sync.php`, {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email, placas: defaultPlacas })
                                    });
                                }
                            } catch (e) {
                                console.warn('Falha ao sincronizar placas iniciais (opcional):', e);
                            }

                            submitBtn.innerHTML = originalText;
                            submitBtn.disabled = false;

                            showMessage('Cadastro realizado com sucesso! Redirecionando...', 'success');
                            setTimeout(() => window.location.href = 'dashboard.html', 1200);
                            return;
                        }
                        // unexpected response: fallback to local
                    } catch (err) {
                        // network/server error: fallback to local registration below
                        console.warn('Remote register failed, falling back to local:', err);
                    }
                }

                // Local fallback registration (keeps previous behavior)
                setTimeout(() => {
                    localStorage.setItem('userLoggedIn', 'true');
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('userName', name);

                    // Salva usuário com campos adicionais
                    users[email] = { name, password, cpf: cpf || '', phone: phone || '', city: city || '', state: state || '' };
                    setUsersObj(users);

                    // Atualiza último acesso
                    try { localStorage.setItem('userCurrentAccess', new Date().toISOString()); } catch {}

                    // Restaura botão
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;

                    showMessage('Cadastro realizado localmente! Redirecionando...', 'success');

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 800);
                }, 600);
            })();
        });
    }
    
    // Helpers para users
    function getUsersObj() {
        try { 
            return JSON.parse(localStorage.getItem('users') || '{}'); 
        } catch { 
            return {}; 
        }
    }
    
    function setUsersObj(obj) {
        localStorage.setItem('users', JSON.stringify(obj || {}));
    }
});