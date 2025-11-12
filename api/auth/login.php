<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','password']);
$email = trim($body['email']);
$pass = $body['password'];
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u || !password_verify($pass, $u['password_hash'])) {
    send_json(['error'=>'Credenciais inválidas'], 401);
  }
  send_json(['user' => ['id'=>$u['id'],'name'=>$u['name'],'email'=>$u['email']] ]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
