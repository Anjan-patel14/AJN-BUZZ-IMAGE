$ErrorActionPreference = 'Stop'

$FallbackRepo = "C:\Users\ANJAN PATEL\Downloads\AJN_BUZZ_IMAGE_PRODUCTION_V5_0_TEST\AJN_BUZZ_IMAGE_PRODUCTION_V5_0"
$Zip = Join-Path $env:USERPROFILE 'Downloads\AJN_BUZZ_IMAGE_V5_4_EXACT_CONCEPT_PRODUCTION.zip'
$ExpectedRemote = 'git@github.com:Anjan-patel14/AJN-BUZZ-IMAGE.git'
$Temp = Join-Path $env:TEMP 'AJN_BUZZ_V54_APPLY'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Backup = Join-Path $env:USERPROFILE "Downloads\AJN_BUZZ_BEFORE_V5_4_$Stamp"
$Port = 9011
$Base = "http://127.0.0.1:$Port"
$ServerOut = Join-Path $env:TEMP "ajn_buzz_v54_$Stamp.out.log"
$ServerErr = Join-Path $env:TEMP "ajn_buzz_v54_$Stamp.err.log"

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' AJN BUZZ V5.4 :: CONCEPT + LOGIC PRODUCTION GATE + SSH PUSH' -ForegroundColor Cyan
Write-Host ' NO PUSH UNLESS VERIFY + TEST + LINT + TYPE + BUILD + LIVE QA PASS' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

function Resolve-AjnRepo {
  $Current = (Get-Location).Path
  foreach($Candidate in @($Current, $FallbackRepo)) {
    if(!(Test-Path (Join-Path $Candidate '.git'))){continue}
    if(!(Test-Path (Join-Path $Candidate 'package.json'))){continue}
    try{
      $Pkg = Get-Content (Join-Path $Candidate 'package.json') -Raw | ConvertFrom-Json
      if($Pkg.name -eq 'ajn-buzz-image'){return $Candidate}
    }catch{}
  }
  throw "AJN BUZZ Git repository not found. Expected: $FallbackRepo"
}

$Repo = Resolve-AjnRepo
Set-Location $Repo
Write-Host "Repository: $Repo" -ForegroundColor Green

if(!(Test-Path $Zip)){throw "V5.4 ZIP not found in Downloads: $Zip"}

$Remote = (git remote get-url origin 2>$null)
if(!$Remote -or $Remote -notmatch 'Anjan-patel14/AJN-BUZZ-IMAGE'){
  throw "Wrong Git repository remote: $Remote"
}
git remote set-url origin $ExpectedRemote

Write-Host '[1/10] GitHub sync guard + recovery backup...' -ForegroundColor Cyan
git fetch origin main
if($LASTEXITCODE -ne 0){throw 'git fetch failed'}

$Head = (git rev-parse HEAD).Trim()
$OriginHead = (git rev-parse origin/main).Trim()
if($Head -ne $OriginHead){
  throw "Local HEAD differs from GitHub main. Local=$Head Remote=$OriginHead. Stop to avoid mixing histories."
}

New-Item -ItemType Directory -Force -Path $Backup | Out-Null
git status --short | Set-Content -LiteralPath (Join-Path $Backup 'git-status-before.txt') -Encoding UTF8
git diff --binary | Set-Content -LiteralPath (Join-Path $Backup 'tracked-changes.patch') -Encoding UTF8
git ls-files --others --exclude-standard | Set-Content -LiteralPath (Join-Path $Backup 'untracked-files.txt') -Encoding UTF8
$BackupSource = Join-Path $Backup 'source-copy'
New-Item -ItemType Directory -Force -Path $BackupSource | Out-Null
robocopy $Repo $BackupSource /E /NFL /NDL /NJH /NJS /NP /XD .git node_modules .next /XF .env.local | Out-Null
$BackupCode = $LASTEXITCODE
if($BackupCode -gt 7){throw "Backup copy failed. Robocopy code: $BackupCode"}
Write-Host "[PASS] Recovery backup: $Backup" -ForegroundColor Green

Write-Host '[2/10] Applying AJN BUZZ V5.4 package...' -ForegroundColor Cyan
if(Test-Path $Temp){Remove-Item $Temp -Recurse -Force}
New-Item -ItemType Directory -Force -Path $Temp | Out-Null
Expand-Archive -LiteralPath $Zip -DestinationPath $Temp -Force

$Source = Get-ChildItem $Temp -Directory -Recurse |
  Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } |
  Select-Object -First 1 -ExpandProperty FullName
if(!$Source -and (Test-Path (Join-Path $Temp 'package.json'))){$Source=$Temp}
if(!$Source){throw 'V5.4 ZIP structure is invalid: package.json not found'}

