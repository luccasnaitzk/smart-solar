<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, name, email, cpf, phone, city, state, created_at FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['user'=>null]);
  send_json(['user'=>$u]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
