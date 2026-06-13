$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$devLog = Join-Path $projectRoot "tunnel-dev.log"
$tunnelLog = Join-Path $projectRoot "cloudflared-tunnel.log"
$urlFile = Join-Path $projectRoot "public-demo-url.txt"

Set-Location -LiteralPath $projectRoot

$listener = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" -and $_.OwningProcess -ne 0 } |
  Select-Object -First 1

if (-not $listener) {
  if (Test-Path $devLog) {
    Remove-Item -LiteralPath $devLog -Force
  }

  $devCommand = "Set-Location -LiteralPath '$projectRoot'; npm run dev -- -p 3000 *> '$devLog'"
  Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", $devCommand

  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        break
      }
    } catch {
      if ($attempt -eq 29) {
        throw "The local app did not start. Check $devLog"
      }
    }
  }
}

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
  throw "cloudflared is not installed. Install it with: winget install Cloudflare.cloudflared"
}

Get-Process cloudflared -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

if (Test-Path $tunnelLog) {
  Remove-Item -LiteralPath $tunnelLog -Force
}

Start-Process `
  -FilePath $cloudflared.Source `
  -WindowStyle Hidden `
  -ArgumentList @(
    "tunnel",
    "--url",
    "http://127.0.0.1:3000",
    "--no-autoupdate",
    "--logfile",
    $tunnelLog
  )

$publicUrl = $null
for ($attempt = 0; $attempt -lt 45; $attempt++) {
  Start-Sleep -Seconds 1
  if (-not (Test-Path $tunnelLog)) {
    continue
  }

  $logContent = Get-Content -Raw $tunnelLog
  $match = [regex]::Match($logContent, "https://[a-z0-9-]+\.trycloudflare\.com")
  if ($match.Success) {
    $publicUrl = $match.Value
    break
  }
}

if (-not $publicUrl) {
  throw "Cloudflare did not return a public URL. Check $tunnelLog"
}

Set-Content -LiteralPath $urlFile -Value $publicUrl -Encoding utf8

Write-Host ""
Write-Host "Public demo is running:" -ForegroundColor Green
Write-Host $publicUrl -ForegroundColor Cyan
Write-Host ""
Write-Host "Keep this computer powered on and connected to the internet."
Write-Host "Run npm run demo:stop when the demonstration is finished."
