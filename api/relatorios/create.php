<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','titulo']);
$email = trim($body['email']);
$titulo = trim($body['titulo']);
$tipo = isset($body['tipo']) ? trim($body['tipo']) : 'geral';
$status = isset($body['status']) ? trim($body['status']) : 'rascunho';
$periodo_inicio = isset($body['periodo_inicio']) ? $body['periodo_inicio'] : null; // YYYY-MM-DD
$periodo_fim = isset($body['periodo_fim']) ? $body['periodo_fim'] : null; // YYYY-MM-DD
$corpo = isset($body['corpo']) ? $body['corpo'] : null;
$dados = isset($body['dados']) ? $body['dados'] : null; // objeto/array opcional

try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado'], 404);

  // normaliza status permitido
  $valid_status = ['rascunho','gerado','enviado','arquivado'];
  if (!in_array($status, $valid_status, true)) { $status = 'rascunho'; }

  $dados_json = null;
  if (is_array($dados) || is_object($dados)) { $dados_json = json_encode($dados, JSON_UNESCAPED_UNICODE); }
  elseif (is_string($dados) && $dados !== '') { $dados_json = $dados; }

  // Validação de datas: não permitir datas futuras e início <= fim
  $today = new DateTime('today');
  $pi = $periodo_inicio ? DateTime::createFromFormat('Y-m-d', $periodo_inicio) : null;
  $pf = $periodo_fim ? DateTime::createFromFormat('Y-m-d', $periodo_fim) : null;
  if ($pi && $pi > $today) { send_json(['error' => 'Data de início não pode ser no futuro'], 400); }
  if ($pf && $pf > $today) { send_json(['error' => 'Data de fim não pode ser no futuro'], 400); }
  if ($pi && $pf && $pi > $pf) { send_json(['error' => 'Data de início deve ser anterior ou igual à data de fim'], 400); }

  $sql = 'INSERT INTO relatorios (user_id, titulo, tipo, status, periodo_inicio, periodo_fim, corpo, dados_json) VALUES (?,?,?,?,?,?,?,?)';
  $stmt = $pdo->prepare($sql);
  $stmt->execute([$u['id'], $titulo, $tipo, $status, $periodo_inicio, $periodo_fim, $corpo, $dados_json]);
  $id = (int)$pdo->lastInsertId();
  send_json(['ok'=>true,'id'=>$id]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
