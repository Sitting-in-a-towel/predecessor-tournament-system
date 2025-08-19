@echo off
title Phoenix First Time Setup
color 0E
echo =========================================
echo    PHOENIX FIRST TIME SETUP
echo =========================================
echo.
echo This will install all Phoenix dependencies.
echo This only needs to run once.
echo.
pause

set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

cd /d "H:\Project Folder\Predecessor website\phoenix_draft"

echo.
echo [1] Installing Hex...
call mix local.hex --force

echo.
echo [2] Installing Rebar...
call mix local.rebar --force

echo.
echo [3] Installing Phoenix...
call mix archive.install hex phx_new --force

echo.
echo [4] Installing project dependencies...
call mix deps.get

echo.
echo [5] Setting up database (if needed)...
call mix ecto.create

echo.
echo =========================================
echo    SETUP COMPLETE!
echo =========================================
echo.
echo Now you can start Phoenix with:
echo   mix phx.server
echo.
echo Or run TEST_PHOENIX_NOW.bat
echo.
pause