param(
    [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localUrl = "http://127.0.0.1:3000"
$healthUrl = "$localUrl/api/health"
$logPath = Join-Path $projectRoot "local-notebook.log"

function Test-NotebookReady {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
        $payload = $response.Content | ConvertFrom-Json
        return ($response.StatusCode -eq 200 -and $payload.status -eq "ok")
    }
    catch {
        return $false
    }
}

function Show-LaunchError {
    param([string]$Message)

    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            $Message,
            "Local notebook launch failed",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    }
    catch {
        Write-Error $Message
    }
}

try {
    if (-not (Test-NotebookReady)) {
        $existingListener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
        if ($existingListener) {
            throw "Port 3000 is already used by another program. Close that program and try again."
        }

        $escapedRoot = $projectRoot.Replace("'", "''")
        $escapedLog = $logPath.Replace("'", "''")
        $devCommand = "Set-Location -LiteralPath '$escapedRoot'; npm run dev -- -p 3000 *> '$escapedLog'"

        Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-Command", $devCommand
        ) | Out-Null

        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            Start-Sleep -Seconds 1
            if (Test-NotebookReady) {
                $ready = $true
                break
            }
        }

        if (-not $ready) {
            throw "The local notebook did not start in time. See the startup log: $logPath"
        }
    }

    if (-not $NoOpen) {
        Start-Process $localUrl
    }

    Write-Output "READY $localUrl"
}
catch {
    Show-LaunchError -Message $_.Exception.Message
    exit 1
}
