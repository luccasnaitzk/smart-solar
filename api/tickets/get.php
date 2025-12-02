<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','protocolo']);
$email = trim($body['email']);
$proto = trim($body['protocolo']);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email=?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado'], 404);
  $stmt = $pdo->prepare('SELECT protocolo, titulo, tipo, nivel, email, descricao, created_at FROM tickets WHERE user_id=? AND protocolo=?');
  $stmt->execute([$u['id'], $proto]);
  $row = $stmt->fetch();
  if (!$row) send_json(['error'=>'Ticket não encontrado'], 404);
  send_json(['ticket'=>$row]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
