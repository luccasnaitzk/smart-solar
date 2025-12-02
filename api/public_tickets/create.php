<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['nome','email','categoria','mensagem']);
$nome = trim($body['nome']);
$email = trim($body['email']);
$categoria = trim($body['categoria']);
$mensagem = trim($body['mensagem']);
try {
  $pdo = db();
  // gera protocolo simples
  $rand = strtoupper(substr(bin2hex(random_bytes(3)),0,6));
  $protocolo = 'PT-' . date('Ymd-His-') . $rand;
  $stmt = $pdo->prepare('INSERT INTO public_tickets (nome,email,categoria,mensagem,protocolo) VALUES (?,?,?,?,?)');
  $stmt->execute([$nome,$email,$categoria,$mensagem,$protocolo]);
  send_json(['ok'=>true,'protocolo'=>$protocolo]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()], 500); }
