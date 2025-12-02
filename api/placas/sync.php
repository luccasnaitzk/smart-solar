<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','placas']);
$email = trim($body['email']);
$placas = $body['placas'];
if (!is_array($placas)) send_json(['error'=>'placas inválido'], 400);
try {
  $pdo = db();
  // Verifica papel do usuário: somente 'admin' pode editar/sincronizar placas
  $stmt = $pdo->prepare('SELECT u.id, COALESCE(r.role, "viewer") AS role FROM users u LEFT JOIN user_roles r ON r.user_id = u.id WHERE u.email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado'], 404);
  if (strtolower($u['role']) !== 'admin') {
    send_json(['error'=>'Permissão negada: apenas administradores podem modificar placas'], 403);
  }
  $pdo->beginTransaction();
  $uid = $u['id'];
  // Limpa e re-insere (simples)
  $pdo->prepare('DELETE FROM placas WHERE user_id = ?')->execute([$uid]);
  $ins = $pdo->prepare('INSERT INTO placas(user_id,nome,potencia,status) VALUES (?,?,?,?)');
  foreach ($placas as $p) {
    $nome = isset($p['nome']) ? $p['nome'] : '';
    $potencia = isset($p['potencia']) ? (float)$p['potencia'] : 0;
    $status = isset($p['status']) ? $p['status'] : 'Ativa';
    if ($nome === '') continue;
    $ins->execute([$uid, $nome, $potencia, $status]);
  }
  $pdo->commit();
  send_json(['ok'=>true]);
} catch (Exception $e) {
  if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
  send_json(['error'=>$e->getMessage()], 500);
}
