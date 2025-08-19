@echo off
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%
cd /d "H:\Project Folder\Predecessor website\phoenix_draft"

echo Running Phoenix and saving output to log file...
mix phx.server > phoenix_output.log 2>&1

echo Phoenix has stopped. Check phoenix_output.log for details.
type phoenix_output.log
pause