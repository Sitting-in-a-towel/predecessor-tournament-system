@echo off
echo ========================================
echo    STARTING PHOENIX DRAFT SYSTEM
echo ========================================
echo.
echo Fixed version - removed build tools dependency
echo.

set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%
cd /d "H:\Project Folder\Predecessor website\phoenix_draft"

echo [1] Cleaning old build...
mix deps.clean bcrypt_elixir

echo.
echo [2] Getting dependencies...
mix deps.get

echo.
echo [3] Compiling...
mix compile

echo.
echo [4] Starting Phoenix server...
echo Phoenix will be available at: http://localhost:4000
echo.
echo Press Ctrl+C twice to stop the server
echo.

mix phx.server

echo.
echo Server stopped.
pause