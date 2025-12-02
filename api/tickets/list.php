<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email=?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['tickets'=>[]]);
  $stmt = $pdo->prepare('SELECT protocolo, titulo, tipo, nivel, email, descricao, created_at FROM tickets WHERE user_id=? ORDER BY id DESC');
  $stmt->execute([$u['id']]);
  $rows = $stmt->fetchAll();
  send_json(['tickets'=>$rows]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
