@echo off
echo Testing Phoenix Draft API...
echo.

REM Generate random draft ID
set DRAFT_ID=draft-%RANDOM%-%RANDOM%

echo 1. Creating draft with ID: %DRAFT_ID%
curl -X POST http://localhost:4000/api/drafts -H "Content-Type: application/json" -d "{\"draft_id\":\"%DRAFT_ID%\",\"tournament_id\":\"11111111-2222-3333-4444-555555555555\",\"team1_id\":\"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\",\"team2_id\":\"ffffffff-0000-1111-2222-333333333333\",\"team1_captain_id\":\"12345678-9abc-def0-1234-56789abcdef0\",\"team2_captain_id\":\"09876543-21ba-cdef-0987-6543210fedcb\"}"

echo.
echo.
echo 2. Checking draft status...
curl http://localhost:4000/api/drafts/%DRAFT_ID%/status

echo.
echo.
echo Draft URLs:
echo Team 1: http://localhost:4000/draft/%DRAFT_ID%?captain=1
echo Team 2: http://localhost:4000/draft/%DRAFT_ID%?captain=2
echo.
pause