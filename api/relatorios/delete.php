<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','id']);
$email = trim($body['email']);
$id = (int)$body['id'];
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado'], 404);
  $stmt = $pdo->prepare('DELETE FROM relatorios WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $u['id']]);
  send_json(['ok'=>true]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
