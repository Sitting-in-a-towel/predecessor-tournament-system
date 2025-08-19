@echo off
echo === Phoenix Development Environment (Debug Mode) ===

REM Set PATH for this session
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo.
echo === Step 1: Testing Elixir Installation ===
elixir --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Elixir is not working properly
    pause
    exit /b 1
)

echo.
echo === Step 2: Testing Mix ===
mix --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Mix is not working properly
    pause
    exit /b 1
)

echo.
echo === Step 3: Installing Phoenix Archive ===
mix archive.install hex phx_new --force
echo Mix archive result: %ERRORLEVEL%

echo.
echo === Step 4: Installing Hex and Rebar ===
mix local.hex --force
mix local.rebar --force

echo.
echo === Step 5: Navigating to Phoenix Project ===
cd /d "%~dp0phoenix_draft"
echo Current directory: %CD%

echo.
echo === Step 6: Checking if mix.exs exists ===
if exist mix.exs (
    echo ✅ Found mix.exs
) else (
    echo ❌ mix.exs not found! This might be the issue.
    pause
    exit /b 1
)

echo.
echo === Step 7: Installing Dependencies ===
mix deps.get
echo Dependencies result: %ERRORLEVEL%

echo.
echo === Step 8: Starting Phoenix Server ===
echo Phoenix will be available at: http://localhost:4000
echo Press Ctrl+C twice to stop the server when done testing
echo.
echo Starting server now...
mix phx.server

pause