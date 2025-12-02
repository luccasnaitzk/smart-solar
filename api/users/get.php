<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
try {
  $pdo = db();
  // Inclui role do usuário (padrão 'viewer' quando não definido)
  $sql = 'SELECT u.id, u.name, u.email, u.cpf, u.phone, u.city, u.state, u.created_at,
                 COALESCE(r.role, \"viewer\") AS role
          FROM users u
          LEFT JOIN user_roles r ON r.user_id = u.id
          WHERE u.email = ?';
  $stmt = $pdo->prepare($sql);
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['user'=>null]);

  // Regra solicitada: garantir que todo usuário tenha role 'admin'.
  // Se não existir linha em user_roles ou estiver 'viewer', força/atualiza para 'admin'.
  try {
    if (!isset($u['role']) || strtolower($u['role']) !== 'admin') {
      // Verifica se já existe linha para este user_id
      $check = $pdo->prepare('SELECT role FROM user_roles WHERE user_id = ?');
      $check->execute([$u['id']]);
      $existing = $check->fetchColumn();
      if ($existing === false) {
        $ins = $pdo->prepare('INSERT INTO user_roles(user_id, role) VALUES (?,?)');
        $ins->execute([$u['id'], 'admin']);
        $u['role'] = 'admin';
      } elseif (strtolower($existing) !== 'admin') {
        $upd = $pdo->prepare('UPDATE user_roles SET role = ? WHERE user_id = ?');
        $upd->execute(['admin', $u['id']]);
        $u['role'] = 'admin';
      } else {
        $u['role'] = 'admin'; // já era admin
      }
    }
  } catch (Exception $roleErr) {
    // Se falhar, continua com o dado original (degradação graciosa)
  }

  send_json(['user'=>$u]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
