$ErrorActionPreference='Continue'
$base='http://localhost:9010'
$canonical='https://www.ajn.buzz'
$toolIds=@('compress','compress-to-kb','resize','resize-cm','resize-mm','resize-inches','photo-size-converter','crop','aspect-ratio-crop','passport-photo-maker','id-photo-maker','photo-35x45','photo-2x2','dpi-changer','signature-maker','signature-upload-crop','signature-resize','signature-size-reducer','signature-background-remover','signature-to-png','photo-editor','watermark','background-remover','change-background','upscale','rotate','remove-metadata','convert','convert-to-jpg','jpg-to-png')
$toolRoutes=$toolIds | ForEach-Object {"/tools/$_"}
$routes=@('/','/tools','/features','/favorites','/recent','/presets','/help','/faq','/about','/status','/privacy','/terms','/contact','/robots.txt','/sitemap.xml','/manifest.webmanifest','/ads.txt','/app-ads.txt','/api/health','/api/config','/bot') + $toolRoutes
$removed=@('/workspace','/pricing','/login','/signup','/forgot-password','/account','/account/profile','/account/security','/account/billing','/admin','/api/billing/status','/api/billing/order')
$failed=0

foreach($route in $routes){
  try{
    $r=Invoke-WebRequest ($base+$route) -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 15
    if($r.StatusCode -eq 200){Write-Host ("[PASS] {0,-40} HTTP {1}" -f $route,$r.StatusCode) -ForegroundColor Green}
    else{$failed++;Write-Host ("[FAIL] {0,-40} HTTP {1}" -f $route,$r.StatusCode) -ForegroundColor Red}
  }catch{$failed++;Write-Host ("[FAIL] {0,-40} {1}" -f $route,$_.Exception.Message) -ForegroundColor Red}
}

try{
  $health=Invoke-RestMethod "$base/api/health" -TimeoutSec 15
  if($health.public_tools -eq 30 -and $health.version -eq '6.1.0' -and $health.account_required -eq $false -and $health.photo_signature_suite -eq $true -and $health.dpi_tools -eq $true -and $health.signature_tools -eq $true -and $health.photo_presets -eq $true){
    Write-Host '[PASS] API reports V6.1 + 30 tools + photo/signature/DPI suite' -ForegroundColor Green
  }else{$failed++;Write-Host "[FAIL] API state = $($health | ConvertTo-Json -Compress)" -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate API production state' -ForegroundColor Red}

$expectedSeller='google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0'
foreach($adsPath in @('/ads.txt','/app-ads.txt')){
  try{$body=(Invoke-WebRequest ($base+$adsPath) -UseBasicParsing -TimeoutSec 15).Content.Trim();if($body -eq $expectedSeller){Write-Host "[PASS] $adsPath exact Google seller line" -ForegroundColor Green}else{$failed++;Write-Host "[FAIL] $adsPath seller mismatch: $body" -ForegroundColor Red}}
  catch{$failed++;Write-Host "[FAIL] Could not validate $adsPath" -ForegroundColor Red}
}

try{
  $sitemap=(Invoke-WebRequest "$base/sitemap.xml" -UseBasicParsing -TimeoutSec 15).Content
  $missing=@();foreach($route in $toolRoutes){if($sitemap -notmatch [regex]::Escape("$canonical$route")){$missing+=$route}}
  $privateLeak=$false;foreach($privateRoute in @('/favorites','/recent','/presets','/status')){if($sitemap -match [regex]::Escape("$canonical$privateRoute")){$privateLeak=$true}}
  if($missing.Count -eq 0 -and !$privateLeak -and $sitemap -match '<lastmod>'){Write-Host '[PASS] sitemap.xml has all 30 canonical tools + lastmod and excludes private routes' -ForegroundColor Green}
  else{$failed++;Write-Host "[FAIL] sitemap missing=$($missing -join ',') privateLeak=$privateLeak" -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate sitemap.xml' -ForegroundColor Red}

try{$robots=(Invoke-WebRequest "$base/robots.txt" -UseBasicParsing -TimeoutSec 15).Content;if($robots -match 'https://www\.ajn\.buzz/sitemap\.xml' -and $robots -match 'Disallow: /api/'){Write-Host '[PASS] robots.txt SEO contract' -ForegroundColor Green}else{$failed++;Write-Host '[FAIL] robots.txt SEO contract mismatch' -ForegroundColor Red}}catch{$failed++;Write-Host '[FAIL] Could not validate robots.txt' -ForegroundColor Red}

foreach($route in $removed){try{Invoke-WebRequest ($base+$route) -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 | Out-Null;$failed++;Write-Host "[FAIL] Removed route still resolves: $route" -ForegroundColor Red}catch{$status=$_.Exception.Response.StatusCode.value__;if($status -eq 404){Write-Host "[PASS] Removed route 404: $route" -ForegroundColor Green}else{Write-Host "[INFO] Removed route $route returned HTTP $status" -ForegroundColor Yellow}}}

if($failed -gt 0){throw "LOCAL ACCEPTANCE FAILED: $failed check(s) failed"}
Write-Host '[PASS] AJN BUZZ V6.1 localhost acceptance complete' -ForegroundColor Green
