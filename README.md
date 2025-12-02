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
- A antiga tabela `alerts` foi removida do schema (não utilizada). Caso exista em bancos antigos, será descartada automaticamente pelo `DROP TABLE IF EXISTS alerts;` presente em `schema.sql`.
- `api/config.php` inclui CORS básico para facilitar desenvolvimento local.

## 📝 Relatórios (API)

Foi adicionada a tabela `relatorios` ao schema e endpoints para criar, listar, obter, atualizar e excluir relatórios por usuário (identificado por `email`).

Se você já possuía o banco criado antes desta mudança, aplique o novo schema acessando no navegador:

`http://localhost/smartsolar/api/install.php`

Isso executa o `schema.sql` e cria a tabela se ainda não existir.

### Endpoints

- `POST /api/relatorios/create.php`
    - Corpo: `{ email, titulo, tipo?, status?, periodo_inicio?, periodo_fim?, corpo?, dados? }`
    - Retorna: `{ ok: true, id }`

- `POST /api/relatorios/list.php`
    - Corpo: `{ email, tipo?, status?, limit?, offset?, from?, to? }`
    - Retorna: `{ relatorios: [], total, limit, offset }`

- `POST /api/relatorios/get.php`
    - Corpo: `{ email, id }`
    - Retorna: `{ relatorio: { ... } }`

- `POST /api/relatorios/update.php`
    - Corpo: `{ email, id, titulo?, tipo?, status?, periodo_inicio?, periodo_fim?, corpo?, dados? }`
    - Retorna: `{ ok: true }`

- `POST /api/relatorios/delete.php`
    - Corpo: `{ email, id }`
    - Retorna: `{ ok: true }`

Observações:
- `status` permitido: `rascunho`, `gerado`, `enviado`, `arquivado` (padrão: `rascunho`).
- `dados` pode ser objeto/array que é salvo como JSON (ou string JSON já pronta).
 - Datas: o backend bloqueia datas futuras e exige que `periodo_inicio` <= `periodo_fim`.

### Exemplos cURL

Criar um relatório:

```powershell
curl -X POST "http://localhost/smartsolar/api/relatorios/create.php" `
    -H "Content-Type: application/json" `
    -d '{
        "email":"usuario@exemplo.com",
        "titulo":"Relatório Mensal",
        "tipo":"mensal",
        "status":"gerado",
        "periodo_inicio":"2025-10-01",
        "periodo_fim":"2025-10-31",
        "dados": { "producao_kwh": 1234.56 }
    }'
```

Listar relatórios:

```powershell
curl -X POST "http://localhost/smartsolar/api/relatorios/list.php" `
    -H "Content-Type: application/json" `
    -d '{ "email":"usuario@exemplo.com", "status":"gerado", "limit":20, "offset":0 }'
```

Obter um relatório:

```powershell
curl -X POST "http://localhost/smartsolar/api/relatorios/get.php" `
    -H "Content-Type: application/json" `
    -d '{ "email":"usuario@exemplo.com", "id": 1 }'
```

Atualizar um relatório:

```powershell
curl -X POST "http://localhost/smartsolar/api/relatorios/update.php" `
    -H "Content-Type: application/json" `
    -d '{ "email":"usuario@exemplo.com", "id": 1, "status":"enviado" }'
```

Excluir um relatório:

```powershell
curl -X POST "http://localhost/smartsolar/api/relatorios/delete.php" `
    -H "Content-Type: application/json" `
    -d '{ "email":"usuario@exemplo.com", "id": 1 }'
```

## 🎫 Tickets (API)

Para sincronizar os tickets entre a Home, Dashboard e Banco:

- `POST /api/tickets/create.php` — cria ticket
    - Corpo: `{ email, titulo, tipo, nivel, descricao? }`
    - Retorna: `{ ok: true, id, protocolo }`

- `POST /api/tickets/list.php` — lista tickets do usuário
    - Corpo: `{ email }`
    - Retorna: `{ tickets: [ { protocolo, titulo, tipo, nivel, email, descricao, created_at } ] }`

- `POST /api/tickets/get.php` — obtém um ticket por protocolo
    - Corpo: `{ email, protocolo }`
    - Retorna: `{ ticket: { ... } }`

