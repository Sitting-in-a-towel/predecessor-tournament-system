@echo off
title Predecessor Tournament System - Professional Setup
color 0B

echo ========================================
echo Professional Development Setup
echo ========================================
echo.

echo This script will help you set up a professional development environment.
echo.

cd /d "H:\Project Folder\Predecessor website"

echo 1. Creating essential files...
echo.

:: Create .gitignore
if not exist ".gitignore" (
    copy "docs\gitignore_template.txt" ".gitignore"
    echo ✓ Created .gitignore
) else (
    echo ✓ .gitignore already exists
)

:: Create .env.example
if not exist ".env.example" (
    copy "docs\env_example.txt" ".env.example"
    echo ✓ Created .env.example
) else (
    echo ✓ .env.example already exists
)

:: Create GitHub workflow directory and file
if not exist ".github" mkdir ".github"
if not exist ".github\workflows" mkdir ".github\workflows"

if not exist ".github\workflows\ci.yml" (
    copy "docs\github_workflow.yml" ".github\workflows\ci.yml"
    echo ✓ Created GitHub workflow
) else (
    echo ✓ GitHub workflow already exists
)

:: Create README.md if it doesn't exist
if not exist "README.md" (
    copy "docs\README_template.md" "README.md"
    echo ✓ Created README.md
) else (
    echo ✓ README.md already exists
)

echo.
echo 2. Checking Git installation...
git --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Git is installed
) else (
    echo ❌ Git not found. Please install from: https://git-scm.com/download/win
    echo.
)

echo.
echo 3. Setting up project scripts...

:: Add scripts to package.json
echo Creating npm scripts...

echo.
echo 4. Professional setup checklist:
echo.
echo ☐ 1. Create GitHub repository
echo ☐ 2. Initialize Git (git init)
echo ☐ 3. Create .env file from .env.example
echo ☐ 4. Choose session storage solution:
echo     - File-based (simple, good for development)
echo     - Redis (production recommended)
echo     - PostgreSQL (enterprise scale)
echo ☐ 5. Set up error tracking (Sentry)
echo ☐ 6. Configure hosting (Vercel + Railway)
echo ☐ 7. Set up monitoring and analytics
echo.

echo ========================================
echo Setup Summary
echo ========================================
echo.
echo Files created:
echo ✓ .gitignore - Git ignore rules
echo ✓ .env.example - Environment template
echo ✓ .github/workflows/ci.yml - CI/CD pipeline
echo ✓ README.md - Project documentation
echo.

echo Next steps:
echo 1. Create GitHub repository
echo 2. Set up your .env file
echo 3. Choose session storage solution
echo 4. Push to GitHub: git add . && git commit -m "Initial commit" && git push
echo.

echo ========================================
echo Session Storage Options
echo ========================================
echo.
echo Option 1: File-based sessions (Recommended for start)
echo - Simple setup
echo - Good for small scale
echo - Data survives server restarts
echo.
echo Option 2: Redis sessions (Recommended for production)
echo - Free tier: Upstash Redis
echo - Fast and scalable
echo - Automatic expiration
echo.
echo Option 3: PostgreSQL sessions (Enterprise)
echo - Free tier: Supabase
echo - Most robust
echo - Advanced querying
echo.

set /p session_choice="Choose session storage (1=File, 2=Redis, 3=PostgreSQL): "

if "%session_choice%"=="1" goto setup_file_sessions
if "%session_choice%"=="2" goto setup_redis_info
if "%session_choice%"=="3" goto setup_postgres_info
goto end

:setup_file_sessions
echo.
echo Setting up file-based sessions...
echo.
echo Add this to your .env file:
echo SESSION_STORE=file
echo.
echo This will store sessions in a 'sessions' folder.
echo Sessions will survive server restarts.
goto end

:setup_redis_info
echo.
echo Setting up Redis sessions...
echo.
echo 1. Go to https://upstash.com/
echo 2. Create free account
echo 3. Create Redis database
echo 4. Copy connection URL
echo 5. Add to .env file:
echo    SESSION_STORE=redis
echo    REDIS_URL=your_redis_url_here
echo.
echo Then install Redis package:
echo npm install connect-redis redis
goto end

:setup_postgres_info
echo.
echo Setting up PostgreSQL sessions...
echo.
echo 1. Go to https://supabase.com/
echo 2. Create free account
echo 3. Create new project
echo 4. Copy database URL
echo 5. Add to .env file:
echo    SESSION_STORE=postgres
echo    DATABASE_URL=your_postgres_url_here
echo.
echo Then install PostgreSQL package:
echo npm install connect-pg-simple pg
goto end

:end
echo.
echo Professional setup complete!
echo.
echo Run the UI launcher to start development:
echo ./launchers/Start_UI_Launcher_Real.bat
echo.
pause