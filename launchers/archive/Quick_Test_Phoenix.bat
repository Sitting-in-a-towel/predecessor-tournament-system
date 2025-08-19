@echo off
echo === Quick Phoenix Test ===

REM Set PATH for this session
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo.
echo Current directory: %~dp0
echo Checking if phoenix_draft exists...

if exist "%~dp0phoenix_draft" (
    echo ✅ phoenix_draft directory found
) else (
    echo ❌ phoenix_draft directory NOT found
    echo Looking for directories...
    dir /ad
    pause
    exit /b 1
)

echo.
echo Navigating to phoenix_draft...
cd /d "%~dp0phoenix_draft"
echo New directory: %CD%

echo.
echo Checking for mix.exs...
if exist mix.exs (
    echo ✅ mix.exs found
) else (
    echo ❌ mix.exs not found
    echo Files in current directory:
    dir
    pause
    exit /b 1
)

echo.
echo Testing basic mix command...
mix --version

echo.
echo Everything looks good! Now try running:
echo mix phx.server
echo.
echo Or run the full launcher: Start_Phoenix_Debug.bat
pause