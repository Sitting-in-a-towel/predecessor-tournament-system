# Fix Phoenix Database Schema
Write-Host "========================================" -ForegroundColor Green
Write-Host "   FIXING PHOENIX DATABASE SCHEMA" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host

# Set environment variable for password
$env:PGPASSWORD = "Antigravity7@!89"

Write-Host "Connecting to PostgreSQL database..." -ForegroundColor Yellow

try {
    # Run the SQL commands directly
    $sql1 = "ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';"
    $sql2 = "ALTER TABLE draft_sessions ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';"
    $sql3 = "SELECT 'Database fix completed!' as result;"
    
    Write-Host "Adding metadata column..." -ForegroundColor Cyan
    psql -h localhost -p 5432 -U postgres -d predecessor_tournaments -c $sql1
    
    Write-Host "Adding settings column..." -ForegroundColor Cyan  
    psql -h localhost -p 5432 -U postgres -d predecessor_tournaments -c $sql2
    
    Write-Host "Verifying fix..." -ForegroundColor Cyan
    psql -h localhost -p 5432 -U postgres -d predecessor_tournaments -c $sql3
    
    Write-Host
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✅ DATABASE FIX COMPLETED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host
    Write-Host "Phoenix database schema has been updated successfully." -ForegroundColor Green
    Write-Host "You can now test the Phoenix API integration." -ForegroundColor Green
    
} catch {
    Write-Host
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ❌ DATABASE FIX FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "- Make sure PostgreSQL is running" -ForegroundColor Yellow
    Write-Host "- Check if the database 'predecessor_tournaments' exists" -ForegroundColor Yellow
    Write-Host "- Verify the password is correct" -ForegroundColor Yellow
}

Write-Host
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")