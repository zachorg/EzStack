# Cloudflare Tunnel Testing Script
# Tests both local services and public endpoints

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Cloudflare Tunnel Test Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test local services
Write-Host "Testing Local Services..." -ForegroundColor Yellow
Write-Host "-----------------------------------"

try {
    $site = Invoke-WebRequest -Uri http://localhost:3000 -Method Head -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Site (3000): $($site.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Site (3000): $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $api = Invoke-WebRequest -Uri http://localhost:8080 -Method Head -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] API (8080): $($api.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] API (8080): $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $auth = Invoke-WebRequest -Uri http://localhost:8081 -Method Head -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Auth (8081): $($auth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Auth (8081): $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test public endpoints (if tunnel is running)
Write-Host "Testing Public Endpoints..." -ForegroundColor Yellow
Write-Host "-----------------------------------"

try {
    $publicSite = Invoke-WebRequest -Uri https://ezstack.app -Method Head -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "[OK] Public Site (ezstack.app): $($publicSite.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Public Site (ezstack.app): $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  -> Make sure cloudflared tunnel is running and DNS is configured" -ForegroundColor DarkYellow
}

try {
    $publicApi = Invoke-WebRequest -Uri https://api.ezstack.app -Method Head -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "[OK] Public API (api.ezstack.app): $($publicApi.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Public API (api.ezstack.app): $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  -> Make sure cloudflared tunnel is running and DNS is configured" -ForegroundColor DarkYellow
}

try {
    $publicAuth = Invoke-WebRequest -Uri https://auth.ezstack.app -Method Head -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "[OK] Public Auth (auth.ezstack.app): $($publicAuth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Public Auth (auth.ezstack.app): $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  -> Make sure cloudflared tunnel is running and DNS is configured" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If local services fail, check: docker-compose ps" -ForegroundColor White
Write-Host "2. If public endpoints fail, check:" -ForegroundColor White
Write-Host "   - Is cloudflared tunnel running?" -ForegroundColor White
Write-Host "   - Run: cloudflared tunnel --config cloudflared-config.yml run ezstack-dev" -ForegroundColor White
Write-Host "   - Are DNS records configured in Cloudflare dashboard?" -ForegroundColor White
Write-Host ""

