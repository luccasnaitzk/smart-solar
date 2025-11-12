<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
$name = isset($body['name']) ? trim($body['name']) : null;
$cpf = isset($body['cpf']) ? trim($body['cpf']) : null;
$phone = isset($body['phone']) ? trim($body['phone']) : null;
$city = isset($body['city']) ? trim($body['city']) : null;
$state = isset($body['state']) ? trim($body['state']) : null;
// allow password updates (plain new password expected)
$password = isset($body['password']) ? $body['password'] : null;
try {
  $pdo = db();
  // Build dynamic update
  $fields = [];
  $params = [];
  if ($name !== null) { $fields[] = 'name = ?'; $params[] = $name; }
  if ($cpf !== null)  { $fields[] = 'cpf = ?'; $params[] = $cpf; }
  if ($phone !== null) { $fields[] = 'phone = ?'; $params[] = $phone; }
  if ($city !== null) { $fields[] = 'city = ?'; $params[] = $city; }
  if ($state !== null) { $fields[] = 'state = ?'; $params[] = $state; }
  if ($password !== null && $password !== '') {
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $fields[] = 'password_hash = ?';
    $params[] = $hash;
    // clear any pending reset tokens when user changes password
    $fields[] = 'password_reset_token = NULL';
    $fields[] = 'password_reset_expires = NULL';
  }
  if (!count($fields)) send_json(['ok'=>false,'error'=>'Nada para atualizar'],400);
  $params[] = $email;
  $sql = 'UPDATE users SET ' . implode(',', $fields) . ' WHERE email = ?';
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  send_json(['ok'=>true]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()],500); }
