$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot

Get-Process cloudflared -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue

$listeners = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" -and $_.OwningProcess -ne 0 }

foreach ($listener in $listeners) {
  Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Public demo and local development server stopped."
