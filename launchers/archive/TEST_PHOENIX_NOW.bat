@echo off
title Phoenix Diagnostic Test
color 0A
echo =========================================
echo    PHOENIX DRAFT SYSTEM DIAGNOSTIC
echo =========================================
echo.

REM Set PATH
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo [1] Checking Elixir installation...
elixir --version
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Elixir not found!
    pause
    exit /b 1
)
echo    SUCCESS: Elixir is installed
echo.

echo [2] Checking current directory...
echo    Current: %CD%
echo.

echo [3] Moving to Phoenix project...
cd /d "H:\Project Folder\Predecessor website\phoenix_draft"
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Cannot find phoenix_draft folder!
    echo    Creating path...
    cd /d "H:\Project Folder\Predecessor website"
    dir
    pause
    exit /b 1
)
echo    SUCCESS: In phoenix_draft folder
echo.

echo [4] Checking for mix.exs...
if exist mix.exs (
    echo    SUCCESS: mix.exs found
) else (
    echo    ERROR: mix.exs not found!
    echo    Files in current directory:
    dir /b
    pause
    exit /b 1
)
echo.

echo [5] Installing Hex package manager...
call mix local.hex --force
echo.

echo [6] Installing dependencies...
call mix deps.get
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Failed to install dependencies
    echo    This might be the first run - trying to install Phoenix...
    call mix archive.install hex phx_new --force
    pause
)
echo.

echo =========================================
echo    STARTING PHOENIX SERVER
echo =========================================
echo.
echo Server will run at: http://localhost:4000
echo Press Ctrl+C twice to stop
echo.

mix phx.server

pause