### Tipos de Tickets

Há agora dois fluxos separados:

- Tickets do Dashboard (autenticados): usam `api/tickets/*` e vinculam ao usuário logado.
- Tickets Públicos (Homepage/Contato): usam `api/public_tickets/*` e não requerem login.

### Endpoints Públicos
- `POST /api/public_tickets/create.php` – cria ticket público `{ nome, email, categoria, mensagem }` → `{ ok, protocolo }`
- `POST /api/public_tickets/list.php` – lista tickets públicos de um email `{ email }` → `{ tickets: [...] }`

### Integração Frontend
- Widget de ticket na Home (`src/scripts/ticket.js`): agora usa `public_tickets` (protocolo prefixo `PT-`). Mantém cópia local para offline.
- Modal de ticket no Dashboard (`src/scripts/dashboard.js`): continua usando tickets autenticados (`SS-` protocolos) via `api/tickets/create.php`.
- Página `meus-tickets.html`: exibe tickets autenticados do usuário (não mistura com públicos). Você pode adaptar para mostrar também públicos se desejar.

## ✉️ Recuperação de Senha (E-mail/SMS)

Fluxo:
- `POST /api/auth/request_reset.php` recebe `{ email? , phone? }` (precisa de ao menos um) e gera código de 6 dígitos válido por 15 minutos.
- `POST /api/auth/reset_password.php` recebe `{ email, code, password }` e atualiza a senha.

Ambiente de envio:
- Configure um provedor: `SENDGRID_API_KEY` (SendGrid) ou `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` (Mailgun).
- SMS opcional via Twilio: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`.
- Remetente customizado: `SMTP_FROM`, `SMTP_FROM_NAME`.
- Modo desenvolvimento: definir `APP_ENV=dev` ou criar diretório `api/tmp_mails/` (os e-mails são gravados como arquivos .eml). Também é possível usar `DEV_EMAIL_DIR` para apontar outro local.

Fallback Dev:
- Se nenhum provedor estiver configurado e o ambiente for dev, a API retorna `dev_code` dentro da resposta JSON para facilitar testes.
- Em produção sem provedor configurado, retornará erro 500 e não mostrará o código (segurança).

Exemplo (PowerShell):
```powershell
curl -X POST "http://localhost/smartsolar/api/auth/request_reset.php" `
    -H "Content-Type: application/json" `
    -d '{ "email": "usuario@exemplo.com" }'
```

Resposta esperada em dev:
```json
{ "ok": true, "via": "dev", "email": "usuario@exemplo.com", "expires": "2025-11-21 15:00:00", "ttl": 900, "dev_code": "123456" }
```

Depois, redefinir:
```powershell
curl -X POST "http://localhost/smartsolar/api/auth/reset_password.php" `
    -H "Content-Type: application/json" `
    -d '{ "email": "usuario@exemplo.com", "code": "123456", "password": "NovaSenhaSegura" }'
```

Se `ok: true`, a senha foi atualizada.

Erros Comuns:
- `Falha ao enviar o código`: falta configurar as variáveis de ambiente ou permissões de saída.
- `Código expirado`: mais de 15 minutos; solicite novamente.
- `Código inválido`: email/código não coincidem ou já foi usado.

## 🔗 Convites e Compartilhamento

Para permitir que um usuário convidado veja as placas do dono:

- Tabelas adicionadas: `invites` e `user_shares`.
- Endpoint: `POST /api/invites/create.php` com `{ email: <dono>, role? ('viewer'|'admin'), ttl_minutes? }` → `{ ok, token }`.
- Registro com convite: `POST /api/auth/register.php` aceita campo opcional `invite` (token). Ao registrar, o backend cria vínculo em `user_shares` e marca o convite como usado.
- Listagem de placas: `api/placas/list.php` agora retorna placas do próprio usuário mais as compartilhadas pelos donos associados.

Frontend:
- `dashboard.js` usa o endpoint de convites ao gerar o link de convite. Fallback local se API indisponível.
- `register.js` extrai `invite` da URL e envia no corpo ao registrar.
