@echo off
title Complete Professional Setup
color 0B

echo ========================================
echo Complete Professional Setup
echo ========================================
echo.
echo This will set up:
echo - PostgreSQL session support
echo - Environment management
echo - Testing framework
echo - Git branch structure
echo - Professional workflow
echo.

cd /d "H:\Project Folder\Predecessor website"

set /p proceed="Continue with setup? (y/n): "
if /i "%proceed%" NEQ "y" goto end

echo.
echo Step 1: Installing session dependencies...
cd backend
npm install connect-pg-simple pg
cd ..

echo.
echo Step 2: Installing testing dependencies...
cd backend
npm install --save-dev jest supertest @types/jest
cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom
cd ..

echo.
echo Step 3: Creating Git branches...
git checkout -b development
echo Created development branch
git push -u origin development
git checkout -b staging
echo Created staging branch  
git push -u origin staging
git checkout main
echo Back on main branch

echo.
echo Step 4: Creating environment templates...
mkdir environments 2>nul

echo NODE_ENV=development> environments\.env.development.template
echo PORT=3001>> environments\.env.development.template
echo FRONTEND_URL=http://localhost:3000>> environments\.env.development.template
echo.>> environments\.env.development.template
echo # Copy your existing .env values here>> environments\.env.development.template
echo AIRTABLE_PERSONAL_TOKEN=your_token>> environments\.env.development.template
echo AIRTABLE_BASE_ID=your_base_id>> environments\.env.development.template
echo DISCORD_CLIENT_ID=your_client_id>> environments\.env.development.template
echo DISCORD_CLIENT_SECRET=your_secret>> environments\.env.development.template
echo DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback>> environments\.env.development.template
echo.>> environments\.env.development.template
echo # Session (local development uses memory)>> environments\.env.development.template
echo SESSION_SECRET=dev-secret-change-this-to-something-secure>> environments\.env.development.template
echo SESSION_STORE=memory>> environments\.env.development.template

echo NODE_ENV=staging> environments\.env.staging.template
echo PORT=3001>> environments\.env.staging.template
echo FRONTEND_URL=https://your-app-staging.netlify.app>> environments\.env.staging.template
echo.>> environments\.env.staging.template
echo # Copy your existing .env values here>> environments\.env.staging.template
echo AIRTABLE_PERSONAL_TOKEN=your_token>> environments\.env.staging.template
echo AIRTABLE_BASE_ID=your_base_id>> environments\.env.staging.template
echo DISCORD_CLIENT_ID=your_client_id>> environments\.env.staging.template
echo DISCORD_CLIENT_SECRET=your_secret>> environments\.env.staging.template
echo DISCORD_REDIRECT_URI=https://your-api-staging.onrender.com/api/auth/discord/callback>> environments\.env.staging.template
echo.>> environments\.env.staging.template
echo # Supabase for persistent sessions>> environments\.env.staging.template
echo DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres>> environments\.env.staging.template
echo SESSION_STORE=postgres>> environments\.env.staging.template
echo SESSION_SECRET=staging-secret-change-this-to-something-secure>> environments\.env.staging.template

