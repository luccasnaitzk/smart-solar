<?php
require_once __DIR__.'/../config.php';
try {
  $pdo = db();
  $chk = $pdo->query("SELECT COUNT(*) AS c FROM user_roles WHERE role='admin'")->fetch();
  if (!$chk || (int)$chk['c'] === 0) {
    $u = $pdo->query('SELECT id FROM users ORDER BY id ASC LIMIT 1')->fetch();
    if ($u) {
      $uid = (int)$u['id'];
      // Upsert admin role for first user
      $upd = $pdo->prepare('UPDATE user_roles SET role="admin" WHERE user_id=?');
      $upd->execute([$uid]);
      if ($upd->rowCount() === 0) {
        $ins = $pdo->prepare('INSERT INTO user_roles(user_id, role) VALUES (?,"admin")');
        $ins->execute([$uid]);
      }
      send_json(['ok'=>true,'assigned_admin'=>$uid]);
    } else {
      send_json(['ok'=>false,'error'=>'Nenhum usuário cadastrado']);
    }
  } else {
    send_json(['ok'=>true,'message'=>'Já existe administrador']);
  }
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}