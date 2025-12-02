<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
$tipo = isset($body['tipo']) ? trim($body['tipo']) : null;
$status = isset($body['status']) ? trim($body['status']) : null;
$limit = isset($body['limit']) ? max(1, (int)$body['limit']) : 50;
$offset = isset($body['offset']) ? max(0, (int)$body['offset']) : 0;
$from = isset($body['from']) ? $body['from'] : null; // YYYY-MM-DD
$to = isset($body['to']) ? $body['to'] : null; // YYYY-MM-DD

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['relatorios'=>[], 'total'=>0]);

  $where = ['user_id = ?'];
  $params = [$u['id']];
  if ($tipo) { $where[] = 'tipo = ?'; $params[] = $tipo; }
  if ($status) { $where[] = 'status = ?'; $params[] = $status; }
  if ($from) { $where[] = '(periodo_inicio IS NULL OR periodo_inicio >= ?)'; $params[] = $from; }
  if ($to) { $where[] = '(periodo_fim IS NULL OR periodo_fim <= ?)'; $params[] = $to; }
  $wsql = 'WHERE ' . implode(' AND ', $where);

  $stmt = $pdo->prepare("SELECT COUNT(*) as c FROM relatorios $wsql");
  $stmt->execute($params);
  $total = (int)$stmt->fetchColumn();

  $stmt = $pdo->prepare("SELECT id, titulo, tipo, status, periodo_inicio, periodo_fim, created_at, updated_at FROM relatorios $wsql ORDER BY id DESC LIMIT $limit OFFSET $offset");
  $stmt->execute($params);
  $rows = $stmt->fetchAll();
  send_json(['relatorios'=>$rows, 'total'=>$total, 'limit'=>$limit, 'offset'=>$offset]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
