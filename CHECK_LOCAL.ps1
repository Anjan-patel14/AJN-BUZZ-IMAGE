$ErrorActionPreference='Stop'
$base='http://localhost:9010'
$canonical='https://www.ajn.buzz'
$failed=0

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ' AJN BUZZ V5.4 :: LOCAL PRODUCTION ACCEPTANCE' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

$routes=@(
  '/',
  '/tools',
  '/features',
  '/favorites',
  '/recent',
  '/presets',
  '/help',
  '/faq',
  '/about',
  '/status',
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

foreach($route in $routes){
  try{
    $response=Invoke-WebRequest ($base+$route) -UseBasicParsing -TimeoutSec 15
    if($response.StatusCode -eq 200){Write-Host "[PASS] $route" -ForegroundColor Green}
    else{$failed++;Write-Host "[FAIL] $route HTTP $($response.StatusCode)" -ForegroundColor Red}
  }catch{$failed++;Write-Host "[FAIL] $route :: $($_.Exception.Message)" -ForegroundColor Red}
}

try{
  $health=Invoke-RestMethod "$base/api/health" -TimeoutSec 15
  if(
    $health.version -eq '5.4.0' -and
    $health.public_tools -eq 11 -and
    $health.target_size_compression -eq $true -and
    $health.remove_watermark_local_inpainting -eq $true -and
    $health.html_to_image_local_rendering -eq $true -and
    $health.output_validation -eq $true -and
    $health.all_tools_explicit -eq $true -and
    $health.account_required -eq $false
  ){
    Write-Host '[PASS] API reports V5.4 + 11 tools + HTML to Image + Remove Watermark' -ForegroundColor Green
  }else{
    $failed++
    Write-Host "[FAIL] Health contract = $($health | ConvertTo-Json -Compress)" -ForegroundColor Red
  }
}catch{$failed++;Write-Host '[FAIL] Could not validate health API' -ForegroundColor Red}

try{
  $config=Invoke-RestMethod "$base/api/config" -TimeoutSec 15
  if($config.qr_ajn -eq 'https://qrajn.online' -and $config.pdf_shortcuts -eq 'https://ajnpdf.com'){
    Write-Host '[PASS] AJN Network config has AJN PDF + QR AJN' -ForegroundColor Green
  }else{$failed++;Write-Host '[FAIL] AJN Network config mismatch' -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate config API' -ForegroundColor Red}

try{
  $home=(Invoke-WebRequest "$base/" -UseBasicParsing -TimeoutSec 15).Content
  foreach($marker in @('Image tools that do the','actual work.','Explore the AJN Network','https://ajnpdf.com','https://qrajn.online','Compress Image')){
    if($home -notmatch [regex]::Escape($marker)){$failed++;Write-Host "[FAIL] Homepage missing: $marker" -ForegroundColor Red}
  }
  if($failed -eq 0){Write-Host '[PASS] Concept homepage + AJN Network markers' -ForegroundColor Green}
}catch{$failed++;Write-Host '[FAIL] Could not validate homepage concept' -ForegroundColor Red}

try{
  $sitemap=(Invoke-WebRequest "$base/sitemap.xml" -UseBasicParsing -TimeoutSec 15).Content
  $missing=@()
  foreach($route in @('/tools/compress','/tools/resize','/tools/crop','/tools/convert','/tools/remove-watermark','/tools/rotate','/tools/watermark','/tools/photo-editor','/tools/upscale','/tools/html-to-image','/tools/jpg-to-png')){
    if($sitemap -notmatch [regex]::Escape("$canonical$route")){$missing+=$route}
  }
  $legacy=$sitemap -match '/tools/convert-to-jpg|/tools/background-remover'
  if($missing.Count -eq 0 -and !$legacy){Write-Host '[PASS] Sitemap has exact V5.4 tool set' -ForegroundColor Green}
  else{$failed++;Write-Host "[FAIL] sitemap missing=$($missing -join ',') legacy=$legacy" -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate sitemap.xml' -ForegroundColor Red}

$expectedSeller='google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0'
foreach($adsPath in @('/ads.txt','/app-ads.txt')){
  try{
    $body=(Invoke-WebRequest ($base+$adsPath) -UseBasicParsing -TimeoutSec 15).Content.Trim()
    if($body -eq $expectedSeller){Write-Host "[PASS] $adsPath seller line" -ForegroundColor Green}
    else{$failed++;Write-Host "[FAIL] $adsPath seller mismatch" -ForegroundColor Red}
  }catch{$failed++;Write-Host "[FAIL] $adsPath unavailable" -ForegroundColor Red}
}

try{
  Invoke-WebRequest "$base/tools/convert-to-jpg" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 -ErrorAction Stop | Out-Null
  $failed++
  Write-Host '[FAIL] legacy /tools/convert-to-jpg still resolves' -ForegroundColor Red
}catch{
  $status=$_.Exception.Response.StatusCode.value__
  if($status -eq 404){Write-Host '[PASS] legacy /tools/convert-to-jpg is 404' -ForegroundColor Green}
  else{Write-Host "[INFO] legacy tool returned HTTP $status" -ForegroundColor Yellow}
}

if($failed -gt 0){throw "AJN BUZZ V5.4 LOCAL ACCEPTANCE FAILED: $failed check(s)"}
Write-Host '============================================================' -ForegroundColor Green
Write-Host ' PASS: AJN BUZZ V5.4 LOCAL PRODUCTION ACCEPTANCE' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
