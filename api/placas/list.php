<?php
require_once __DIR__.'/../config.php';
$body = read_json();
require_fields($body, ['email']);
$email = trim($body['email']);
try {
  $pdo = db();
  $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
  $stmt->execute([$email]);
  $u = $stmt->fetch();
    if (!$u) send_json(['placas'=>[]]);
    // Placas do próprio usuário + compartilhadas por outros (owner_id em user_shares)
    $sql = 'SELECT p.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email, p.nome, p.potencia, p.status
      FROM placas p
      INNER JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      UNION ALL
      SELECT p.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email, p.nome, p.potencia, p.status
      FROM placas p
      INNER JOIN user_shares s ON s.owner_id = p.user_id
      INNER JOIN users u ON u.id = p.user_id
      WHERE s.viewer_id = ?
      ORDER BY nome';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$u['id'], $u['id']]);
  $rows = $stmt->fetchAll();
  send_json(['placas'=>$rows]);
} catch (Exception $e) {
  send_json(['error'=>$e->getMessage()], 500);
}
