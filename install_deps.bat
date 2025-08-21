@echo off
echo Installing Phoenix Dependencies...
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%
mix local.hex --force
mix local.rebar --force
mix deps.get
echo Dependencies installed!
pause