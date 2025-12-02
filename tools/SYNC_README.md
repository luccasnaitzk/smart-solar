Sync helper: mirror workspace to XAMPP htdocs

Files:
- tools/sync-to-xampp.ps1 : PowerShell script that mirrors your project to a XAMPP htdocs folder using robocopy. Supports watch mode.

Usage examples (PowerShell):

# Dry-run (shows what would be copied)
.
# From repo root
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1 -WhatIf

# Real sync (auto-detects repo root as source and tries common targets like C:\\xampp\\htdocs\\smart-solar)
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1

# Specify a custom target (example)
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1 -Target "C:\\xampp\\htdocs\\smart-solar"

# Continuous sync (watches for changes and mirrors automatically)
powershell -ExecutionPolicy Bypass -File .\\tools\\sync-to-xampp.ps1 -Target "C:\\xampp\\htdocs\\smart-solar" -Watch

Notes:
- The script requires robocopy (bundled with Windows).
- It excludes common development folders: .git, .vscode, .github, node_modules.
- In dry-run mode the script uses robocopy /L to list files that would be copied.
- Be careful with /MIR: it will remove files in the target that don't exist in the source.
- Watch mode uses a debounce to avoid thrashing; press Ctrl+C to stop.
