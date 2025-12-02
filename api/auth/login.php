<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email','password']);
$email = trim($body['email']);
$pass = $body['password'];
try {
  $pdo = db();
  // Busca usuário e role (se não existir linha em user_roles, retorna viewer)
  $stmt = $pdo->prepare('SELECT u.id, u.name, u.email, u.password_hash, COALESCE(r.role, "viewer") AS role FROM users u LEFT JOIN user_roles r ON r.user_id = u.id WHERE u.email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u || !password_verify($pass, $u['password_hash'])) {
    send_json(['error'=>'Credenciais inválidas'], 401);
  }
  // Garante retorno da role ao frontend
  send_json(['user' => ['id'=>$u['id'],'name'=>$u['name'],'email'=>$u['email'],'role'=>strtolower($u['role']??'viewer')] ]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
