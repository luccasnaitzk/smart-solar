# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

Formato baseado em Keep a Changelog e em SemVer (quando aplicável).

## [Unreleased]
- Em andamento

## [2025-10-16]
### Adicionado
- Backend PHP (XAMPP): endpoints `api/auth/register.php`, `api/auth/login.php`, `api/placas/list.php`, `api/placas/sync.php`, `api/users/get.php` e `api/config.php` com CORS básico.
- Utilitários: `api/ping.php` (healthcheck) e `api/install.php` (instala schema automaticamente a partir de `api/schema.sql`).
- Front: `src/scripts/remote.js` (adapter + autodetecção) e `src/scripts/api-base.js` (força API_BASE e modo remoto por padrão).
- UI: badge de status na `auth.html` mostrando “API ON • DB OK” ou estado de erro.

### Alterado
- `auth.html`, `dashboard.html`, `index.html`: ordem de scripts ajustada para garantir API_BASE antes do restante.
- `src/scripts/auth.js`: autenticação estrita via API; remoção do fallback local quando API está disponível; verificação de sessão no backend antes de redirecionar.
- `src/scripts/dashboard.js`: gate de acesso ao dashboard validando usuário no banco (via `/api/users/get.php`).
- `README.md`: instruções de XAMPP/phpMyAdmin e uso do API_BASE.

### Corrigido
- Bloqueado bypass para o dashboard com e-mail não cadastrado (sem depender apenas de localStorage).

## [2025-09-22]
### Adicionado
- Home: prévia do Dashboard no slide “Monitoramento em tempo real” usando moldura de navegador (mock-browser) e nova imagem `src/images/dashboard-hero.png`.
- Serviços: card "Monitoramento Inteligente" atualizado para usar a imagem do dashboard (com fallback).
- Página Monitoramento Inteligente: mesma moldura de navegador aplicada à imagem principal; cantos arredondados e sombra.
- Suporte (dashboard): indicador de status "Online" no cabeçalho do painel e ênfase de ação primária em "Abrir chamado"; textos do painel com i18n (pt/en).
- Autenticação: fluxo completo de “Esqueci a senha” via modal (e-mail → código → nova senha), com validação e persistência local em `localStorage`.

### Alterado
- Ajustes visuais em `styles.css` para suportar a moldura mock-browser, barra de endereço e responsividade.
- `index.html`: imagens e estrutura do slide de herói atualizadas.
- `monitoramento-inteligente.html`: imagem substituída e envolta na moldura.
- `src/scripts/dashboard.js`: melhorias de UX no painel de suporte e i18n.

### Corrigido
- Evitado corte na prévia do dashboard na home (hero-media agora adapta altura quando usa mock-browser).

