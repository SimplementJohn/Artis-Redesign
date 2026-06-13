# build.ps1 — Minification pre-release Artis Redesign
# Usage: .\build.ps1
# Prerequis: npm install -g clean-css-cli terser

param(
  [switch]$Install  # passer -Install pour auto-installer les outils
)

$ext = "$PSScriptRoot\extension"

if ($Install) {
  Write-Host "Installation des outils..." -ForegroundColor Cyan
  npm install -g clean-css-cli terser
}

# Verifier les outils
$hasCleancss = Get-Command cleancss -ErrorAction SilentlyContinue
$hasTerser   = Get-Command terser   -ErrorAction SilentlyContinue

if (-not $hasCleancss -or -not $hasTerser) {
  Write-Host "Outils manquants. Lancer: .\build.ps1 -Install" -ForegroundColor Red
  exit 1
}

Write-Host "Build Artis Redesign..." -ForegroundColor Cyan

# CSS
$cssSrc  = @("app-override.css", "giles.css", "login-override.css", "options.css", "popup.css")
foreach ($f in $cssSrc) {
  $src  = "$ext\$f"
  $dest = "$ext\$([System.IO.Path]::GetFileNameWithoutExtension($f)).min.css"
  $before = [math]::Round((Get-Item $src).Length / 1KB, 1)
  cleancss -o $dest $src
  $after = [math]::Round((Get-Item $dest).Length / 1KB, 1)
  Write-Host "  CSS $f : ${before}KB -> ${after}KB" -ForegroundColor Green
}

# JS
$jsSrc = @("app-content.js", "giles-bg.js", "giles.js", "options.js", "popup.js", "content.js")
foreach ($f in $jsSrc) {
  $src  = "$ext\$f"
  $dest = "$ext\$([System.IO.Path]::GetFileNameWithoutExtension($f)).min.js"
  $before = [math]::Round((Get-Item $src).Length / 1KB, 1)
  terser $src -o $dest --compress --mangle
  $after = [math]::Round((Get-Item $dest).Length / 1KB, 1)
  Write-Host "  JS  $f : ${before}KB -> ${after}KB" -ForegroundColor Green
}

# Taille totale avant/apres
$srcTotal  = ($cssSrc + $jsSrc | ForEach-Object { (Get-Item "$ext\$_").Length } | Measure-Object -Sum).Sum
$minSuffix = ($cssSrc | ForEach-Object { "$ext\$([System.IO.Path]::GetFileNameWithoutExtension($_)).min.css" }) +
             ($jsSrc  | ForEach-Object { "$ext\$([System.IO.Path]::GetFileNameWithoutExtension($_)).min.js"  })
$minTotal  = ($minSuffix | ForEach-Object { (Get-Item $_).Length } | Measure-Object -Sum).Sum

$saved = [math]::Round(($srcTotal - $minTotal) / 1KB, 0)
$pct   = [math]::Round((1 - $minTotal / $srcTotal) * 100, 0)
Write-Host ""
Write-Host "Total: $([math]::Round($srcTotal/1KB,0))KB -> $([math]::Round($minTotal/1KB,0))KB (-${saved}KB, -${pct}%)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour utiliser les .min dans manifest.json, remplacer les references :" -ForegroundColor Yellow
Write-Host '  "app-override.css" -> "app-override.min.css"' -ForegroundColor Yellow
Write-Host '  "app-content.js"   -> "app-content.min.js"' -ForegroundColor Yellow
Write-Host '  etc.' -ForegroundColor Yellow
