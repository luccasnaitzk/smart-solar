<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','code','password']);
$email = trim($body['email']);
$code = trim($body['code']);
$new = $body['password'];
if (strlen($new) < 6) send_json(['error'=>'A senha deve ter pelo menos 6 caracteres'],400);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, password_reset_expires FROM users WHERE email = ? AND password_reset_token = ? LIMIT 1');
  $stmt->execute([$email, $code]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Código inválido ou e-mail não encontrado'],400);
  if (empty($u['password_reset_expires']) || strtotime($u['password_reset_expires']) < time()) {
    send_json(['error'=>'Código expirado'],400);
  }
  $hash = password_hash($new, PASSWORD_BCRYPT);
  $upd = $pdo->prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?');
  $upd->execute([$hash, $u['id']]);
  send_json(['ok'=>true]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()],500); }
