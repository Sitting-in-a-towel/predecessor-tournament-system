@echo off
echo Testing Phoenix Compilation...
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%

echo.
echo Compiling the project...
mix compile

echo.
echo Compilation complete. Check for errors above.
echo.
echo If no errors, try: mix phx.server
pause