<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','id']);
$email = trim($body['email']);
$id = (int)$body['id'];
$titulo = array_key_exists('titulo', $body) ? trim((string)$body['titulo']) : null;
$tipo = array_key_exists('tipo', $body) ? trim((string)$body['tipo']) : null;
$status = array_key_exists('status', $body) ? trim((string)$body['status']) : null;
$periodo_inicio = array_key_exists('periodo_inicio', $body) ? $body['periodo_inicio'] : null;
$periodo_fim = array_key_exists('periodo_fim', $body) ? $body['periodo_fim'] : null;
$corpo = array_key_exists('corpo', $body) ? $body['corpo'] : null;
$dados = array_key_exists('dados', $body) ? $body['dados'] : null;
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário não encontrado'], 404);

  $fields = [];
  $params = [];
  if ($titulo !== null) { $fields[] = 'titulo = ?'; $params[] = $titulo; }
  if ($tipo !== null)   { $fields[] = 'tipo = ?'; $params[] = $tipo; }
  if ($status !== null) {
    $valid_status = ['rascunho','gerado','enviado','arquivado'];
    if (!in_array($status, $valid_status, true)) { $status = 'rascunho'; }
    $fields[] = 'status = ?'; $params[] = $status;
  }
  if (array_key_exists('periodo_inicio', $body)) { $fields[] = 'periodo_inicio = ?'; $params[] = $periodo_inicio; }
  if (array_key_exists('periodo_fim', $body))    { $fields[] = 'periodo_fim = ?'; $params[] = $periodo_fim; }
  if ($corpo !== null) { $fields[] = 'corpo = ?'; $params[] = $corpo; }
  if (array_key_exists('dados', $body)) {
    $dados_json = null;
    if (is_array($dados) || is_object($dados)) { $dados_json = json_encode($dados, JSON_UNESCAPED_UNICODE); }
    elseif (is_string($dados) && $dados !== '') { $dados_json = $dados; }
    $fields[] = 'dados_json = ?'; $params[] = $dados_json;
  }
  if (!count($fields)) send_json(['ok'=>false,'error'=>'Nada para atualizar'], 400);
  // Validação de datas: não permitir datas futuras e início <= fim (quando informadas)
  $today = new DateTime('today');
  $pi = array_key_exists('periodo_inicio', $body) ? ($periodo_inicio ? DateTime::createFromFormat('Y-m-d', $periodo_inicio) : null) : null;
  $pf = array_key_exists('periodo_fim', $body) ? ($periodo_fim ? DateTime::createFromFormat('Y-m-d', $periodo_fim) : null) : null;
  if ($pi && $pi > $today) { send_json(['error' => 'Data de início não pode ser no futuro'], 400); }
  if ($pf && $pf > $today) { send_json(['error' => 'Data de fim não pode ser no futuro'], 400); }
  if ($pi && $pf && $pi > $pf) { send_json(['error' => 'Data de início deve ser anterior ou igual à data de fim'], 400); }
  $params[] = $id; $params[] = $u['id'];
  $sql = 'UPDATE relatorios SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  send_json(['ok'=>true]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
