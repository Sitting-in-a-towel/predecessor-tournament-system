@echo off
set PATH=C:\Program Files\Erlang OTP\bin;C:\Program Files\Elixir\bin;%PATH%
cd /d "H:\Project Folder\Predecessor website\phoenix_draft"

echo Testing basic Mix commands...

echo.
echo 1. Checking Mix version:
mix --version

echo.
echo 2. Testing compilation:
mix compile > compile_output.txt 2>&1
type compile_output.txt

echo.
echo 3. Checking if database exists:
mix ecto.create > database_output.txt 2>&1
type database_output.txt

echo.
echo Tests complete. Check output above for errors.
cmd /k