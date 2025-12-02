<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','titulo','tipo','nivel']);
$email = trim($body['email']);
$titulo = trim($body['titulo']);
$tipo = trim($body['tipo']);
$nivel = trim($body['nivel']);
$desc = isset($body['descricao']) ? trim($body['descricao']) : '';
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, name FROM users WHERE email=?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado'], 404);
  // protocolo: SS-YYYYMMDD-HHMMSS-RAND
  $rand = strtoupper(substr(bin2hex(random_bytes(3)),0,6));
  $proto = 'SS-' . date('Ymd-His-') . $rand;
  $sql = 'INSERT INTO tickets (user_id, titulo, tipo, nivel, email, descricao, protocolo) VALUES (?,?,?,?,?,?,?)';
  $stmt = $pdo->prepare($sql);
  $stmt->execute([$u['id'], $titulo, $tipo, $nivel, $email, $desc, $proto]);
  $id = (int)$pdo->lastInsertId();
  send_json(['ok'=>true, 'id'=>$id, 'protocolo'=>$proto]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