echo.
echo Step 5: Creating environment switcher...
echo @echo off> scripts\switch-env.bat
echo title Environment Switcher>> scripts\switch-env.bat
echo color 0A>> scripts\switch-env.bat
echo.>> scripts\switch-env.bat
echo echo ========================================>> scripts\switch-env.bat
echo echo Environment Switcher>> scripts\switch-env.bat
echo echo ========================================>> scripts\switch-env.bat
echo echo.>> scripts\switch-env.bat
echo echo 1. Development (Local)>> scripts\switch-env.bat
echo echo 2. Staging (Test)>> scripts\switch-env.bat
echo echo 3. Production (Live)>> scripts\switch-env.bat
echo echo.>> scripts\switch-env.bat
echo.>> scripts\switch-env.bat
echo set /p choice="Select environment (1-3): ">> scripts\switch-env.bat
echo.>> scripts\switch-env.bat
echo if "%%choice%%"=="1" (>> scripts\switch-env.bat
echo     copy environments\.env.development .env>> scripts\switch-env.bat
echo     echo Switched to DEVELOPMENT environment>> scripts\switch-env.bat
echo ) else if "%%choice%%"=="2" (>> scripts\switch-env.bat
echo     copy environments\.env.staging .env>> scripts\switch-env.bat
echo     echo Switched to STAGING environment>> scripts\switch-env.bat
echo ) else if "%%choice%%"=="3" (>> scripts\switch-env.bat
echo     copy environments\.env.production .env>> scripts\switch-env.bat
echo     echo Switched to PRODUCTION environment>> scripts\switch-env.bat
echo ) else (>> scripts\switch-env.bat
echo     echo Invalid choice!>> scripts\switch-env.bat
echo     pause>> scripts\switch-env.bat
echo     exit /b 1>> scripts\switch-env.bat
echo )>> scripts\switch-env.bat
echo.>> scripts\switch-env.bat
echo echo Environment switched successfully!>> scripts\switch-env.bat
echo echo Restart your services for changes to take effect.>> scripts\switch-env.bat
echo pause>> scripts\switch-env.bat

echo.
echo Step 6: Creating test structure...
mkdir tests 2>nul
mkdir tests\backend 2>nul
mkdir tests\backend\unit 2>nul
mkdir tests\backend\integration 2>nul
mkdir tests\frontend 2>nul
mkdir tests\frontend\unit 2>nul

echo.
echo Step 7: Creating GitHub Actions...
mkdir .github 2>nul
mkdir .github\workflows 2>nul

echo name: Test> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo on:>> .github\workflows\test.yml
echo   pull_request:>> .github\workflows\test.yml
echo     branches: [main, staging]>> .github\workflows\test.yml
echo   push:>> .github\workflows\test.yml
echo     branches: [development]>> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo jobs:>> .github\workflows\test.yml
echo   test:>> .github\workflows\test.yml
echo     runs-on: ubuntu-latest>> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo     steps:>> .github\workflows\test.yml
echo     - uses: actions/checkout@v3>> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo     - name: Setup Node.js>> .github\workflows\test.yml
echo       uses: actions/setup-node@v3>> .github\workflows\test.yml
echo       with:>> .github\workflows\test.yml
echo         node-version: '18'>> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo     - name: Install dependencies>> .github\workflows\test.yml
echo       run: ^|>> .github\workflows\test.yml
echo         npm install>> .github\workflows\test.yml
echo         cd backend ^&^& npm install>> .github\workflows\test.yml
echo         cd ../frontend ^&^& npm install>> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo     - name: Run tests>> .github\workflows\test.yml
echo       run: npm test>> .github\workflows\test.yml
echo.>> .github\workflows\test.yml
echo     - name: Build check>> .github\workflows\test.yml
echo       run: cd frontend ^&^& npm run build>> .github\workflows\test.yml

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo ✅ Installed PostgreSQL session support
echo ✅ Created Git branches (development, staging, main)
echo ✅ Created environment templates
echo ✅ Set up testing framework
echo ✅ Created GitHub Actions workflow
echo ✅ Created environment switcher
echo.
echo 📋 Next steps:
echo.
echo 1. Set up Supabase (5 minutes):
echo    - Go to supabase.com
echo    - Create free account
echo    - Create new project
echo    - Get connection string
echo.
echo 2. Configure environments:
echo    - Edit files in environments/ folder
echo    - Copy your current .env values
echo    - Add Supabase connection string
echo.
echo 3. Switch to development environment:
echo    - Run: scripts\switch-env.bat
echo    - Choose option 1 (Development)
echo.
echo 4. Test the setup:
echo    - Start your services
echo    - Create a team
echo    - Check sessions persist
echo.
echo 📖 Full guide: docs\COMPLETE_PROFESSIONAL_SETUP.md
echo.

:end
pause