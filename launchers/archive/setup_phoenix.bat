@echo off
echo Setting up Phoenix Draft System...

REM Set PATH to include Erlang and Elixir
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo.
echo === Installing Phoenix Framework ===
mix archive.install hex phx_new --force

echo.
echo === Installing Hex and Rebar ===
mix local.hex --force
mix local.rebar --force

echo.
echo === Creating Phoenix Project ===
cd /d "H:\Project Folder\Predecessor website"
rmdir /s /q phoenix_draft 2>nul
mix phx.new phoenix_draft --app predecessor_draft --live --no-dashboard --no-mailer --no-gettext --database postgres

echo.
echo === Phoenix Setup Complete ===
echo You can now run: cd phoenix_draft && mix phx.server
pause