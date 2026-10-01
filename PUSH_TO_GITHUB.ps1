$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'AJN BUZZ IMAGE V6.2 :: Git sync'
if (!(Test-Path '.git')) { throw 'This folder is not a Git working tree. Copy/sync it into the existing AJN-BUZZ-IMAGE repo first.' }
git status --short
git add -A
git status --short
git commit -m 'AJN BUZZ IMAGE V6.2 production SEO and landing page' 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host 'No new commit created (working tree may already be clean).' }
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'Git push failed.' }
Write-Host 'PASS: pushed to origin/main'
