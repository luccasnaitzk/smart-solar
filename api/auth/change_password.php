<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','oldPassword','newPassword']);
$email = trim($body['email']);
$old = (string)$body['oldPassword'];
$new = (string)$body['newPassword'];
if (strlen($new) < 6) send_json(['error'=>'A nova senha deve ter pelo menos 6 caracteres.'], 400);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado.'], 404);
  if (!password_verify($old, $u['password_hash'])) send_json(['error'=>'Senha atual incorreta.'], 400);

  $hash = password_hash($new, PASSWORD_BCRYPT);
  $upd = $pdo->prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?');
  $upd->execute([$hash, (int)$u['id']]);

  send_json(['ok'=>true]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
