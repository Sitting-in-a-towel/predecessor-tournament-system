@echo off
title Phoenix Server
color 0A
echo =========================================
echo    STARTING PHOENIX DRAFT SYSTEM
echo =========================================
echo.

set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%
cd /d "H:\Project Folder\Predecessor website\phoenix_draft"

echo Starting server...
echo.
echo If you see errors below, please share them.
echo.

mix phx.server 2>&1

echo.
echo =========================================
echo Server stopped or encountered an error.
echo =========================================
echo.
pause
pause
pause