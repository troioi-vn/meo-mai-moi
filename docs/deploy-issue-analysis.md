# Root Cause Analysis: Intermittent Data Loss After Deploy

## 🔍 The Issue

Database data was being erased intermittently after running `./utils/deploy.sh` without the `--fresh` flag.

**Expected behavior:** Data should be preserved
**Actual behavior:** Data was lost on second deployment

## 🎯 Root Cause Identified

**There were TWO conflicting deploy scripts:**

1. `/home/edward/Documents/meo-mai-moi/utils/deploy.sh` (NEW - correct)
   - Properly calls `docker compose down` (without `-v`) to preserve volumes
   - Only deletes volumes when `--fresh` flag is used
   - Has proper data preservation logic

2. `/home/edward/Documents/meo-mai-moi/tmp/deploy.sh` (OLD - problematic)
   - Missing the data preservation logic
   - Had stale/outdated behavior
   - Could be accidentally invoked causing confusion

**The intermittent behavior occurred because:**
- Sometimes users might have run the old script from `/tmp/deploy.sh`
- Or there could be shell history autocomplete pointing to the wrong script
- The old script didn't have proper safeguards

## ✅ Solution Implemented

1. **Deleted the stale script:**
   ```bash
   rm /home/edward/Documents/meo-mai-moi/tmp/deploy.sh
   ```

2. **Added safeguards to prevent confusion:**
   - Added `.gitignore` in `/tmp` directory to prevent committing old scripts
   - Added README in `/utils` directory explaining the correct deployment process
   - Added duplicate script detection to `/utils/deploy.sh` to warn if stale scripts exist

3. **Enhanced deployment script:**
   - Now warns if it detects other deploy scripts in the repository
   - Provides clear guidance on using the correct script

## 🔒 Data Preservation Behavior

### Normal Deploy (data PRESERVED)
```bash
./utils/deploy.sh
```
- Containers stop and restart
- Database volume `pgdata` is PRESERVED
- Only new migrations are applied
- Existing data remains intact ✓

### Fresh Deploy (data LOST intentionally)
```bash
./utils/deploy.sh --fresh
```
- Containers and volumes are DELETED
- Database is completely reset
- New schema created from scratch
- ⚠️ Use only when intentionally resetting

## 📋 Prevention Checklist

- [x] Remove old deploy script
- [x] Add gitignore to prevent old scripts from being committed
- [x] Add README to clarify correct deployment method
- [x] Add safety checks to detect duplicate scripts
- [x] Document the issue and solution

## 🚀 Going Forward

**Always use:** `./utils/deploy.sh`

**Never use:** 
- `./tmp/deploy.sh` (deleted)
- Any other deploy script outside of `/utils`

## ⚠️ If You Find Other Deploy Scripts

If you find other stale deploy scripts in the repo:
1. Delete them immediately
2. Verify you're using `./utils/deploy.sh`
3. Run `./utils/deploy.sh --help` to see all options
