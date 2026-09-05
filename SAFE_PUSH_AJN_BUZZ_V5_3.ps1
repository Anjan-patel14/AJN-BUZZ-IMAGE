$ErrorActionPreference = 'Stop'

$ExpectedRemote = 'git@github.com:Anjan-patel14/AJN-BUZZ-IMAGE.git'
$Zip = Join-Path $env:USERPROFILE 'Downloads\AJN_BUZZ_IMAGE_V5_3_LOGIC_PRODUCTION.zip'
$KnownRepo = Join-Path $env:USERPROFILE 'Downloads\AJN_BUZZ_IMAGE_PRODUCTION_V5_0_TEST\AJN_BUZZ_IMAGE_PRODUCTION_V5_0'
$Temp = Join-Path $env:TEMP 'AJN_BUZZ_V5_3_APPLY'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Port = 9011
$Base = "http://127.0.0.1:$Port"
$ServerOut = Join-Path $env:TEMP "ajn_buzz_v53_server_$Stamp.out.log"
$ServerErr = Join-Path $env:TEMP "ajn_buzz_v53_server_$Stamp.err.log"

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' AJN BUZZ V5.3 :: LOGIC + OUTPUT PRODUCTION GATE + SSH PUSH' -ForegroundColor Cyan
Write-Host ' REMOVE BACKGROUND -> REMOVE WATERMARK' -ForegroundColor Cyan
Write-Host ' NO PUSH UNLESS VERIFY + LOGIC + LINT + TYPE + BUILD + LIVE QA PASS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

if (!(Test-Path $Zip)) {
  throw "V5.3 ZIP not found: $Zip"
}

$Current = (Get-Location).Path
$Repo = $null

if (
  (Test-Path (Join-Path $Current '.git')) -and
  (Test-Path (Join-Path $Current 'package.json'))
) {
  try {
    $CurrentPkg = Get-Content (Join-Path $Current 'package.json') -Raw | ConvertFrom-Json
    if ($CurrentPkg.name -eq 'ajn-buzz-image') {
      $Repo = $Current
    }
  } catch {}
}

if (!$Repo -and (Test-Path (Join-Path $KnownRepo '.git'))) {
  $Repo = $KnownRepo
}

if (!$Repo) {
  throw "Existing AJN BUZZ Git repository not found. Expected: $KnownRepo"
}

Set-Location $Repo
Write-Host "Repository: $Repo" -ForegroundColor DarkGray

$Remote = (git remote get-url origin 2>$null)
if (!$Remote -or $Remote -notmatch 'Anjan-patel14/AJN-BUZZ-IMAGE') {
  throw "Wrong Git repository remote: $Remote"
}
git remote set-url origin $ExpectedRemote

Write-Host '[1/10] Sync guard + safe local backup...' -ForegroundColor Cyan
git fetch origin main
if ($LASTEXITCODE -ne 0) { throw 'git fetch origin main failed.' }

$Head = (git rev-parse HEAD).Trim()
$OriginHead = (git rev-parse origin/main).Trim()
if ($Head -ne $OriginHead) {
  throw "Local HEAD and GitHub main differ. Local=$Head Remote=$OriginHead. Nothing changed."
}

$Dirty = @(git status --porcelain)
if ($Dirty.Count -gt 0) {
  $StashName = "BACKUP_BEFORE_AJN_BUZZ_V5_3_$Stamp"
  git stash push -u -m $StashName
  if ($LASTEXITCODE -ne 0) { throw 'Could not safely stash existing local changes.' }
  Write-Host "[PASS] Existing local changes saved in stash: $StashName" -ForegroundColor Green
}

Write-Host '[2/10] Applying V5.3 source over the existing AJN BUZZ repository...' -ForegroundColor Cyan
Remove-Item $Temp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $Temp | Out-Null
Expand-Archive -LiteralPath $Zip -DestinationPath $Temp -Force

$Source = Get-ChildItem -LiteralPath $Temp -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } |
  Select-Object -First 1

if (!$Source) {
  throw 'V5.3 ZIP structure is invalid: project root not found.'
}

