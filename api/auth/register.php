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
  $id = $pdo->lastInsertId();
  send_json(['user' => ['id'=>$id,'name'=>$name,'email'=>$email] ]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
