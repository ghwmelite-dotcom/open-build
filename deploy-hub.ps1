# Open Build — one-command hub deploy.
# Publishes index.html + PWA files + the brand assets the site references to
# Cloudflare Pages (project "open-build"). Run from the repo root:  .\deploy-hub.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$env:CLOUDFLARE_ACCOUNT_ID = "ea2eb3a9813660dfca2a60e594858538"

$pub = Join-Path $root ".pages-publish"
Remove-Item -Recurse -Force $pub -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $pub | Out-Null

Copy-Item (Join-Path $root "index.html"),(Join-Path $root "manifest.json"),(Join-Path $root "sw.js") $pub
Copy-Item (Join-Path $root "brand\og-card.png"),(Join-Path $root "brand\open-build-icon-192.png"),(Join-Path $root "brand\open-build-icon-512.png") $pub

# Use the wrangler installed in vote-backend, but run from the repo root so it
# does NOT pick up the worker's wrangler.toml.
$wrangler = Join-Path $root "vote-backend\node_modules\.bin\wrangler.cmd"
& $wrangler pages deploy $pub --project-name=open-build --branch=main
$code = $LASTEXITCODE

Remove-Item -Recurse -Force $pub -ErrorAction SilentlyContinue
if ($code -ne 0) { Write-Host "`n[X] Deploy failed (exit $code)."; exit $code }
Write-Host "`n[OK] Hub deployed. Live at https://open-build.ohwpstudios.org (hard-refresh to see changes)."
