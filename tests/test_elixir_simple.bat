@echo off
echo Testing Elixir Installation...
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo.
echo === Erlang Version ===
erl -version

echo.
echo === Elixir Version ===
elixir --version

echo.
echo === Mix Version ===
mix --version

echo.
echo If you see versions above, Elixir is working!
echo You can now run: mix phx.server
pause