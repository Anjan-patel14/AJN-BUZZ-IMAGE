$ErrorActionPreference='Stop'
$P=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $P
Clear-Host
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' AJN BUZZ IMAGE V6.1 :: PHOTO + SIGNATURE + AJN BOT' -ForegroundColor Cyan
Write-Host ' 30 TOOLS | PX/CM/MM/IN | DPI | KB | PHOTO | SIGNATURE' -ForegroundColor Cyan
Write-Host ' AJN BOT | GEMINI | BROWSER-FIRST IMAGE EXECUTION' -ForegroundColor Yellow
Write-Host '============================================================' -ForegroundColor Cyan

if(!(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js is required.'}
if(!(Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw 'npm is required.'}

if(!(Test-Path '.env.local')){
  if(Test-Path '.env.local.example'){Copy-Item '.env.local.example' '.env.local'} else {New-Item -ItemType File '.env.local' | Out-Null}
}
$envText=Get-Content '.env.local' -Raw -ErrorAction SilentlyContinue
if($envText -notmatch '(?m)^GEMINI_API_KEY=\S+\s*$'){
  Write-Host ''
  Write-Host '[SETUP] AJN Bot needs your Gemini API key.' -ForegroundColor Yellow
  Write-Host 'The key is saved only in .env.local and is never put into the release ZIP.' -ForegroundColor Yellow
  $key=Read-Host 'Paste GEMINI_API_KEY'
  if([string]::IsNullOrWhiteSpace($key)){throw 'AJN Bot requires a Gemini API key. Run again and paste the key.'}
  @("GEMINI_API_KEY=$($key.Trim())", 'GEMINI_MODEL=gemini-2.5-flash') | Set-Content '.env.local' -Encoding UTF8
}

Write-Host '[INFO] Stopping stale AJN Buzz server on port 9010...' -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 9010 -State Listen -ErrorAction SilentlyContinue | ForEach-Object{Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue}
Start-Sleep 1

$pkg=Get-Content '.\package.json' -Raw | ConvertFrom-Json
if($pkg.version -ne '6.1.0'){throw "Expected AJN Buzz 6.1.0, found $($pkg.version)"}
if($pkg.devDependencies.typescript -ne '5.7.3'){throw "Expected TypeScript 5.7.3, found $($pkg.devDependencies.typescript)"}

$tsc=Join-Path $P 'node_modules\.bin\tsc.cmd'
if(!(Test-Path $tsc)){
  Write-Host '[INFO] Installing pinned packages including devDependencies...' -ForegroundColor Cyan
  npm.cmd install --include=dev --no-audit --no-fund
  if($LASTEXITCODE -ne 0){throw 'npm install failed'}
}else{Write-Host '[INFO] Reusing existing node_modules.' -ForegroundColor Green}
if(!(Test-Path $tsc)){throw 'TypeScript CLI is missing after dependency install'}
$tsVersion=& $tsc --version
if($tsVersion -notmatch '5\.7\.3'){throw "Unexpected TypeScript version: $tsVersion"}
Write-Host "[PASS] $tsVersion" -ForegroundColor Green

if(Test-Path '.next'){Remove-Item '.next' -Recurse -Force -ErrorAction SilentlyContinue}
Write-Host '[INFO] Running source verification + TypeScript + optimized Next.js build...' -ForegroundColor Cyan
npm.cmd run check
if($LASTEXITCODE -ne 0){throw 'AJN Buzz production check failed'}
Write-Host '[PASS] Source + TypeScript + production build complete' -ForegroundColor Green

$server=Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k',("cd /d `"{0}`" && npm.cmd run dev" -f $P)) -PassThru
Write-Host '[INFO] Waiting for http://localhost:9010 ...' -ForegroundColor Cyan
$ready=$false
for($i=0;$i -lt 120;$i++){
  try{$r=Invoke-WebRequest 'http://localhost:9010/api/health' -UseBasicParsing -TimeoutSec 3;if($r.StatusCode -eq 200){$ready=$true;break}}catch{}
  Start-Sleep 1
}
if(!$ready){throw 'AJN Buzz did not start. Check the dev-server CMD window.'}
Write-Host '[PASS] Localhost READY' -ForegroundColor Green

& "$P\CHECK_LOCAL.ps1"
if($LASTEXITCODE -ne 0){throw 'Local acceptance failed'}

Write-Host ''
Write-Host 'Home         : http://localhost:9010' -ForegroundColor Green
Write-Host 'AJN Bot      : http://localhost:9010/bot' -ForegroundColor Green
Write-Host 'All tools    : http://localhost:9010/tools'
Write-Host 'Signature    : http://localhost:9010/tools/signature-maker'
Write-Host 'Passport     : http://localhost:9010/tools/passport-photo-maker'
Write-Host 'Resize in CM : http://localhost:9010/tools/resize-cm'
Write-Host 'Compress KB  : http://localhost:9010/tools/compress-to-kb'
Write-Host 'Sitemap      : http://localhost:9010/sitemap.xml'
Write-Host ''
Write-Host '[PASS] AJN BUZZ PHOTO + SIGNATURE + AJN BOT READY' -ForegroundColor Green
Start-Process 'http://localhost:9010/bot'
