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
  $stmt = $pdo->prepare('SELECT id, titulo, tipo, status, periodo_inicio, periodo_fim, corpo, dados_json, created_at, updated_at FROM relatorios WHERE id = ? AND user_id = ?');
  $stmt->execute([$id, $u['id']]);
  $row = $stmt->fetch();
  if (!$row) send_json(['error'=>'Relatório não encontrado'], 404);
  // tenta decodificar JSON
  if (isset($row['dados_json']) && $row['dados_json'] !== null && $row['dados_json'] !== '') {
    $decoded = json_decode($row['dados_json'], true);
    if (json_last_error() === JSON_ERROR_NONE) {
      $row['dados'] = $decoded;
    }
  }
  send_json(['relatorio'=>$row]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
