<?php
require_once __DIR__.'/config.php';
$ok = true; $dbok = false; $err = null;
try {
  $pdo = db();
  $pdo->query('SELECT 1');
  $dbok = true;
} catch (Exception $e) {
  $dbok = false; $err = $e->getMessage();
}
send_json(['ok'=>$ok,'db'=>$dbok,'error'=>$err]);
