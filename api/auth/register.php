<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['name','email','password']);
$name = trim($body['name']);
$email = trim($body['email']);
$pass = $body['password'];

// optional profile fields
$cpf = isset($body['cpf']) ? trim($body['cpf']) : '';
$phone = isset($body['phone']) ? trim($body['phone']) : '';
$city = isset($body['city']) ? trim($body['city']) : '';
$state = isset($body['state']) ? trim($body['state']) : '';
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  if ($stmt->fetch()) send_json(['error'=>'E-mail já cadastrado'], 409);
  $hash = password_hash($pass, PASSWORD_BCRYPT);
  // Insert with optional profile fields if the columns exist
  $stmt = $pdo->prepare('INSERT INTO users(name,email,password_hash,cpf,phone,city,state) VALUES (?,?,?,?,?,?,?)');
  $stmt->execute([$name,$email,$hash,$cpf,$phone,$city,$state]);
  $id = (int)$pdo->lastInsertId();

  // Define role padrão: agora sempre 'admin' ao registrar (solicitado)
  // OBS: Isto concede privilégio máximo a qualquer novo cadastro.
  // Considere reverter para lógica anterior em produção por segurança.
  try {
    $insRole = $pdo->prepare('INSERT INTO user_roles(user_id, role) VALUES (?,?)');
    $insRole->execute([$id, 'admin']);
  } catch (Exception $re) { /* ignora falha de role inicial */ }

  // Se veio convite, vincula compartilhamento
  if (isset($body['invite']) && $body['invite']) {
    $token = trim($body['invite']);
    try {
      $stmt = $pdo->prepare('SELECT id, owner_id, role, expires_at, used_by FROM invites WHERE token = ?');
      $stmt->execute([$token]);
      $inv = $stmt->fetch();
      if ($inv && !$inv['used_by']) {
        $expOk = true;
        if ($inv['expires_at']) { $expOk = (new DateTime($inv['expires_at'])) > new DateTime(); }
        if ($expOk) {
          // cria vínculo de compartilhamento
          $ins = $pdo->prepare('INSERT IGNORE INTO user_shares(owner_id, viewer_id, role) VALUES (?,?,?)');
          $ins->execute([(int)$inv['owner_id'], $id, $inv['role']]);
          // marca convite como usado
          $upd = $pdo->prepare('UPDATE invites SET used_by = ?, used_at = NOW() WHERE id = ?');
          $upd->execute([$id, (int)$inv['id']]);
        }
      }
    } catch (Exception $ie) { /* ignore invite link failures */ }
  }

  // Retorna também a role (admin) para que o frontend persista imediatamente
  send_json(['user' => ['id'=>$id,'name'=>$name,'email'=>$email,'role'=>'admin'] ]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
