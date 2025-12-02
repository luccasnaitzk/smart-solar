<?php
require_once __DIR__.'/../config.php';
require_once __DIR__.'/../lib/notify.php';
$body = read_json();
// Accept either email OR phone; frontend may provide one field only
$email = isset($body['email']) ? trim($body['email']) : '';
$phone = isset($body['phone']) ? trim($body['phone']) : '';
if ($email === '' && $phone === '') send_json(['error'=>'Informe e-mail ou telefone'],400);
try {
  $pdo = db();
  $user = null;
  if ($email !== '') {
    $stmt = $pdo->prepare('SELECT id,email,phone,name FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
  }
  if (!$user && $phone !== '') {
    $digits = preg_replace('/\D/','',$phone);
    $stmt = $pdo->query('SELECT id,email,phone,name FROM users');
    while ($row = $stmt->fetch()) {
      if (!empty($row['phone']) && preg_replace('/\D/','',$row['phone']) === $digits) { $user = $row; break; }
    }
  }
  if (!$user) send_json(['error'=>'Usuário não encontrado'],404);

  // 6-digit numeric code, expires in 15 minutes
  $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
  $expiresAt = time() + 15*60;
  $expires = date('Y-m-d H:i:s', $expiresAt);
  $upd = $pdo->prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?');
  $upd->execute([$code, $expires, $user['id']]);

  $name = $user['name'] ?: 'Usuário';
  $msgTxt = "Olá, $name!\n\nSeu código de recuperação é: $code\nEle expira em 15 minutos.\n\nSe você não solicitou, ignore esta mensagem.";
  $msgHtml = '<p>Olá, '.htmlspecialchars($name). '!</p><p>Seu código de recuperação é: <strong>'.$code.'</strong></p><p>Ele expira em 15 minutos.</p><p>Se você não solicitou, ignore esta mensagem.</p>';

  $via = null; $sent = false;
  $devMode = getenv('APP_ENV') === 'dev' || getenv('DEV_EMAIL_DIR');
  if ($email !== '') {
    $sent = send_email($user['email'], 'SmartSolar - Código de recuperação', $msgTxt, $msgHtml);
    $via = 'email';
  } else if ($phone !== '') {
    $sent = send_sms($phone, $msgTxt);
    $via = 'sms';
  }

  if (!$sent) {
    // Fallback: se em modo dev ou sem provider configurado, devolve código para testes
    if ($devMode || (!getenv('SENDGRID_API_KEY') && !getenv('MAILGUN_API_KEY') && !getenv('TWILIO_SID'))) {
      $payload = ['ok'=>true,'via'=>'dev','email'=>$user['email'], 'expires'=>$expires, 'ttl'=>($expiresAt - time()), 'dev_code'=>$code, 'warning'=>'Código retornado em modo desenvolvimento; e-mail/SMS não enviado.'];
      send_json($payload);
    }
    send_json(['error'=>'Falha ao enviar o código. Configure SENDGRID_API_KEY ou MAILGUN_API_KEY / TWILIO_* para envio real.'], 500);
  }
  $payload = ['ok'=>true, 'via'=>$via, 'email'=>$user['email'], 'expires'=>$expires, 'ttl'=>($expiresAt - time())];
  if ($devMode) { $payload['dev_code'] = $code; }
  send_json($payload);
} catch (Exception $e) { send_json(['error'=>$e->getMessage()],500); }
