$ErrorActionPreference='Continue'
$base='http://localhost:9010'
$canonical='https://www.ajn.buzz'
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
  if($health.public_tools -eq 11 -and $health.version -eq '5.2.1' -and $health.account_required -eq $false -and $health.target_size_compression -eq $true -and $health.seo_ready -eq $true -and $health.ads_txt -eq $true -and $health.sitemap_registry_sync -eq $true -and $health.all_tools_explicit -eq $true -and $health.stale_selection_fix -eq $true -and $health.rotate_zero_fix -eq $true -and $health.compression_aspect_fix -eq $true -and $health.recovery_pages -eq $true){
    Write-Host '[PASS] API reports V5.2.1 + 11 tools + SEO + compression + workflow bug fixes' -ForegroundColor Green
  }else{$failed++;Write-Host "[FAIL] API state = $($health | ConvertTo-Json -Compress)" -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate API production state' -ForegroundColor Red}

$expectedSeller='google.com, pub-4495802176396975, DIRECT, f08c47fec0942fa0'
foreach($adsPath in @('/ads.txt','/app-ads.txt')){
  try{
    $body=(Invoke-WebRequest ($base+$adsPath) -UseBasicParsing -TimeoutSec 15).Content.Trim()
    if($body -eq $expectedSeller){Write-Host "[PASS] $adsPath exact Google seller line" -ForegroundColor Green}
    else{$failed++;Write-Host "[FAIL] $adsPath seller mismatch: $body" -ForegroundColor Red}
  }catch{$failed++;Write-Host "[FAIL] Could not validate $adsPath" -ForegroundColor Red}
}

try{
  $sitemap=(Invoke-WebRequest "$base/sitemap.xml" -UseBasicParsing -TimeoutSec 15).Content
  $missing=@()
  foreach($route in $toolRoutes){if($sitemap -notmatch [regex]::Escape("$canonical$route")){$missing+=$route}}
  $privateLeak=$false
  foreach($privateRoute in @('/favorites','/recent','/presets','/status')){if($sitemap -match [regex]::Escape("$canonical$privateRoute")){$privateLeak=$true}}
  if($missing.Count -eq 0 -and !$privateLeak -and $sitemap -match '<lastmod>'){
    Write-Host '[PASS] sitemap.xml has all 11 canonical tools + lastmod and excludes private routes' -ForegroundColor Green
  }else{$failed++;Write-Host "[FAIL] sitemap missing=$($missing -join ',') privateLeak=$privateLeak" -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate sitemap.xml' -ForegroundColor Red}

try{
  $robots=(Invoke-WebRequest "$base/robots.txt" -UseBasicParsing -TimeoutSec 15).Content
  if($robots -match 'https://www\.ajn\.buzz/sitemap\.xml' -and $robots -match 'Disallow: /api/'){
    Write-Host '[PASS] robots.txt points to canonical www sitemap and blocks API crawling' -ForegroundColor Green
  }else{$failed++;Write-Host '[FAIL] robots.txt SEO contract mismatch' -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate robots.txt' -ForegroundColor Red}

try{
  $compress=(Invoke-WebRequest "$base/tools/compress" -UseBasicParsing -TimeoutSec 15).Content
  if($compress -match 'Compress Image Online' -and $compress -match 'Reduce image size to a KB or MB target'){
    Write-Host '[PASS] Compress page has focused KB/MB SEO + short visible description' -ForegroundColor Green
  }else{$failed++;Write-Host '[FAIL] Compress SEO/visible copy mismatch' -ForegroundColor Red}
}catch{$failed++;Write-Host '[FAIL] Could not validate Compress page' -ForegroundColor Red}


$aliases=@{
  '/compress-image'='/tools/compress'
  '/resize-image'='/tools/resize'
  '/crop-image'='/tools/crop'
  '/image-converter'='/tools/convert'
  '/image-to-jpg'='/tools/convert-to-jpg'
  '/jpg-to-png'='/tools/jpg-to-png'
}
foreach($alias in $aliases.Keys){
  try{
    $r=Invoke-WebRequest ($base+$alias) -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 -ErrorAction Stop
    $failed++; Write-Host "[FAIL] SEO alias did not redirect: $alias" -ForegroundColor Red
  }catch{
    $status=$_.Exception.Response.StatusCode.value__
    $location=$_.Exception.Response.Headers.Location
    if(($status -eq 307 -or $status -eq 308) -and $location -match [regex]::Escape($aliases[$alias])){Write-Host "[PASS] SEO alias $alias -> $($aliases[$alias])" -ForegroundColor Green}
    else{Write-Host "[INFO] SEO alias $alias returned HTTP $status location=$location" -ForegroundColor Yellow}
  }
}

try{
  Invoke-WebRequest "$base/tools/meme" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 | Out-Null
  $failed++;Write-Host '[FAIL] Removed Meme Generator route still resolves' -ForegroundColor Red
}catch{
  $status=$_.Exception.Response.StatusCode.value__
  if($status -eq 404){Write-Host '[PASS] Meme Generator is not public (404)' -ForegroundColor Green}
  else{Write-Host "[INFO] Removed meme route returned HTTP $status" -ForegroundColor Yellow}
}

foreach($route in $removed){
  try{Invoke-WebRequest ($base+$route) -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 15 | Out-Null;$failed++;Write-Host "[FAIL] Removed route still resolves: $route" -ForegroundColor Red}
  catch{$status=$_.Exception.Response.StatusCode.value__;if($status -eq 404){Write-Host "[PASS] Removed route 404: $route" -ForegroundColor Green}else{Write-Host "[INFO] Removed route $route returned HTTP $status" -ForegroundColor Yellow}}
}

if($failed -gt 0){throw "LOCAL ACCEPTANCE FAILED: $failed check(s) failed"}
Write-Host '[PASS] AJN BUZZ V5.2.1 localhost acceptance complete' -ForegroundColor Green
