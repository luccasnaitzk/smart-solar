# SmartSolar — Documentação Completa

SmartSolar é uma aplicação web para monitoramento e gestão de um sistema fotovoltaico, com foco em usabilidade, visual moderno e integração opcional a uma API backend (PHP/MySQL) que persiste dados como usuários, placas, relatórios e tickets.

Esta documentação apresenta: visão geral, objetivos do projeto, estrutura das páginas (landing e internas), funcionalidades detalhadas do dashboard, autenticação e recuperação de acesso, API backend, e instruções de desenvolvimento/execução em ambiente local.

## Objetivo do Projeto

- Fornecer uma interface simples e eficiente para visualizar geração e consumo de energia, KPIs e gráficos em tempo real.
- Permitir cadastro e gestão de placas solares (CRUD), estados operacionais (Ativa, Inativa, Manutenção) e compartilhamento futuro.
- Organizar relatórios (simulados e/ou persistidos no backend) com filtros, exportação e histórico.
- Gerenciar usuários, convites e permissões (admin/visualizador) com fluxo de autenticação e recuperação de acesso.
- Facilitar suporte via tickets (privados e públicos) e fornecer informações climáticas para contextualizar a operação.

---

## Visão Geral da Aplicação

- Frontend: HTML/CSS/JS com Chart.js, estilo moderno dark/light, componentes reusáveis, e estado local via `localStorage`.
- Backend (opcional): PHP + MySQL com endpoints REST em `api/` para usuários, placas, relatórios, tickets, convites e autenticação.
- Modo Offline: quando a API não é detectada, o app funciona com dados locais (útil para testes/demonstrações). Quando a API está disponível, o app sincroniza e persiste.

Estrutura do repositório (resumo):
- `index.html` e páginas de conteúdo (landing, curiosidades, instalação/suporte, projeto, monitoramento, etc.)
- `dashboard.html`: painel principal com KPIs, gráficos e seções de navegação lateral
- `auth.html` / `register.html`: autenticação e cadastro
- `api/`: endpoints PHP (auth, users, placas, relatorios, tickets, invites)
- `src/scripts/`: JavaScript modular (dashboard, auth, remote, etc.)
- `src/styles/`: CSS por páginas e componentes
- `tools/`: scripts auxiliares (setup dev, sync XAMPP)

---

## Páginas Públicas e Estrutura Geral

### Landing Page (Página Inicial)
- Apresenta a marca SmartSolar, navegação, e links para páginas de informações.
- Conteúdos típicos: visão do projeto, chamadas para cadastro/entrar, destaque visual.

### Páginas de Conteúdo
- `projeto-smartsolar.html`: contexto e objetivos do projeto.
- `instalacao-suporte.html`: instruções, suporte, diferenciais.
- `monitoramento-inteligente.html`: explicação da lógica de monitoramento e benefícios.
- `curiosidade.html`: curiosidades sobre energia solar.
- Todas seguem o tema visual consistente e navegação comum.

### Autenticação
- `auth.html`: página de Login com visual “glass”, campos de e-mail/senha, lembrar-me, e link para recuperação de acesso.
- `register.html`: cadastro com validações (nome/email/senha/termos). Quando a API remota está disponível, cria usuário no backend e já configura role.
- Recuperação de acesso (Esqueci a senha): modal moderno com envio de código por e-mail/SMS (via backend), barra de progresso e redefinição de senha.

---

## Dashboard — Estrutura e Funcionalidades

### Navegação Lateral (Sidebar)
- Seções: Dashboard, Monitoramento, Clima, Relatórios, Placas, Usuários, Configurações.
- Avatar/Perfil e botão de logout.

### Cabeçalho
- Título da página, tempo real (relógio), badge de papel (Administrador/Visualizador), tema (claro/escuro) e condições climáticas (ícone, temperatura e umidade) obtidas da API Open‑Meteo.

### Dashboard Geral
- KPIs: Geração Atual, Consumo Atual, Energia (dia/semana/mês), Economia (dia/semana/mês).
- Gráficos:
  - Potência Instantânea (gauge/valor principal)
  - Geração vs Consumo (linha)
  - Produção (barra: hoje/semana/mês conforme filtro)
  - Status das Placas (pizza)
- Filtro de tempo: Hoje/Semana/Mês, atualiza KPIs e gráfico de barras.
- Seletor rápido de placas (placaMiniSelect): alterna entre visão geral e uma placa específica.

### Monitoramento em Tempo Real
- Gráfico de linha com amostras a cada “tick” (simulação controlada ou integrada futuramente a dados de telemetria).
- Detalhes operacionais (tensão, corrente, frequência, temperatura etc. — valores simulados para demonstração).

### Clima
- Previsão atual (ícones e dados) e radiação solar estimada.
- Previsão para amanhã (texto e mín/máx).

### Relatórios
- Filtros: período (início/fim) e tipo (todos/geração/consumo/economia) com “chips” e auto‑aplicação.
- Geração de relatórios simulados renderizados em tabela e exportação CSV.
- Persistência no backend (`api/relatorios/create.php`) com validações de período (sem datas futuras, início ≤ fim). Em caso de erro, o frontend ajusta datas automaticamente e reenvia.

### Placas (CRUD)
- Formulário de cadastro (nome, potência, status). Somente administradores podem cadastrar/editar/remover.
- Tabela: ID do cliente (owner), proprietário (avatar, e‑mail), nome, potência e status.
- Duplicar/Editar/Remover.
- Lógica de geração simula apenas para placas com status “Ativa” (Inativa/Manutenção não geram). O gráfico de pizza reflete contagem por status.

