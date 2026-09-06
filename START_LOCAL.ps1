$ErrorActionPreference='Stop'
$Repo=(Get-Location).Path

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' AJN BUZZ IMAGE V5.4 :: CONCEPT + LOGIC PRODUCTION PREVIEW' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

if(!(Test-Path (Join-Path $Repo 'package.json'))){throw 'Run this inside the AJN BUZZ project folder.'}
$pkg=Get-Content (Join-Path $Repo 'package.json') -Raw | ConvertFrom-Json
if($pkg.name -ne 'ajn-buzz-image' -or $pkg.version -ne '5.4.0'){throw "Expected AJN Buzz 5.4.0, found $($pkg.name) $($pkg.version)"}

$env:ESLINT_USE_FLAT_CONFIG='false'

Write-Host '[1/6] Dependencies...' -ForegroundColor Cyan
npm.cmd install --include=dev --no-audit --no-fund
if($LASTEXITCODE -ne 0){throw 'npm install failed'}

Write-Host '[2/6] Source + logic + lint + TypeScript...' -ForegroundColor Cyan
npm.cmd run verify
if($LASTEXITCODE -ne 0){throw 'Source verification failed'}
npm.cmd run test:logic
if($LASTEXITCODE -ne 0){throw 'Logic tests failed'}
npm.cmd run lint
if($LASTEXITCODE -ne 0){throw 'ESLint failed'}
npm.cmd run typecheck
if($LASTEXITCODE -ne 0){throw 'TypeScript failed'}

Write-Host '[3/6] Clean optimized production build...' -ForegroundColor Cyan
Remove-Item '.\.next' -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
if($LASTEXITCODE -ne 0){throw 'Next.js production build failed'}

Write-Host '[4/6] Starting production server...' -ForegroundColor Cyan
$Out=Join-Path $env:TEMP 'ajn_buzz_v54_start.out.log'
$Err=Join-Path $env:TEMP 'ajn_buzz_v54_start.err.log'
Remove-Item $Out,$Err -Force -ErrorAction SilentlyContinue
$server=Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c','npm run start') -WorkingDirectory $Repo -PassThru -RedirectStandardOutput $Out -RedirectStandardError $Err

try{
  $ready=$false
  for($i=0;$i -lt 60;$i++){
    Start-Sleep -Seconds 1
    if($server.HasExited){break}
    try{
      $health=Invoke-RestMethod 'http://localhost:9010/api/health' -TimeoutSec 2
      if($health.status -eq 'ok'){$ready=$true;break}
    }catch{}
  }
  if(!$ready){
    if(Test-Path $Out){Get-Content $Out -Tail 80}
    if(Test-Path $Err){Get-Content $Err -Tail 80}
    throw 'Production server did not become ready'
  }

  Write-Host '[5/6] Local production acceptance...' -ForegroundColor Cyan
  & (Join-Path $Repo 'CHECK_LOCAL.ps1')
  if($LASTEXITCODE -ne 0){throw 'Local production acceptance failed'}

  Write-Host '[6/6] Browser URL...' -ForegroundColor Cyan
  Write-Host 'http://localhost:9010' -ForegroundColor Green
  Start-Process 'http://localhost:9010'
  Write-Host '[PASS] AJN BUZZ V5.4 PRODUCTION PREVIEW READY' -ForegroundColor Green
  Write-Host 'Press Ctrl+C when finished. The production server remains open in this PowerShell session.' -ForegroundColor Yellow

  while(!$server.HasExited){Start-Sleep -Seconds 2}
}
finally{
  if($server -and !$server.HasExited){Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue}
}