$SourcePkg = Get-Content (Join-Path $Source 'package.json') -Raw | ConvertFrom-Json
if($SourcePkg.name -ne 'ajn-buzz-image' -or $SourcePkg.version -ne '5.4.0'){
  throw "Wrong source package: $($SourcePkg.name) $($SourcePkg.version)"
}

robocopy $Source $Repo /E /NFL /NDL /NJH /NJS /NP /XD node_modules .next .git /XF .env.local | Out-Null
$RoboCode = $LASTEXITCODE
if($RoboCode -gt 7){throw "V5.4 source copy failed. Robocopy code: $RoboCode"}

Remove-Item (Join-Path $Repo 'SAFE_PUSH_AJN_BUZZ_V5_3.ps1') -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $Repo 'V5_3_BUILD_REPORT.txt') -Force -ErrorAction SilentlyContinue

$Pkg = Get-Content '.\package.json' -Raw | ConvertFrom-Json
if($Pkg.version -ne '5.4.0'){throw "V5.4 apply failed. Current version: $($Pkg.version)"}
Write-Host '[PASS] V5.4 source applied without touching .env.local.' -ForegroundColor Green

Write-Host '[3/10] Installing exact dependencies...' -ForegroundColor Cyan
npm.cmd install --include=dev --no-audit --no-fund
if($LASTEXITCODE -ne 0){throw 'npm install failed. Nothing will be pushed.'}

$env:ESLINT_USE_FLAT_CONFIG='false'

Write-Host '[4/10] Project-owned formatting...' -ForegroundColor Cyan
$Prettier = Join-Path $Repo 'node_modules\.bin\prettier.cmd'
if(!(Test-Path $Prettier)){throw 'Local Prettier executable is missing'}
& $Prettier --write 'src/**/*.{ts,tsx,css}' 'scripts/**/*.mjs' 'next.config.mjs' 'package.json' 'README.md' '.eslintrc.json' '.prettierrc.json'
if($LASTEXITCODE -ne 0){throw 'Prettier failed. Nothing will be pushed.'}

Write-Host '[5/10] Source verifier + processing logic tests...' -ForegroundColor Cyan
npm.cmd run verify
if($LASTEXITCODE -ne 0){throw 'Source verification failed. Nothing will be pushed.'}
npm.cmd run test:logic
if($LASTEXITCODE -ne 0){throw 'Logic tests failed. Nothing will be pushed.'}

Write-Host '[6/10] Zero-warning ESLint + full TypeScript...' -ForegroundColor Cyan
npm.cmd run lint
if($LASTEXITCODE -ne 0){throw 'ESLint failed. Nothing will be pushed.'}
npm.cmd run typecheck
if($LASTEXITCODE -ne 0){throw 'TypeScript failed. Nothing will be pushed.'}

Write-Host '[7/10] Clean optimized Next.js production build...' -ForegroundColor Cyan
Remove-Item '.\.next' -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
if($LASTEXITCODE -ne 0){throw 'Next.js production build failed. Nothing will be pushed.'}

