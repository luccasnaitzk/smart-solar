# Sets up local email/SMS delivery for SmartSolar on localhost.
# - Creates tmp_mails folder for .eml files
# - Sets environment variables for dev fallback
# - Optionally configures SendGrid or Mailgun if you provide keys
# - Tests the password reset API

param(
  [string]$SendGridKey = "",
  [string]$MailgunKey = "",
  [string]$MailgunDomain = "",
  [string]$TwilioSid = "",
  [string]$TwilioToken = "",
  [string]$TwilioFrom = "",
  [string]$EmailFrom = "no-reply@smartsolar.local",
  [string]$EmailFromName = "SmartSolar",
  [string]$TestEmail = "",
  [string]$TestPhone = ""
)

Write-Host "Setting up SmartSolar dev email/SMS..." -ForegroundColor Cyan

# Create tmp_mails directory for .eml fallback
$dir = Join-Path $PSScriptRoot "..\api\tmp_mails"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

# Set common env vars
[Environment]::SetEnvironmentVariable("SMTP_FROM", $EmailFrom, "User")
[Environment]::SetEnvironmentVariable("SMTP_FROM_NAME", $EmailFromName, "User")

if ($SendGridKey) {
  [Environment]::SetEnvironmentVariable("SENDGRID_API_KEY", $SendGridKey, "User")
  Write-Host "Configured SendGrid." -ForegroundColor Green
}
if ($MailgunKey -and $MailgunDomain) {
  [Environment]::SetEnvironmentVariable("MAILGUN_API_KEY", $MailgunKey, "User")
  [Environment]::SetEnvironmentVariable("MAILGUN_DOMAIN", $MailgunDomain, "User")
  Write-Host "Configured Mailgun." -ForegroundColor Green
}
if ($TwilioSid -and $TwilioToken -and $TwilioFrom) {
  [Environment]::SetEnvironmentVariable("TWILIO_SID", $TwilioSid, "User")
  [Environment]::SetEnvironmentVariable("TWILIO_TOKEN", $TwilioToken, "User")
  [Environment]::SetEnvironmentVariable("TWILIO_FROM", $TwilioFrom, "User")
  Write-Host "Configured Twilio." -ForegroundColor Green
}

# Mark dev to allow fallback .eml even if mail() fails
[Environment]::SetEnvironmentVariable("APP_ENV", "dev", "User")

Write-Host "Environment variables set. Restart Apache/PHP to apply." -ForegroundColor Yellow

# Optional test: request reset via email or phone
function Invoke-ResetTest {
  param([string]$Email, [string]$Phone)
  $api = "http://localhost/smart-solar/api/auth/request_reset.php"
  $payload = @{}
  if ($Email) { $payload.email = $Email }
  if ($Phone) { $payload.phone = $Phone }
  if (-not $payload.Keys.Count) { Write-Host "Skip test: provide -TestEmail or -TestPhone." -ForegroundColor Yellow; return }
  try {
    $json = $payload | ConvertTo-Json -Depth 5
    $resp = Invoke-WebRequest -Uri $api -Method Post -ContentType "application/json" -Body $json
    Write-Host "API status: $($resp.StatusCode)" -ForegroundColor Cyan
    Write-Host $resp.Content
    Write-Host "Check tmp mails at: $dir" -ForegroundColor Yellow
  } catch {
    Write-Host "Test request failed: $($_.Exception.Message)" -ForegroundColor Red
  }
}

Invoke-ResetTest -Email $TestEmail -Phone $TestPhone

Write-Host "Done." -ForegroundColor Cyan
