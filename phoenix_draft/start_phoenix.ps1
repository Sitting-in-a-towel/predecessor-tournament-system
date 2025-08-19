# Phoenix Server Launcher for PowerShell
Write-Host "Starting Phoenix Draft System..." -ForegroundColor Green

# Set environment path
$env:PATH = "C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;" + $env:PATH

# Change to script directory
Set-Location $PSScriptRoot

# Check if dependencies are installed
if (-not (Test-Path "deps")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & mix local.hex --force
    & mix local.rebar --force
    & mix deps.get
}

# Start Phoenix server
Write-Host "`nStarting Phoenix server on http://localhost:4000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C twice to stop the server`n" -ForegroundColor Yellow

& mix phx.server