Write-Host '[8/10] Optimized localhost production QA...' -ForegroundColor Cyan
$Server = $null
try{
  Remove-Item $ServerOut,$ServerErr -Force -ErrorAction SilentlyContinue
  $Next = Join-Path $Repo 'node_modules\.bin\next.cmd'
  if(!(Test-Path $Next)){throw 'Local Next.js executable missing'}

  $NextCommand = "`"$Next`" start -p $Port"
  $Server = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c',$NextCommand) -WorkingDirectory $Repo -PassThru -WindowStyle Hidden -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr

  $Ready=$false
  for($i=0;$i -lt 60;$i++){
    Start-Sleep -Seconds 1
    if($Server.HasExited){break}
    try{
      $Health=Invoke-RestMethod "$Base/api/health" -TimeoutSec 3
      if($Health.status -eq 'ok'){$Ready=$true;break}
    }catch{}
  }

  if(!$Ready){
    Write-Host '--- SERVER STDOUT ---' -ForegroundColor Yellow
    if(Test-Path $ServerOut){Get-Content $ServerOut -Tail 100}
    Write-Host '--- SERVER STDERR ---' -ForegroundColor Yellow
    if(Test-Path $ServerErr){Get-Content $ServerErr -Tail 100}
    throw 'Optimized production server did not become ready.'
  }

  $Health=Invoke-RestMethod "$Base/api/health" -TimeoutSec 10
  if(
    $Health.version -ne '5.4.0' -or
    $Health.public_tools -ne 11 -or
    $Health.target_size_compression -ne $true -or
    $Health.remove_watermark_local_inpainting -ne $true -or
    $Health.html_to_image_local_rendering -ne $true -or
    $Health.output_validation -ne $true -or
    $Health.all_tools_explicit -ne $true
  ){
    throw "Health contract mismatch: $($Health | ConvertTo-Json -Compress)"
  }

  $Config=Invoke-RestMethod "$Base/api/config" -TimeoutSec 10
  if($Config.qr_ajn -ne 'https://qrajn.online' -or $Config.pdf_shortcuts -ne 'https://ajnpdf.com'){
    throw 'AJN Network API config mismatch.'
  }

  $Routes=@(
    '/',
    '/tools',
    '/features',
    '/help',
    '/faq',
    '/about',
    '/privacy',
    '/terms',
    '/contact',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
    '/ads.txt',
    '/app-ads.txt',
    '/api/health',
    '/api/config',
    '/tools/compress',
    '/tools/resize',
    '/tools/crop',
    '/tools/convert',
    '/tools/remove-watermark',
    '/tools/rotate',
    '/tools/watermark',
    '/tools/photo-editor',
    '/tools/upscale',
    '/tools/html-to-image',
    '/tools/jpg-to-png'
  )

  foreach($Route in $Routes){
    $Response=Invoke-WebRequest ($Base+$Route) -UseBasicParsing -TimeoutSec 15
    if($Response.StatusCode -ne 200){throw "Route failed: $Route HTTP $($Response.StatusCode)"}
    Write-Host "[PASS] $Route" -ForegroundColor Green
  }

  $HomePageHtml=(Invoke-WebRequest "$Base/" -UseBasicParsing -TimeoutSec 15).Content
  foreach($Marker in @('Image tools that do the','actual work.','Main Image Tools','More Image Tools','Explore the AJN Network','https://ajnpdf.com','https://qrajn.online')){
    if($HomePageHtml -notmatch [regex]::Escape($Marker)){throw "Homepage concept marker missing: $Marker"}
  }
  Write-Host '[PASS] Concept homepage + AJN PDF + QR AJN promotion' -ForegroundColor Green

  $Sitemap=(Invoke-WebRequest "$Base/sitemap.xml" -UseBasicParsing -TimeoutSec 15).Content
  foreach($Route in @('/tools/compress','/tools/resize','/tools/crop','/tools/convert','/tools/remove-watermark','/tools/rotate','/tools/watermark','/tools/photo-editor','/tools/upscale','/tools/html-to-image','/tools/jpg-to-png')){
    if($Sitemap -notmatch [regex]::Escape("https://www.ajn.buzz$Route")){throw "Sitemap missing: $Route"}
  }
  if($Sitemap -match '/tools/convert-to-jpg|/tools/background-remover'){throw 'Legacy tool leaked into sitemap'}
  Write-Host '[PASS] Sitemap exact 11-tool registry' -ForegroundColor Green

  $Seller='google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0'
  foreach($AdsPath in @('/ads.txt','/app-ads.txt')){
    $Body=(Invoke-WebRequest ($Base+$AdsPath) -UseBasicParsing -TimeoutSec 15).Content.Trim()
    if($Body -ne $Seller){throw "$AdsPath seller record mismatch"}
  }
  Write-Host '[PASS] AdSense seller records' -ForegroundColor Green

  try{
    Invoke-WebRequest "$Base/tools/convert-to-jpg" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 -ErrorAction Stop | Out-Null
    throw 'Legacy /tools/convert-to-jpg still resolves'
  }catch{
    $Status=$_.Exception.Response.StatusCode.value__
    if($Status -ne 404 -and $_.Exception.Message -notmatch '404'){throw}
  }
  Write-Host '[PASS] Legacy Image to JPG public route removed' -ForegroundColor Green
}
finally{
  if($Server -and !$Server.HasExited){Stop-Process -Id $Server.Id -Force -ErrorAction SilentlyContinue}
}

Write-Host '[9/10] Final Git integrity + race guard...' -ForegroundColor Cyan
git diff --check
if($LASTEXITCODE -ne 0){throw 'git diff --check failed. Nothing will be pushed.'}

git fetch origin main
if($LASTEXITCODE -ne 0){throw 'Final git fetch failed.'}
$OriginNow=(git rev-parse origin/main).Trim()
if($OriginNow -ne $OriginHead){
  throw "GitHub main changed during validation. Old=$OriginHead New=$OriginNow. Nothing will be pushed."
}

git add -A
$Pending=@(git status --porcelain)
if($Pending.Count -eq 0){
  Write-Host '[INFO] No changes to commit.' -ForegroundColor Yellow
}else{
  git commit -m 'AJN BUZZ V5.4 concept homepage QR AJN and HTML image release'
  if($LASTEXITCODE -ne 0){throw 'git commit failed'}
}

Write-Host '[10/10] GitHub SSH push...' -ForegroundColor Cyan
git push -u origin main
if($LASTEXITCODE -ne 0){throw 'GitHub SSH push failed'}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host ' PASS: AJN BUZZ V5.4 VERIFIED + TESTED + BUILT + PUSHED' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host 'Latest commit:' -ForegroundColor Cyan
git log --oneline -1
Write-Host 'Git status:' -ForegroundColor Cyan
git status --short