### Usuários
- Lista gerenciável de usuários (apenas adicionados na sessão), busca por nome/e‑mail.
- Modal para adicionar usuário com definição de `role` (admin/viewer).
- Convites: gerar token/link e enviar por e‑mail (API de convites), com atalhos de cópia/abertura.

### Configurações
- Sistema: capacidade total (kWp) e tarifa (R$/kWh), limites de operação (mínimo/variação).
- Aparência: tema claro/escuro; idioma (pt/en).
- Dados: backup/restauração (exporta preferências e dados do sistema).

### Tickets
- Botão flutuante (FAB) para abrir chamado.
- Integração com endpoints de tickets e “public tickets” (para suporte fora do login).

---

## Autenticação e Recuperação de Acesso (Frontend/Backend)

### Frontend (auth.js)
- Login/Registro: fluxo local (offline) e remoto (quando API está ativa). Redireciona para `dashboard.html` após sucesso.
- Recuperar acesso: modal `fp-card` com etapas — inserir e‑mail/telefone, receber código, redefinir senha. UI com barra de progresso e botões com ícones e estados de carregamento.

### Backend (PHP)
- `api/auth/login.php`: autentica e retorna JSON com dados do usuário e `role`.
- `api/auth/register.php`: registra usuário e define role padrão como `admin` (por exigência do projeto atual), retornando `role`.
- `api/auth/request_reset.php`: cria código de 6 dígitos com expiração (15 minutos), salva em `users.password_reset_token/password_reset_expires`, e envia por e‑mail (SendGrid/Mailgun/`mail()`/fallback .eml) ou SMS (Twilio). Em dev/local, retorna `dev_code` para testes.
- `api/auth/reset_password.php`: valida código/expiração e atualiza `password_hash`.

---

## API Backend — Endpoints Principais

- `api/users/get.php`: obtém usuário e papel; pode ajustar role para `admin` conforme regra do projeto.
- `api/users/set_role.php`: define papel de outro usuário (requer admin).
- `api/placas/list.php`: lista placas do usuário e compartilhadas.
- `api/placas/sync.php`: sincroniza placas (admin).
- `api/relatorios/create.php`: cria relatório validando período (sem futuro, início ≤ fim), armazena dados.
- `api/tickets/*`: CRUD de tickets.
- `api/invites/create.php`: cria convite com token, role, expiração.
- `api/lib/notify.php`: utilitários de envio de e‑mail/SMS, incluindo fallback em dev que grava `.eml` em `api/tmp_mails`.

Banco (MySQL): ver `api/schema.sql` para criação de tabelas (`users`, `placas`, `relatorios`, `tickets`, `public_tickets`, `user_roles`, `invites`, `user_shares`). Inclui colunas de reset de senha.

---

## Estado e Comportamentos Especiais

- `localStorage`: usado para armazenar sessão, nome, role, preferências de tema/escopo temporal, lista local de usuários gerenciados e dados para modo offline.
- Role `admin` priorizada no frontend (evita rebaixamento visual se backend reportar `viewer`). Badge e permissões aplicadas.
- Simulação: atualiza KPIs/gráficos a cada “tick”; se placa não estiver “Ativa”, não gera.
- Relatórios: auto‑aplicação ao escolher o tipo; normalização de datas para evitar erros do backend.

---

## Desenvolvimento Local (Windows/PowerShell)

### Requisitos
- XAMPP (Apache + PHP + MySQL) ou servidor PHP equivalente.
- Chrome/Edge para executar o frontend (arquivos locais com ou sem servidor HTTP).

### Passos
1. Importe/execute `api/schema.sql` no MySQL.
2. Configurar servidor: sirva o diretório `smart-solar` sob `http://localhost/smart-solar` (ou ajuste `src/scripts/remote.js` para auto‑detecção).
3. Opcional: configurar e‑mail/SMS em produção (SendGrid/Mailgun/Twilio). Em dev, use o fallback `.eml`.
4. Utilize o script `tools/setup-dev-email.ps1` para preparar o ambiente local:

```powershell
cd "C:\Users\lucca\OneDrive\Desktop\smart-solar\tools"
# Apenas fallback .eml
./setup-dev-email.ps1 -EmailFrom "no-reply@smartsolar.local" -EmailFromName "SmartSolar" -TestEmail "voce@exemplo.com"

# SendGrid real
./setup-dev-email.ps1 -SendGridKey "SG.SUA_CHAVE" -EmailFrom "no-reply@seu-dominio.com" -EmailFromName "SmartSolar" -TestEmail "voce@exemplo.com"
```

5. Reinicie o Apache/PHP para carregar variáveis de ambiente.
6. Abra `auth.html` para testar login/recuperação; acesse `dashboard.html` após logar.

---

## Notas de UX/Estilo

- Tema visual moderno, com gradientes e “glass” no auth.
- Alertas estilizados com fechamento automático.
- Seletores e dropdowns com contraste melhorado em dark mode.
- mini‑seletor de placas com busca, animação e estado ativo.

---

## Roadmap (Ideias Futuras)

- Integração com medidores/inversores reais para dados de geração/consumo.
- Compartilhamento entre usuários com granularidade de permissões.
- Histórico completo de relatórios e comparativos.
- Notificações push/e‑mail em eventos operacionais.
- Internacionalização ampliada e acessibilidade (a11y) refinada.

---

## Licença

Uso interno/educacional, sem licença explícita. Consulte o autor do repositório para termos de uso e distribuição.
