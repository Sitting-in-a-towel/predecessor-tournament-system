@echo off
title Test Phoenix Hero Draft System
color 0A

echo ========================================
echo   TESTING PHOENIX HERO DRAFT SYSTEM
echo ========================================
echo.

echo Step 1: Checking if services are running...
echo.

curl -s -o nul -w "Phoenix Draft System: " http://localhost:4000 && echo [RUNNING] || echo [NOT RUNNING - Please start Phoenix]
curl -s -o nul -w "React Frontend:       " http://localhost:3000 && echo [RUNNING] || echo [NOT RUNNING - Please start React]
curl -s -o nul -w "React Backend:        " http://localhost:3001/api && echo [RUNNING] || echo [NOT RUNNING - Please start Backend]

echo.
echo ========================================
echo   STEP 2: CREATE TEST DRAFT
echo ========================================
echo.
echo Creating a test draft session with proper UUIDs...
echo.

set DRAFT_ID=test-draft-%RANDOM%-%RANDOM%
echo Draft ID: %DRAFT_ID%
echo.

curl -X POST http://localhost:4000/api/drafts ^
  -H "Content-Type: application/json" ^
  -d "{\"draft_id\":\"%DRAFT_ID%\",\"tournament_id\":\"11111111-2222-3333-4444-555555555555\",\"team1_id\":\"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\",\"team2_id\":\"ffffffff-0000-1111-2222-333333333333\",\"team1_captain_id\":\"12345678-9abc-def0-1234-56789abcdef0\",\"team2_captain_id\":\"09876543-21ba-cdef-0987-6543210fedcb\"}"

echo.
echo.
echo ========================================
echo   STEP 3: OPEN DRAFT IN BROWSERS
echo ========================================
echo.
echo Opening draft for both team captains...
echo.

echo Team 1 Captain URL:
echo http://localhost:4000/draft/%DRAFT_ID%?captain=1
start "" "http://localhost:4000/draft/%DRAFT_ID%?captain=1"

timeout /t 2 >nul

echo.
echo Team 2 Captain URL:
echo http://localhost:4000/draft/%DRAFT_ID%?captain=2
start "" "http://localhost:4000/draft/%DRAFT_ID%?captain=2"

echo.
echo ========================================
echo   TEST INSTRUCTIONS
echo ========================================
echo.
echo 1. TWO BROWSER WINDOWS should have opened
echo 2. Each represents a different team captain
echo.
echo TESTING STEPS:
echo -------------
echo Phase 1 - WAITING:
echo   - Both captains should show as "connected"
echo   - After 2 seconds, coin toss options appear
echo.
echo Phase 2 - COIN TOSS:
echo   - Team 1: Click "Heads" or "Tails"
echo   - Team 2: Gets the other option automatically
echo   - Watch the coin flip animation
echo   - Winner chooses who picks first
echo.
echo Phase 3 - HERO PICK/BAN:
echo   - Filter heroes by role (Carry, Support, etc.)
echo   - Current turn shown at top
echo   - First 4 turns: BAN heroes (shown in red)
echo   - Next 2 turns: PICK heroes (shown in green)
echo   - Continue alternating bans and picks
echo   - Selected heroes become unavailable
echo   - Both browsers sync in real-time
echo.
echo Phase 4 - COMPLETION:
echo   - Draft completes after all picks
echo   - Results saved to database
echo   - Link to return to tournament
echo.
echo ========================================
pause