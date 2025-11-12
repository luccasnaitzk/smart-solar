<?php
require_once __DIR__.'/../config.php';
$body = read_json();
// accept either email or phone (phone digits)
$email = isset($body['email']) ? trim($body['email']) : '';
$phone = isset($body['phone']) ? trim($body['phone']) : '';
if ($email === '' && $phone === '') send_json(['error'=>'Informe e-mail ou telefone'],400);
try {
  $pdo = db();
  $user = null;
  if ($email !== '') {
    $stmt = $pdo->prepare('SELECT id,email,phone FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
  }
  if (!$user && $phone !== '') {
    // normalize digits
    $digits = preg_replace('/\D/','',$phone);
    $stmt = $pdo->query('SELECT id,email,phone FROM users');
    while ($row = $stmt->fetch()) {
      if (!empty($row['phone']) && preg_replace('/\D/','',$row['phone']) === $digits) { $user = $row; break; }
    }
  }
  if (!$user) send_json(['error'=>'Usuário não encontrado'],404);

  // generate a six-digit numeric code for demo; in production use a secure long token
  $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  $expires = date('Y-m-d H:i:s', time() + 60*60); // 1 hour
  $upd = $pdo->prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?');
  $upd->execute([$code, $expires, $user['id']]);

  // For demo mode we'll return the code so frontend can show it to user; in real deployments
  // you would send the code via email/SMS and NOT return it in the API response.
  send_json(['ok'=>true, 'email'=>$user['email'], 'code'=>$code, 'expires'=>$expires]);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()],500); }
