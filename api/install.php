<?php
require_once __DIR__.'/config.php';
try {
  $pdo = db();
  $sql = file_get_contents(__DIR__.'/schema.sql');
  if ($sql === false) send_json(['error'=>'schema.sql não encontrado'], 500);
  // Executa múltiplas statements (simples):
  foreach (array_filter(array_map('trim', preg_split('/;\s*\n/m', $sql))) as $stmt) {
    if ($stmt) $pdo->exec($stmt);
  }
  send_json(['ok'=>true]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
