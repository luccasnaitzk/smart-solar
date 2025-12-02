<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
$role = isset($body['role']) && in_array($body['role'], ['viewer','admin'], true) ? $body['role'] : 'viewer';
$ttl_minutes = isset($body['ttl_minutes']) ? max(5, (int)$body['ttl_minutes']) : 1440; // default 24h
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
  if (!$u) send_json(['error'=>'Usuário (dono) não encontrado'], 404);
  $owner_id = (int)$u['id'];
  $token = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
  $expires = (new DateTime("+{$ttl_minutes} minutes"))->format('Y-m-d H:i:s');
  $stmt = $pdo->prepare('INSERT INTO invites (token, owner_id, role, expires_at) VALUES (?,?,?,?)');
  $stmt->execute([$token, $owner_id, $role, $expires]);
  send_json(['ok'=>true, 'token'=>$token, 'expires_at'=>$expires]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
