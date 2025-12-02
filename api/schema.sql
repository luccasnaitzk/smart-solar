-- SmartSolar basic schema for XAMPP/MySQL
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  cpf VARCHAR(30) DEFAULT '',
  phone VARCHAR(40) DEFAULT '',
  city VARCHAR(120) DEFAULT '',
  state VARCHAR(8) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS placas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  potencia DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('Ativa','Inativa','Manutenção') NOT NULL DEFAULT 'Ativa',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  nivel VARCHAR(60) NOT NULL,
  email VARCHAR(160) NOT NULL,
  descricao TEXT,
  protocolo VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ALERTS table removida (não utilizada). Drop para bases existentes.
DROP TABLE IF EXISTS alerts;

-- User management (roles/perfis) — controla quem é admin/visualizador no app
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('viewer','admin') NOT NULL DEFAULT 'viewer',
  added_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_user_roles_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- If you're applying this to an existing database, try to add missing columns safely
-- (MySQL 8+ supports IF NOT EXISTS on ADD COLUMN; if unsupported, run carefully)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(30) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(120) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(8) DEFAULT ''; 
-- Password reset support
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires DATETIME DEFAULT NULL;

-- Relatórios gerados pelo usuário (armazenamento de conteúdo e metadados)
CREATE TABLE IF NOT EXISTS relatorios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  tipo VARCHAR(60) NOT NULL DEFAULT 'geral',
  status ENUM('rascunho','gerado','enviado','arquivado') NOT NULL DEFAULT 'rascunho',
  periodo_inicio DATE DEFAULT NULL,
  periodo_fim DATE DEFAULT NULL,
  corpo LONGTEXT NULL,
  dados_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tickets públicos (homepage) sem vínculo ao usuário logado
CREATE TABLE IF NOT EXISTS public_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  categoria VARCHAR(60) NOT NULL,
  mensagem TEXT NOT NULL,
  protocolo VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_public_tickets_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Convites e compartilhamento de placas
CREATE TABLE IF NOT EXISTS invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  owner_id INT NOT NULL,
  role ENUM('viewer','admin') NOT NULL DEFAULT 'viewer',
  expires_at DATETIME DEFAULT NULL,
  used_by INT DEFAULT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  viewer_id INT NOT NULL,
  role ENUM('viewer','admin') NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_shares (owner_id, viewer_id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;