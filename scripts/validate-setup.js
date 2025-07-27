require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Professional Setup...\n');

const checks = [
  {
    name: 'Environment file exists',
    check: () => fs.existsSync('.env'),
    fix: 'Create .env file or run scripts/switch-env.bat'
  },
  {
    name: 'Session store configured',
    check: () => process.env.SESSION_STORE,
    fix: 'Add SESSION_STORE to your .env file'
  },
  {
    name: 'Session secret configured',
    check: () => process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'your-secret-key-change-in-production',
    fix: 'Add secure SESSION_SECRET to your .env file'
  },
  {
    name: 'Database URL (if using PostgreSQL)',
    check: () => process.env.SESSION_STORE !== 'postgres' || process.env.DATABASE_URL,
    fix: 'Add DATABASE_URL for PostgreSQL session store'
  },
  {
    name: 'Node modules installed',
    check: () => fs.existsSync('node_modules') && fs.existsSync('backend/node_modules') && fs.existsSync('frontend/node_modules'),
    fix: 'Run npm install in root, backend, and frontend directories'
  },
  {
    name: 'Git branches exist',
    check: async () => {
      try {
        const { execSync } = require('child_process');
        const branches = execSync('git branch -a', { encoding: 'utf8' });
        return branches.includes('development') && branches.includes('staging');
      } catch (error) {
        return false;
      }
    },
    fix: 'Run professional-setup-complete.bat to create branches'
  },
  {
    name: 'Environment templates exist',
    check: () => fs.existsSync('environments'),
    fix: 'Run professional-setup-complete.bat to create environment templates'
  },
  {
    name: 'Test directories exist',
    check: () => fs.existsSync('tests/backend') && fs.existsSync('tests/frontend'),
    fix: 'Run professional-setup-complete.bat to create test structure'
  },
  {
    name: 'GitHub Actions configured',
    check: () => fs.existsSync('.github/workflows/test.yml'),
    fix: 'Run professional-setup-complete.bat to create GitHub Actions'
  }
];

async function validateSetup() {
  let allPassed = true;
  let warnings = [];

  for (const check of checks) {
    try {
      let result;
      if (typeof check.check === 'function') {
        result = await check.check();
      } else {
        result = check.check;
      }

      const status = result ? '✅' : '❌';
      console.log(`${status} ${check.name}`);

      if (!result) {
        allPassed = false;
        console.log(`   Fix: ${check.fix}`);
      }
    } catch (error) {
      console.log(`❌ ${check.name} (Error: ${error.message})`);
      allPassed = false;
    }
  }

  // Additional checks with warnings
  console.log('\n=== Additional Checks ===');

  // Check for specific packages
  try {
    const backendPkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
    
    if (!backendPkg.dependencies['connect-pg-simple']) {
      warnings.push('connect-pg-simple not installed (needed for PostgreSQL sessions)');
    } else {
      console.log('✅ PostgreSQL session package installed');
    }

    if (!backendPkg.devDependencies['jest']) {
      warnings.push('jest not installed (needed for testing)');
    } else {
      console.log('✅ Testing framework installed');
    }
  } catch (error) {
    warnings.push('Could not read backend/package.json');
  }

  // Check current environment
  console.log(`\n=== Current Environment ===`);
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`Session Store: ${process.env.SESSION_STORE || 'memory (default)'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);

  // PostgreSQL specific checks
  if (process.env.SESSION_STORE === 'postgres') {
    console.log(`\n=== PostgreSQL Session Store ===`);
    if (process.env.DATABASE_URL) {
      console.log('✅ Database URL configured');
      
      // Test connection
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connection successful');
        await pool.end();
      } catch (error) {
        console.log(`❌ PostgreSQL connection failed: ${error.message}`);
        allPassed = false;
      }
    } else {
      console.log('❌ DATABASE_URL not configured for PostgreSQL');
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allPassed && warnings.length === 0) {
    console.log('🎉 All checks passed! Your setup is ready for professional development.');
    console.log('\n📋 Next steps:');
    console.log('1. Start development: ./launchers/Start_UI_Launcher_Real.bat');
    console.log('2. Switch environments: ./scripts/switch-env.bat');
    console.log('3. Create your first test: See docs/COMPLETE_PROFESSIONAL_SETUP.md');
  } else {
    console.log('⚠️  Setup validation found issues:');
    
    if (!allPassed) {
      console.log('\n❌ Required fixes needed (see above)');
      console.log('💡 Run: ./scripts/professional-setup-complete.bat');
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  }

  console.log('\n📖 Full guide: docs/COMPLETE_PROFESSIONAL_SETUP.md');
}

validateSetup().catch(console.error);