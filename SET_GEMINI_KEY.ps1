$ErrorActionPreference = 'Stop'
$Target = Join-Path $PSScriptRoot '.env.local'
Write-Host 'AJN Bot Gemini setup' -ForegroundColor Cyan
Write-Host 'Paste your Gemini API key below. The key is stored only in .env.local and is not included in the release ZIP.'
$key = Read-Host 'GEMINI_API_KEY'
if ([string]::IsNullOrWhiteSpace($key)) { throw 'No API key entered.' }
$key = $key.Trim()
@("GEMINI_API_KEY=$key", 'GEMINI_MODEL=gemini-2.5-flash') | Set-Content -LiteralPath $Target -Encoding UTF8
Write-Host "Saved: $Target" -ForegroundColor Green
Write-Host 'Now run START_LOCAL.ps1.' -ForegroundColor Green
