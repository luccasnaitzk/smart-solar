Sync helper: mirror workspace to XAMPP htdocs

Files:
- tools/sync-to-xampp.ps1 : PowerShell script that mirrors your project to a XAMPP htdocs folder using robocopy.

Usage examples (PowerShell):

# Dry-run (shows what would be copied)
.
# From repo root
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1 -WhatIf

# Real sync (uses default target C:\\xampp\\htdocs\\SmartSolar if present)
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1

# Specify a custom target (example)
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1 -Target "C:\\\\xampp\\\\htdocs\\\\SmartSolar"

Notes:
- The script requires robocopy (bundled with Windows).
- It excludes common development folders: .git, .vscode, .github, node_modules.
- In dry-run mode the script uses robocopy /L to list files that would be copied.
- Be careful with /MIR: it will remove files in the target that don't exist in the source.
