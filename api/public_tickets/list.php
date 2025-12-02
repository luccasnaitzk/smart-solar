<?php
require_once __DIR__.'/../config.php';
$body = read_json();
// Para simplicidade exige email para filtrar os tickets daquela pessoa
require_fields($body, ['email']);
$email = trim($body['email']);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT protocolo, nome, email, categoria, mensagem, created_at FROM public_tickets WHERE email = ? ORDER BY id DESC');
  $stmt->execute([$email]);
  $rows = $stmt->fetchAll();
  send_json(['tickets'=>$rows]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
