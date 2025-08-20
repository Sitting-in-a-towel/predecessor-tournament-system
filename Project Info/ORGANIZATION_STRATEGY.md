# PROJECT ORGANIZATION STRATEGY
*Last Updated: 2025-01-14*

## 🎯 GOAL: Keep Project Clean & Organized

### 📁 Ideal Folder Structure

```
H:\Project Folder\Predecessor website\
├── 📁 backend/                    # Backend API (Node.js/Express)
├── 📁 frontend/                   # Frontend UI (React)
├── 📁 phoenix_draft/              # Phoenix LiveView draft system
├── 📁 launchers/                  # Start scripts
├── 📁 documentation/              # ONLY essential docs
│   ├── CLAUDE.md                  # Master reference (MOST IMPORTANT)
│   ├── TROUBLESHOOTING.md         # Single troubleshooting guide
│   ├── ORGANIZATION_STRATEGY.md   # This file
│   ├── Troubleshooting reference images/
│   └── archive/                   # Old/redundant docs
├── 📁 development/                # Development tools & debug files
│   ├── database-scripts/          # SQL scripts, migrations
│   └── debug-files/              # Debug logs, test scripts
├── 📁 testing/                    # All testing related
│   ├── screenshots/              # Test screenshots
│   ├── debug-scripts/            # Debug & test .js files
│   ├── test-reports/             # Analysis reports
│   └── playwright-results/       # Test results
└── 📁 archive/                    # Completed/outdated items
    ├── loose-files/              # Random files from main folder
    └── old-versions/             # Previous versions
```

## 🧹 AUTOMATIC CLEANUP RULES

### ❌ Files to Move/Archive Immediately:
- **Screenshots**: `*.png` → `testing/screenshots/`
- **Debug Scripts**: `*test*.js`, `*debug*.js` → `testing/debug-scripts/`
- **Analysis Reports**: `*ANALYSIS*.md`, `*REPORT*.md` → `testing/test-reports/`
- **Database Scripts**: `*.sql`, `*migration*.js` → `development/database-scripts/`
- **Temporary Files**: `temp_*`, `debug_*`, `test_*` → `archive/loose-files/`

### ✅ Files to Keep in Main Folder:
- `README.md` (project overview)
- `package.json` (if root level deps exist)
- `.gitignore` (if using git)
- Essential config files only

## 🔄 CLEANUP WORKFLOW (After Each Feature)

### 1. End-of-Feature Cleanup
```batch
# Move loose files
move *.png testing\screenshots\
move *test*.js testing\debug-scripts\
move *debug*.js testing\debug-scripts\
move *ANALYSIS*.md testing\test-reports\
```

### 2. Update Documentation
- Add working features to CLAUDE.md "DO NOT CHANGE" section
- Add any new issues to TROUBLESHOOTING.md
- Archive old troubleshooting docs if they become redundant

### 3. Archive Completed Work
- Move completed feature docs to `archive/`
- Keep only current/relevant documentation active

## 📝 DOCUMENTATION MAINTENANCE

### CLAUDE.md (Master Reference)
**PURPOSE**: Single source of truth for what works and shouldn't be changed
**UPDATE WHEN**:
- New feature works perfectly and shouldn't be modified
- Critical configuration discovered (like `position: fixed` layout fix)
- Database passwords or connection details change
- New "DO NOT CHANGE" items identified

### TROUBLESHOOTING.md (Problem Solving)
**PURPOSE**: Quick solutions to common issues
**UPDATE WHEN**:
- New issue discovered and solved
- Better solution found for existing problem
- Steps become outdated due to system changes

### Archive Old Docs When:
- Problem no longer exists (system changed)
- Multiple docs cover same topic (consolidate)
- Information becomes outdated/irrelevant

## 🚨 MAINTENANCE ALERTS

### Weekly Cleanup Checklist:
- [ ] Move loose files from main folder
- [ ] Check if any debug files can be archived
- [ ] Update CLAUDE.md with any new "working perfectly" items
- [ ] Consolidate similar troubleshooting docs
- [ ] Archive completed feature documentation

### Monthly Deep Clean:
- [ ] Review all files in main folder - move 90% to organized subfolders
- [ ] Archive outdated troubleshooting guides
- [ ] Consolidate duplicate documentation
- [ ] Update folder structure if needed

## 🛡️ PROTECTION RULES

### NEVER MOVE/DELETE:
- `/backend/`, `/frontend/`, `/phoenix_draft/` folders
- `CLAUDE.md` (master reference)
- Active `.env` files
- Current troubleshooting reference images
- Launcher scripts that work

### ALWAYS ASK BEFORE:
- Deleting ANY file (move to archive instead)
- Changing folder structure
- Consolidating docs with different information
- Moving files that might be actively used

## 🎯 AUTOMATION IDEAS

### Batch Scripts for Cleanup:
```batch
@echo off
echo Moving loose files to organized folders...
if exist *.png move *.png testing\screenshots\
if exist *test*.js move *test*.js testing\debug-scripts\
if exist *debug*.js move *debug*.js testing\debug-scripts\
if exist *ANALYSIS*.md move *ANALYSIS*.md testing\test-reports\
echo Cleanup complete!
```

### File Naming Conventions:
- Screenshots: `feature-name-description.png`
- Debug scripts: `debug-feature-name.js`
- Test reports: `FEATURE_ANALYSIS_YYYY-MM-DD.md`
- Archived docs: `ORIGINAL_NAME_archived_YYYY-MM-DD.md`

## 💡 BEST PRACTICES

### For Claude:
1. **Before starting new work**: Check main folder, move loose files
2. **After completing feature**: Update CLAUDE.md with "DO NOT CHANGE" items
3. **When troubleshooting**: Add solution to TROUBLESHOOTING.md
4. **Creating files**: Use organized subfolders, not main folder
5. **Archiving**: Move to archive/, don't delete

### For User:
1. **Tell Claude to clean up** after each major feature
2. **Review CLAUDE.md** before making changes to working systems
3. **Use TROUBLESHOOTING.md** as first reference when stuck
4. **Archive old docs** instead of deleting them

---
**REMEMBER**: The goal is to keep the main folder clean with only essential project folders and one master reference (CLAUDE.md). Everything else should be organized into purpose-specific subfolders!