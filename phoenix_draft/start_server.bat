@echo off
echo Starting Phoenix Server...
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%
mix phx.server
pause