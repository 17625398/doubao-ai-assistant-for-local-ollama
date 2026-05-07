# LinkMind Server Integration Check Script
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LinkMind Integration Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check config file
Write-Host "[1/5] Checking config file..." -ForegroundColor Yellow
$configPath = "d:\Doubao\refactored\config\lagi.yml"
if (Test-Path $configPath) {
    Write-Host "  [OK] lagi.yml exists" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] lagi.yml not found" -ForegroundColor Red
}

# Check JAR file
Write-Host "[2/5] Checking JAR file..." -ForegroundColor Yellow
$jarPath = "d:\Doubao\linkmind-server\lagi-web\target\LinkMind.jar"
if (Test-Path $jarPath) {
    $size = [math]::Round((Get-Item $jarPath).Length / 1MB, 2)
    Write-Host "  [OK] LinkMind.jar exists ($size MB)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] LinkMind.jar not found, run packaging first" -ForegroundColor Red
}

# Check Java
Write-Host "[3/5] Checking Java environment..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "  [OK] Java installed: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Java not installed or not in PATH" -ForegroundColor Red
}

# Check API proxy files
Write-Host "[4/5] Checking API proxy routes..." -ForegroundColor Yellow
$apiPaths = @(
    "packages\web\src\app\api\linkmind\chat\route.ts",
    "packages\web\src\app\api\linkmind\models\route.ts",
    "packages\web\src\app\api\linkmind\embeddings\route.ts"
)
$missing = 0
foreach ($p in $apiPaths) {
    $fullPath = Join-Path "d:\Doubao\refactored" $p
    if (Test-Path $fullPath) {
        Write-Host "  [OK] $p" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $p not found" -ForegroundColor Red
        $missing++
    }
}
if ($missing -eq 0) {
    Write-Host "  All API routes configured" -ForegroundColor Green
}

# Check package.json scripts
Write-Host "[5/5] Checking npm scripts..." -ForegroundColor Yellow
$pkgPath = "d:\Doubao\refactored\package.json"
if (Test-Path $pkgPath) {
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    if ($pkg.scripts.dev -match "linkmind") {
        Write-Host "  [OK] dev script configured with LinkMind" -ForegroundColor Green
    }
    if ($pkg.scripts.dev -match "LinkMind\.jar") {
        Write-Host "  [OK] Using packaged LinkMind.jar" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick Start:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or start separately:" -ForegroundColor White
Write-Host "  npm run start:linkmind  # Start LinkMind Server (port 8080)" -ForegroundColor Cyan
Write-Host "  cd packages/web && npm run dev  # Start Next.js (port 3000)" -ForegroundColor Cyan
