<#
PowerShell sync script: mirror local workspace to XAMPP htdocs using robocopy.
Usage:
  .\sync-to-xampp.ps1 [-Source <sourcePath>] [-Target <targetPath>] [-WhatIf]

If Target is omitted the script will try common XAMPP locations and default to
C:\xampp\htdocs\SmartSolar. When -WhatIf is provided the script runs robocopy with /L
(list-only) to preview changes.

Excludes: .git, .vscode, .github, node_modules
#>
param(
    [string]$Source = "C:\Users\lucca\OneDrive\Desktop\SmartSolar",
    [string]$Target = "",
    [switch]$WhatIf
)

function Find-DefaultTarget {
    $candidates = @(
        'C:\xampp\htdocs\SmartSolar',
        'C:\xampp\htdocs\smartsolar',
        'C:\xampp\htdocs\SmartSolar-2',
        'C:\xampp\htdocs\smartsolar-2'
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    return $null
}

if (-not (Test-Path $Source)) {
    Write-Error "Source path not found: $Source"; exit 2
}

if (-not $Target -or $Target -eq '') {
    $found = Find-DefaultTarget
    if ($found) { $Target = $found }
    else { $Target = 'C:\xampp\htdocs\SmartSolar' }
}

# Ensure target parent exists
$parent = Split-Path $Target -Parent
if (-not (Test-Path $parent)) {
    Write-Host "XAMPP htdocs not found at expected location: $parent" -ForegroundColor Yellow
    Write-Host "Please ensure XAMPP is installed or pass -Target with the correct htdocs path." -ForegroundColor Yellow
    exit 3
}

# Create target folder if missing
if (-not (Test-Path $Target)) {
    Write-Host "Target folder does not exist. Creating: $Target" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
}

$excludeDirs = @('.git', '.vscode', '.github', 'node_modules')
$excludeArgs = $excludeDirs | ForEach-Object { "`"$_`"" } | ForEach-Object { "/XD $_" } | Out-String

# Build robocopy command
$robocopy = 'robocopy'
$src = $Source.TrimEnd('\')
$dest = $Target.TrimEnd('\')
$robocopyArgs = @("`"$src`"", "`"$dest`"", "/MIR", "/MT:8", "/R:2", "/W:2", "/NFL", "/NDL", "/NJH", "/NJS", "/NP")
# append exclusions individually
foreach ($d in $excludeDirs) { $robocopyArgs += "/XD"; $robocopyArgs += "$d" }
# exclude some file patterns
$robocopyArgs += "/XF"; $robocopyArgs += "*.log"; $robocopyArgs += "*.sqlite3"

if ($WhatIf) { $robocopyArgs += "/L"; Write-Host "Running dry-run (list only)" -ForegroundColor Yellow }

$cmd = $robocopy + ' ' + ($robocopyArgs -join ' ')
Write-Host "Executing: $cmd" -ForegroundColor Green

# Execute
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'robocopy'
$psi.Arguments = ($robocopyArgs -join ' ')
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$proc = [System.Diagnostics.Process]::Start($psi)
$std = $proc.StandardOutput.ReadToEnd()
$err = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()

Write-Host $std
if ($err) { Write-Error $err }

# Return robocopy exit code semantics
exit $proc.ExitCode
