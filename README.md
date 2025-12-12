# ☀️ SmartSolar

### Plataforma Inteligente de Monitoramento e Gestão de Energia Solar

O **SmartSolar** é uma aplicação web focada em tornar a energia solar mais acessível, inteligente e eficiente. A plataforma permite o acompanhamento da produção e consumo energético em tempo real, gestão de placas solares, abertura de tickets de suporte e geração de relatórios, promovendo economia, transparência e sustentabilidade.

---

## 🌍 Sobre o Projeto

O SmartSolar foi desenvolvido com o objetivo de aplicar conceitos práticos de desenvolvimento web e integração com banco de dados, simulando um sistema real de monitoramento energético.

A solução oferece:

* Monitoramento de produção e consumo de energia
* Gestão de placas solares
* Relatórios energéticos personalizados
* Sistema de tickets (público e autenticado)
* Compartilhamento de acesso entre usuários
* Recuperação de senha com e-mail/SMS

O projeto foi estruturado visando **clareza, modularização e fácil manutenção**, sendo ideal para fins acadêmicos, portfólio e evolução futura.

---

## 🎯 Objetivo do Projeto

* Desenvolver uma plataforma web funcional para gerenciamento de energia solar
* Aplicar integração Front-End + Back-End + Banco de Dados
* Simular um ambiente real de uso com autenticação, permissões e relatórios
* Promover boas práticas de desenvolvimento e organização de código

---

## 💡 Principais Funcionalidades

### 👤 Usuários e Autenticação

* Cadastro e login de usuários
* Controle de sessão
* Recuperação de senha via e-mail ou SMS
* Compartilhamento de acesso por convite

### 🔋 Gestão de Placas Solares

* Cadastro, edição e exclusão de placas
* Visualização de produção energética
* Compartilhamento de placas entre usuários

### 📊 Relatórios Energéticos

* Criação, edição e exclusão de relatórios
* Filtros por período, tipo e status
* Armazenamento de dados em JSON
* Status de relatório: rascunho, gerado, enviado e arquivado

### 🎫 Sistema de Tickets

* Tickets autenticados (Dashboard)
* Tickets públicos (Homepage / Contato)
* Protocolo automático (SS- / PT-)
* Histórico completo de atendimentos

### 🔗 Convites e Compartilhamento

* Geração de links de convite
* Controle de permissões (viewer / admin)
* Acesso compartilhado às placas solares

---

## 🚀 Tecnologias Utilizadas

### **Front-End**

* HTML5
* CSS3
* JavaScript (DOM, Fetch API)

### **Back-End**

* PHP (APIs REST)
* MySQL (phpMyAdmin)

### **Ambiente de Desenvolvimento**

* XAMPP
* Apache

---

## ⚙️ Integração com XAMPP + MySQL

### Configuração Inicial

1. Copie a pasta `smartsolar/` para o diretório `htdocs` do XAMPP

2. Crie o banco de dados:

   * Acesse `http://localhost/phpmyadmin`
   * Crie o banco `smartsolar`
   * Importe o arquivo `api/schema.sql`

3. Configure a API Base:

   * Arquivo: `src/scripts/remote.js`
   * Valor padrão:

     ```js
     window.API_BASE = "http://localhost/smartsolar/api";
     ```

4. Execute o instalador (opcional):

   ```
   http://localhost/smartsolar/api/install.php
   ```

---

## 🔌 Endpoints Principais

### 🔐 Autenticação

* `POST /api/auth/register.php`
* `POST /api/auth/login.php`
* `POST /api/auth/request_reset.php`
* `POST /api/auth/reset_password.php`

### 🔋 Placas

* `POST /api/placas/list.php`
* `POST /api/placas/sync.php`

### 📊 Relatórios

* `POST /api/relatorios/create.php`
* `POST /api/relatorios/list.php`
* `POST /api/relatorios/get.php`
* `POST /api/relatorios/update.php`
* `POST /api/relatorios/delete.php`

### 🎫 Tickets

* `POST /api/tickets/create.php`
* `POST /api/tickets/list.php`
* `POST /api/tickets/get.php`

### 🌐 Tickets Públicos

* `POST /api/public_tickets/create.php`
* `POST /api/public_tickets/list.php`

---

## 📂 Estrutura do Projeto

```
smartsolar/
├── api/
│   ├── auth/
│   ├── placas/
│   ├── relatorios/
│   ├── tickets/
│   ├── public_tickets/
│   ├── config.php
│   ├── install.php
│   └── schema.sql
│
├── src/
│   ├── scripts/
│   ├── styles/
│   └── images/
│
├── dashboard.html
├── auth.html
├── meus-tickets.html
└── index.html
```

---

## 🛠️ Boas Práticas e Segurança

* Validação de dados no Front-End e Back-End
* CORS configurado para ambiente local
* Senhas protegidas com hash
* Controle de permissões por usuário
* Organização modular de APIs

---

## 📦 Changelog

As alterações e melhorias do projeto estão documentadas em:

➡️ [`CHANGELOG.md`](CHANGELOG.md)

---

## ✨ Considerações Finais

O **SmartSolar** é um projeto em constante evolução, desenvolvido com foco em aprendizado prático, organização e aplicação de conceitos reais do mercado de tecnologia.

💡 *Energia inteligente para um futuro sustentável.*
