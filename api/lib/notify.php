<?php
// Lightweight notification helpers for email and SMS.
// Email providers supported via env vars: SENDGRID_API_KEY or MAILGUN_API_KEY + MAILGUN_DOMAIN.
// SMS via Twilio: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM.

function http_post_json($url, $payload, $headers = []) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(['Content-Type: application/json'], $headers));
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  $resp = curl_exec($ch);
  $err = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$status, $resp, $err];
}

function http_post_form($url, $fields, $headers = []) {
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
  $resp = curl_exec($ch);
  $err = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$status, $resp, $err];
}

function send_email($to, $subject, $text, $html = null) {
  $from = getenv('SMTP_FROM') ?: 'no-reply@smartsolar.local';
  $fromName = getenv('SMTP_FROM_NAME') ?: 'SmartSolar';

  $sgKey = getenv('SENDGRID_API_KEY');
  if ($sgKey) {
    $payload = [
      'personalizations' => [[ 'to' => [[ 'email' => $to ]] ]],
      'from' => [ 'email' => $from, 'name' => $fromName ],
      'subject' => $subject,
      'content' => [[ 'type' => $html ? 'text/html' : 'text/plain', 'value' => $html ?: nl2br($text) ]]
    ];
    [$status, $resp, $err] = http_post_json('https://api.sendgrid.com/v3/mail/send', $payload, ["Authorization: Bearer $sgKey"]);
    return $status >= 200 && $status < 300;
  }

  $mgKey = getenv('MAILGUN_API_KEY');
  $mgDomain = getenv('MAILGUN_DOMAIN');
  if ($mgKey && $mgDomain) {
    $url = "https://api.mailgun.net/v3/$mgDomain/messages";
    $fields = [
      'from' => "$fromName <$from>",
      'to' => $to,
      'subject' => $subject,
      'text' => $text
    ];
    if ($html) $fields['html'] = $html;
    [$status, $resp, $err] = http_post_form($url, $fields, [
      'Authorization: Basic ' . base64_encode('api:' . $mgKey)
    ]);
    return $status >= 200 && $status < 300;
  }

  // Fallback: PHP mail()
  $headers = "From: $fromName <$from>\r\n" .
             "MIME-Version: 1.0\r\n" .
             "Content-Type: " . ($html ? 'text/html' : 'text/plain') . "; charset=UTF-8\r\n";
  $ok = @mail($to, $subject, $html ?: $text, $headers);
  if ($ok) return true;

  // Dev/local fallback: write .eml file locally when providers are not configured
  $host = $_SERVER['SERVER_NAME'] ?? ($_SERVER['HTTP_HOST'] ?? '');
  $isLocalHost = in_array($host, ['localhost','127.0.0.1','::1'], true);
  $devMode = $isLocalHost || getenv('APP_ENV') === 'dev' || getenv('DEV_EMAIL_DIR') || is_dir(__DIR__ . '/../tmp_mails');
  if ($devMode && !is_dir(__DIR__ . '/../tmp_mails')) { @mkdir(__DIR__ . '/../tmp_mails', 0775, true); }
  if ($devMode) {
    $dir = getenv('DEV_EMAIL_DIR') ?: __DIR__ . '/../tmp_mails';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    if (is_dir($dir) && is_writable($dir)) {
      $filename = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . date('Ymd_His') . '_' . preg_replace('/[^a-z0-9_.-]+/i','_', $to) . '.eml';
      $boundary = 'BOUNDARY-' . bin2hex(random_bytes(8));
      $eml  = "From: $fromName <$from>\r\n";
      $eml .= "To: <$to>\r\n";
      $eml .= "Subject: $subject\r\n";
      $eml .= "MIME-Version: 1.0\r\n";
      if ($html) {
        $eml .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n\r\n";
        $eml .= "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" . strip_tags($text) . "\r\n";
        $eml .= "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n" . $html . "\r\n";
        $eml .= "--$boundary--\r\n";
      } else {
        $eml .= "Content-Type: text/plain; charset=UTF-8\r\n\r\n" . $text . "\r\n";
      }
      @file_put_contents($filename, $eml);
      return true; // consider delivered in dev
    }
  }

  return false;
}

function send_sms($to, $text) {
  $sid = getenv('TWILIO_SID');
  $token = getenv('TWILIO_TOKEN');
  $from = getenv('TWILIO_FROM');
  if (!$sid || !$token || !$from) return false;
  $toDigits = preg_replace('/\D/','', $to);
  if (strlen($toDigits) < 10) return false;

  $url = "https://api.twilio.com/2010-04-01/Accounts/$sid/Messages.json";
  $fields = [ 'From' => $from, 'To' => "+$toDigits", 'Body' => $text ];
  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_USERPWD, "$sid:$token");
  curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($fields));
  $resp = curl_exec($ch);
  $err = curl_error($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $status >= 200 && $status < 300;
}
