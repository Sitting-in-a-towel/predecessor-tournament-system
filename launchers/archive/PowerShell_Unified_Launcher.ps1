# Predecessor Tournament - PowerShell Unified Development Environment
param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Predecessor Tournament - Unified Development Environment" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script starts all development services in a unified environment:"
    Write-Host "  • NocoDB (Database UI) - http://localhost:8080"
    Write-Host "  • Backend API - http://localhost:3001"
    Write-Host "  • Phoenix Draft System - http://localhost:4000"
    Write-Host "  • React Frontend - http://localhost:3000"
    Write-Host ""
    Write-Host "Usage: .\PowerShell_Unified_Launcher.ps1"
    Write-Host "Press Ctrl+C to stop all services"
    exit
}

$Host.UI.RawUI.WindowTitle = "Predecessor Development Environment"

# Set project path
$ProjectPath = "H:\Project Folder\Predecessor website"
$JobsStarted = @()

Write-Host "========================================" -ForegroundColor Green
Write-Host "  PREDECESSOR UNIFIED DEV ENVIRONMENT" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Function to cleanup all processes
function Stop-AllServices {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  🛑 SHUTTING DOWN ALL SERVICES..." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    
    # Stop background jobs
    foreach ($job in $JobsStarted) {
        if ($job -and $job.State -eq 'Running') {
            Write-Host "Stopping $($job.Name)..." -ForegroundColor Yellow
            Stop-Job $job -PassThru | Remove-Job
        }
    }
    
    # Kill processes by name
    Write-Host "Killing Node.js processes..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-Host "Killing Elixir/Phoenix processes..." -ForegroundColor Yellow  
    Get-Process -Name "beam.smp" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "erl" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-Host "Killing NocoDB..." -ForegroundColor Yellow
    Get-Process -Name "Noco-win-x64" -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-Host ""
    Write-Host "✅ All services stopped!" -ForegroundColor Green
    Write-Host "You can close this window or press Enter to exit."
    Read-Host
    exit
}

# Register cleanup on Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Stop-AllServices
}

try {
    # Check PostgreSQL
    Write-Host "[1/5] Checking PostgreSQL..." -ForegroundColor Cyan
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if (-not $pgService -or $pgService.Status -ne 'Running') {
        Write-Host "❌ PostgreSQL not running! Please start it first." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ PostgreSQL ready" -ForegroundColor Green

    # Start NocoDB
    Write-Host "[2/5] Starting NocoDB..." -ForegroundColor Cyan
    Get-Process -Name "Noco-win-x64" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
    $nocoJob = Start-Job -Name "NocoDB" -ScriptBlock {
        Set-Location "H:\Project Folder\NocoDB"
        & ".\Noco-win-x64.exe"
    }
    $JobsStarted += $nocoJob
    Start-Sleep -Seconds 3
    Write-Host "✅ NocoDB started" -ForegroundColor Green

    # Set PATH for Elixir
    $env:PATH = "C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;" + $env:PATH

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  🚀 LAUNCHING UNIFIED ENVIRONMENT" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""

    # Start Backend API
    Write-Host "[3/5] Starting Backend API..." -ForegroundColor Cyan
    $backendJob = Start-Job -Name "Backend" -ScriptBlock {
        Set-Location "H:\Project Folder\Predecessor website\backend"
        & npm run dev
    }
    $JobsStarted += $backendJob
    Start-Sleep -Seconds 3
    Write-Host "✅ Backend API starting..." -ForegroundColor Green

    # Start Phoenix Draft System  
    Write-Host "[4/5] Starting Phoenix Draft System..." -ForegroundColor Cyan
    $phoenixJob = Start-Job -Name "Phoenix" -ScriptBlock {
        $env:PATH = "C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;" + $env:PATH
        Set-Location "H:\Project Folder\Predecessor website\phoenix_draft"
        & mix phx.server
    }
    $JobsStarted += $phoenixJob
    Start-Sleep -Seconds 3
    Write-Host "✅ Phoenix Draft System starting..." -ForegroundColor Green

    # Start Frontend
    Write-Host "[5/5] Starting React Frontend..." -ForegroundColor Cyan
    $frontendJob = Start-Job -Name "Frontend" -ScriptBlock {
        Set-Location "H:\Project Folder\Predecessor website\frontend"  
        & npm start
    }
    $JobsStarted += $frontendJob
    Start-Sleep -Seconds 3
    Write-Host "✅ React Frontend starting..." -ForegroundColor Green

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ ALL SERVICES LAUNCHED" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Access Points:" -ForegroundColor White
    Write-Host "  🌐 Website:    http://localhost:3000" -ForegroundColor Yellow
    Write-Host "  🔧 Backend:    http://localhost:3001" -ForegroundColor Yellow  
    Write-Host "  🎯 Drafts:     http://localhost:4000" -ForegroundColor Yellow
    Write-Host "  📊 NocoDB:     http://localhost:8080" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Services Status:" -ForegroundColor White
    
    # Monitor services
    while ($true) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor DarkGray
        Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] Service Status Check" -ForegroundColor DarkGray
        Write-Host "========================================" -ForegroundColor DarkGray
        
        foreach ($job in $JobsStarted) {
            if ($job.State -eq 'Running') {
                Write-Host "  ✅ $($job.Name): Running" -ForegroundColor Green
            } elseif ($job.State -eq 'Failed') {
                Write-Host "  ❌ $($job.Name): Failed" -ForegroundColor Red
            } else {
                Write-Host "  ⚠️  $($job.Name): $($job.State)" -ForegroundColor Yellow
            }
        }
        
        Write-Host ""
        Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 10
    }

} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Stop-AllServices
} finally {
    # Cleanup on any exit
    if ($JobsStarted.Count -gt 0) {
        Stop-AllServices
    }
}