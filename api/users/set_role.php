<?php
require_once __DIR__.'/../config.php';

// Body: { actor_email, target_email, role }
$body = read_json();
require_fields($body, ['actor_email','target_email','role']);

$actorEmail = trim($body['actor_email']);
$targetEmail = trim($body['target_email']);
$role = strtolower(trim($body['role']));

if (!in_array($role, ['viewer','admin'], true)) {
  send_json(['error' => 'Role inválida'], 400);
}

try {
  $pdo = db();
  // Verifica ator
  $stmt = $pdo->prepare('SELECT u.id, COALESCE(r.role, "viewer") AS role
                         FROM users u LEFT JOIN user_roles r ON r.user_id = u.id
                         WHERE u.email = ?');
  $stmt->execute([$actorEmail]);
  $actor = $stmt->fetch();
  if (!$actor) send_json(['error' => 'Ator não encontrado'], 404);
  if (strtolower($actor['role']) !== 'admin') {
    send_json(['error' => 'Permissão negada: apenas administradores podem alterar papéis'], 403);
  }

  // Verifica alvo
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$targetEmail]);
  $target = $stmt->fetch();
  if (!$target) send_json(['error' => 'Usuário alvo não encontrado'], 404);

  $targetId = (int)$target['id'];
  $actorId = (int)$actor['id'];

  // Upsert em user_roles
  // Tenta update; se não afetou linhas, faz insert
  $upd = $pdo->prepare('UPDATE user_roles SET role = ?, added_by = ? WHERE user_id = ?');
  $upd->execute([$role, $actorId, $targetId]);
  if ($upd->rowCount() === 0) {
    $ins = $pdo->prepare('INSERT INTO user_roles(user_id, role, added_by) VALUES (?,?,?)');
    $ins->execute([$targetId, $role, $actorId]);
  }

  send_json(['ok' => true]);
} catch (Exception $e) {
  send_json(['error' => $e->getMessage()], 500);
}