$SourcePkg = Get-Content (Join-Path $Source.FullName 'package.json') -Raw | ConvertFrom-Json
if ($SourcePkg.name -ne 'ajn-buzz-image' -or $SourcePkg.version -ne '5.3.0') {
  throw "Wrong V5.3 source package: $($SourcePkg.name) $($SourcePkg.version)"
}

& robocopy.exe $Source.FullName $Repo /E /XD .git node_modules .next /NFL /NDL /NJH /NJS /NP | Out-Null
$RoboCode = $LASTEXITCODE
if ($RoboCode -ge 8) {
  throw "Could not apply V5.3 source. Robocopy exit code: $RoboCode"
}

$Pkg = Get-Content '.\package.json' -Raw | ConvertFrom-Json
if ($Pkg.version -ne '5.3.0') {
  throw "V5.3 apply failed. Current package version: $($Pkg.version)"
}

Write-Host '[3/10] Installing exact dependency + lint toolchain...' -ForegroundColor Cyan
npm.cmd install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) {
  throw 'npm install failed. Nothing will be committed or pushed.'
}

$env:ESLINT_USE_FLAT_CONFIG = 'false'

Write-Host '[4/10] Formatting with project-owned Prettier...' -ForegroundColor Cyan
$Prettier = Join-Path $Repo 'node_modules\.bin\prettier.cmd'
if (!(Test-Path $Prettier)) {
  throw 'Local Prettier executable is missing.'
}
& $Prettier --write 'src/**/*.{ts,tsx,css}' 'scripts/**/*.{mjs,ts}' 'next.config.mjs' 'package.json' '.eslintrc.json'
if ($LASTEXITCODE -ne 0) {
  throw 'Prettier failed. Nothing will be pushed.'
}

Write-Host '[5/10] Source verifier + V5.3 processing logic tests...' -ForegroundColor Cyan
npm.cmd run verify
if ($LASTEXITCODE -ne 0) {
  throw 'Source verification failed. Nothing will be pushed.'
}

npm.cmd run test:logic
if ($LASTEXITCODE -ne 0) {
  throw 'V5.3 processing logic tests failed. Nothing will be pushed.'
}

Write-Host '[6/10] Zero-warning ESLint + full TypeScript...' -ForegroundColor Cyan
npm.cmd run lint
if ($LASTEXITCODE -ne 0) {
  throw 'ESLint failed or emitted a blocked warning. Nothing will be pushed.'
}

npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) {
  throw 'TypeScript failed. Nothing will be pushed.'
}

Write-Host '[7/10] Clean optimized Next.js production build...' -ForegroundColor Cyan
Remove-Item '.\.next' -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
if ($LASTEXITCODE -ne 0) {
  throw 'Next.js production build failed. Nothing will be pushed.'
}

