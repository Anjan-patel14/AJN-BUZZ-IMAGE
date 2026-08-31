$ErrorActionPreference='Continue'
$base='http://localhost:9010'
$routes=@('/','/tools','/features','/favorites','/recent','/presets','/help','/faq','/about','/status','/privacy','/terms','/contact','/robots.txt','/sitemap.xml','/manifest.webmanifest','/ads.txt','/app-ads.txt','/api/health','/api/config','/tools/compress','/tools/resize','/tools/crop','/tools/convert','/tools/photo-editor','/tools/watermark','/tools/background-remover','/tools/upscale','/tools/rotate','/tools/convert-to-jpg','/tools/jpg-to-png')
$removed=@('/workspace','/pricing','/login','/signup','/forgot-password','/account','/account/profile','/account/security','/account/billing','/admin','/api/billing/status','/api/billing/order')
$toolRoutes=@('/tools/compress','/tools/resize','/tools/crop','/tools/convert','/tools/photo-editor','/tools/watermark','/tools/background-remover','/tools/upscale','/tools/rotate','/tools/convert-to-jpg','/tools/jpg-to-png')
$failed=0

foreach($route in $routes){
  try{
    $r=Invoke-WebRequest ($base+$route) -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 15
    if($r.StatusCode -eq 200){Write-Host ("[PASS] {0,-34} HTTP {1}" -f $route,$r.StatusCode) -ForegroundColor Green}
    else{$failed++;Write-Host ("[FAIL] {0,-34} HTTP {1}" -f $route,$r.StatusCode) -ForegroundColor Red}
  }catch{$failed++;Write-Host ("[FAIL] {0,-34} {1}" -f $route,$_.Exception.Message) -ForegroundColor Red}
}

try{
  $health=Invoke-RestMethod "$base/api/health" -TimeoutSec 15
  if($health.public_tools -eq 11 -and $health.version -eq '5.0.0' -and $health.account_required -eq $false -and $health.target_size_compression -eq $true -and $health.seo_ready -eq $true -and $health.ads_txt -eq $true -and $health.sitemap_registry_sync -eq $true -and $health.all_tools_explicit -eq $true){
    Write-Host '[PASS] API reports V5.0 + 11 explicit tools + SEO + ads.txt + registry sitemap' -ForegroundColor Green
  }else{
    $failed++
    Write-Host "[FAIL] API state = $($health | ConvertTo-Json -Compress)" -ForegroundColor Red
  }
}catch{$failed++;Write-Host '[FAIL] Could not validate API production state' -ForegroundColor Red}

$expectedSeller='google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0'
foreach($adsPath in @('/ads.txt','/app-ads.txt')){
  try{
    $body=(Invoke-WebRequest ($base+$adsPath) -UseBasicParsing -TimeoutSec 15).Content.Trim()
    if($body -eq $expectedSeller){Write-Host "[PASS] $adsPath exact Google seller line" -ForegroundColor Green}
    else{$failed++;Write-Host "[FAIL] $adsPath seller line mismatch: $body" -ForegroundColor Red}
  }catch{$failed++;Write-Host "[FAIL] Could not validate $adsPath" -ForegroundColor Red}
}

try{
  $sitemap=(Invoke-WebRequest "$base/sitemap.xml" -UseBasicParsing -TimeoutSec 15).Content
  $missing=@()
  foreach($route in $toolRoutes){
    if($sitemap -notmatch [regex]::Escape("https://ajn.buzz$route")){$missing+=$route}
  }
  $privateLeak=$false
  foreach($privateRoute in @('/favorites','/recent','/presets','/status')){
    if($sitemap -match [regex]::Escape("https://ajn.buzz$privateRoute")){$privateLeak=$true}
  }
  if($missing.Count -eq 0 -and !$privateLeak){
    Write-Host '[PASS] sitemap.xml contains all 11 canonical image tools and excludes private/noindex routes' -ForegroundColor Green
  }else{
    $failed++
    Write-Host "[FAIL] sitemap missing=$($missing -join ',') privateLeak=$privateLeak" -ForegroundColor Red
  }
}catch{$failed++;Write-Host '[FAIL] Could not validate sitemap.xml contents' -ForegroundColor Red}

try{
  $robots=(Invoke-WebRequest "$base/robots.txt" -UseBasicParsing -TimeoutSec 15).Content
  if($robots -match 'https://ajn\.buzz/sitemap\.xml' -and $robots -match 'Disallow: /api/'){
    Write-Host '[PASS] robots.txt points to production sitemap and blocks API crawling' -ForegroundColor Green
  }else{$failed++;Write-Host '[FAIL] robots.txt SEO contract mismatch' -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate robots.txt' -ForegroundColor Red}

try{
  Invoke-WebRequest "$base/tools/meme" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 | Out-Null
  $failed++
  Write-Host '[FAIL] Removed Meme Generator route still resolves' -ForegroundColor Red
}catch{
  $status=$_.Exception.Response.StatusCode.value__
  if($status -eq 404){Write-Host '[PASS] Meme Generator is not public (404)' -ForegroundColor Green}
  else{Write-Host "[INFO] Removed meme route returned HTTP $status" -ForegroundColor Yellow}
}

foreach($route in $removed){
  try{
    Invoke-WebRequest ($base+$route) -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 | Out-Null
    $failed++
    Write-Host "[FAIL] Removed route still resolves: $route" -ForegroundColor Red
  }catch{
    $status=$_.Exception.Response.StatusCode.value__
    if($status -eq 404){Write-Host "[PASS] Removed route 404: $route" -ForegroundColor Green}
    else{Write-Host "[INFO] Removed route $route returned HTTP $status" -ForegroundColor Yellow}
  }
}

if($failed -gt 0){throw "LOCAL ACCEPTANCE FAILED: $failed check(s) failed"}
Write-Host '[PASS] AJN BUZZ V5.0 localhost acceptance complete' -ForegroundColor Green
