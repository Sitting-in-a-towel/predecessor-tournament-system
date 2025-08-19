@echo off
echo Testing Phoenix Draft API...
echo.

echo 1. Testing Phoenix API with proper UUIDs...
curl -X POST http://localhost:4000/api/drafts ^
  -H "Content-Type: application/json" ^
  -d "{\"draft_id\":\"01234567-89ab-cdef-0123-456789abcdef\",\"tournament_id\":\"11111111-2222-3333-4444-555555555555\",\"team1_id\":\"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\",\"team2_id\":\"ffffffff-0000-1111-2222-333333333333\",\"team1_captain_id\":\"12345678-9abc-def0-1234-56789abcdef0\",\"team2_captain_id\":\"09876543-21ba-cdef-0987-6543210fedcb\"}"

echo.
echo.
echo 2. Testing draft status endpoint...
curl -X GET http://localhost:4000/api/drafts/01234567-89ab-cdef-0123-456789abcdef/status

echo.
echo.
echo Done! If successful, you should see JSON responses.
pause