Write-Host '[8/10] Optimized localhost production acceptance...' -ForegroundColor Cyan
$Server = $null
try {
  $Next = Join-Path $Repo 'node_modules\.bin\next.cmd'
  if (!(Test-Path $Next)) {
    throw 'Local Next.js executable is missing.'
  }

  $NextCommand = "`"$Next`" start -p $Port"
  $Server = Start-Process `
    -FilePath 'cmd.exe' `
    -ArgumentList @('/c', $NextCommand) `
    -WorkingDirectory $Repo `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $ServerOut `
    -RedirectStandardError $ServerErr

  $Ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if ($Server.HasExited) { break }
    try {
      $Health = Invoke-RestMethod "$Base/api/health" -TimeoutSec 3
      if ($Health.status -eq 'ok') {
        $Ready = $true
        break
      }
    } catch {}
  }

  if (!$Ready) {
    Write-Host '--- SERVER STDOUT ---' -ForegroundColor Yellow
    if (Test-Path $ServerOut) { Get-Content $ServerOut -Tail 80 }
    Write-Host '--- SERVER STDERR ---' -ForegroundColor Yellow
    if (Test-Path $ServerErr) { Get-Content $ServerErr -Tail 80 }
    throw 'Optimized localhost server did not become ready.'
  }

  $Health = Invoke-RestMethod "$Base/api/health" -TimeoutSec 10
  if (
    $Health.version -ne '5.3.0' -or
    $Health.public_tools -ne 11 -or
    $Health.remove_watermark_local_inpainting -ne $true -or
    $Health.output_validation -ne $true -or
    $Health.all_tools_explicit -ne $true
  ) {
    throw "Health contract mismatch: $($Health | ConvertTo-Json -Compress)"
  }

  $Routes = @(
    '/',
    '/tools',
    '/tools/compress',
    '/tools/resize',
    '/tools/crop',
    '/tools/convert',
    '/tools/photo-editor',
    '/tools/watermark',
    '/tools/remove-watermark',
    '/tools/upscale',
    '/tools/rotate',
    '/tools/convert-to-jpg',
    '/tools/jpg-to-png',
    '/about',
    '/help',
    '/faq',
    '/privacy',
    '/terms',
    '/contact',
    '/robots.txt',
    '/sitemap.xml',
    '/ads.txt',
    '/app-ads.txt',
    '/api/config'
  )

  foreach ($Route in $Routes) {
    $Response = Invoke-WebRequest ($Base + $Route) -UseBasicParsing -TimeoutSec 15
    if ($Response.StatusCode -ne 200) {
      throw "Route failed: $Route HTTP $($Response.StatusCode)"
    }
    Write-Host "[PASS] $Route" -ForegroundColor Green
  }

  $Sitemap = (Invoke-WebRequest "$Base/sitemap.xml" -UseBasicParsing -TimeoutSec 15).Content
  if ($Sitemap -notmatch '/tools/remove-watermark') {
    throw 'sitemap.xml is missing /tools/remove-watermark.'
  }
  if ($Sitemap -match '/tools/background-remover') {
    throw 'Legacy background-remover leaked into sitemap.xml.'
  }

  $Seller = 'google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0'
  foreach ($AdsPath in @('/ads.txt', '/app-ads.txt')) {
    $Body = (Invoke-WebRequest ($Base + $AdsPath) -UseBasicParsing -TimeoutSec 15).Content.Trim()
    if ($Body -ne $Seller) {
      throw "$AdsPath seller record mismatch."
    }
  }

  Write-Host '[PASS] Optimized localhost production acceptance complete.' -ForegroundColor Green
}
finally {
  if ($Server -and !$Server.HasExited) {
    Stop-Process -Id $Server.Id -Force -ErrorAction SilentlyContinue
  }
}

Write-Host '[9/10] Final Git integrity + remote race check...' -ForegroundColor Cyan
git diff --check
if ($LASTEXITCODE -ne 0) {
  throw 'git diff --check failed. Nothing will be pushed.'
}

git fetch origin main
if ($LASTEXITCODE -ne 0) {
  throw 'Final git fetch failed.'
}
$OriginNow = (git rev-parse origin/main).Trim()
if ($OriginNow -ne $OriginHead) {
  throw "GitHub main changed during validation. Old=$OriginHead New=$OriginNow. Nothing will be pushed."
}

git add -A

$Pending = @(git status --porcelain)
if ($Pending.Count -eq 0) {
  Write-Host '[INFO] No new source changes to commit.' -ForegroundColor Yellow
} else {
  git commit -m 'AJN BUZZ V5.3 logic output and remove watermark production release'
  if ($LASTEXITCODE -ne 0) {
    throw 'git commit failed.'
  }
}

Write-Host '[10/10] GitHub SSH push...' -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) {
  throw 'GitHub SSH push failed.'
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host ' PASS: AJN BUZZ V5.3 VERIFIED + TESTED + BUILT + PUSHED' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host 'Latest commit:' -ForegroundColor Cyan
git log --oneline -1
Write-Host 'Git status:' -ForegroundColor Cyan
git status --short
Write-Host ''
Write-Host 'NOTE: Any pre-existing local changes were saved in Git stash and were NOT automatically reapplied.' -ForegroundColor Yellow
