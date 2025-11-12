<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['placas'=>[]]);
  $stmt = $pdo->prepare('SELECT nome, potencia, status FROM placas WHERE user_id = ? ORDER BY id');
  $stmt->execute([$u['id']]);
  $rows = $stmt->fetchAll();
  send_json(['placas'=>$rows]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
