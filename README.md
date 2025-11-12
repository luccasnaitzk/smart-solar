# ✅ Projeto SmartSolar

O projeto SmartSolar torna a energia solar mais acessível e inteligente, usando tecnologia avançada e monitoramento em tempo real. Ele oferece controle total da produção e consumo, análise preditiva para economia e contribui para um futuro sustentável.

## 🚀 Tecnologias Utilizadas

✅ - **HTML** 
✅ - **CSS** 
✅ - **JavaScript** 

## 📦 Changelog

Consulte o arquivo [`CHANGELOG.md`](CHANGELOG.md) para ver a lista de mudanças recentes.

## 🔌 Integração com XAMPP + MySQL (phpMyAdmin)

Para ligar o site ao banco de dados local via PHP:

1) Copie a pasta `api/` para o htdocs do XAMPP ou sirva o projeto inteiro via `http://localhost/smartsolar/`.

2) Crie o banco e tabelas:
    - Acesse `http://localhost/phpmyadmin`
    - Crie o banco `smartsolar`
    - Importe o arquivo `api/schema.sql`

3) Ajuste o caminho da API se necessário:
    - O front usa `window.API_BASE` definido em `src/scripts/remote.js` (padrão: `http://localhost/smartsolar/api`).
    - Se você servir a API em outro caminho, altere essa linha.

4) Teste:
    - Abra `auth.html`, faça cadastro/login.
    - Acesse `dashboard.html` e cadastre/edite placas. Os dados serão sincronizados nas tabelas MySQL.

Notas:
- Endpoints usados: `api/auth/register.php`, `api/auth/login.php`, `api/placas/list.php`, `api/placas/sync.php`, `api/users/get.php`.
- `api/config.php` inclui CORS básico para facilitar desenvolvimento local.
