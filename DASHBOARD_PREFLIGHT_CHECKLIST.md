# Dashboard Update - Pre-Flight Checklist

## Before First Run

### ✅ File Structure

Verify these files exist in your repository:

```bash
# New files created
ls .github/workflows/sm-dashboard-update.yml
ls src/update_dashboard.py
ls requirements.txt
ls DASHBOARD_UPDATE_SETUP.md
ls PYTHON_INTEGRATION_COMPLETE.md

# Your existing Python files
ls src/hs_update.py
ls src/publish_asset.py
```

### ✅ GitHub Configuration

1. **Secrets** (Settings → Secrets → Actions)
   - [ ] `EE_PRIVATE_KEY` is set (same as other workflows)

2. **Workflows** (Actions tab)
   - [ ] "SM Dashboard Update" appears in workflow list
   - [ ] Can be triggered manually

### ✅ Python Dependencies

**Local testing** (optional):

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Authenticate Earth Engine (first time only)
python -c "import ee; ee.Authenticate()"

# Test the script
python src/update_dashboard.py
```

### ✅ Workflow Order

Ensure workflows run in this order:

1. **LST Processing** (Jan 5) - Must complete first
2. **SM Export** (Jan 8) - Depends on LST
3. **SM Download** (Jan 11) - Wait for SM exports to complete
4. **Dashboard Update** (Jan 14) - Wait for SM download to complete

## First Manual Test

### Step 1: Test Dashboard Update Manually

1. Go to **Actions** tab
2. Select **"SM Dashboard Update"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Monitor progress in real-time

### Step 2: Verify Results

**Expected workflow output:**

```
✓ Earth Engine initialized successfully
✓ Processing completed with status: COMPLETED
✓ Assets in folder are now public
✓ Dashboard update completed successfully
```

**Check Earth Engine:**

1. Go to https://code.earthengine.google.com/
2. Navigate to `Assets` → `MetricsHSTransposed`
3. Verify new asset was created
4. Check asset is publicly readable

### Step 3: Verify Public Access

**Option 1: Check ACL in Code Editor**

1. Right-click on asset
2. Select "Share"
3. Verify "Anyone can read" is checked

**Option 2: Test public access programmatically**

```python
import ee
ee.Initialize()  # Don't need authentication if public

# Try accessing without credentials
asset = ee.FeatureCollection('projects/ee-corfobbppciren2023/assets/MetricsHSTransposed/[DATE]')
print(asset.size().getInfo())  # Should work without auth
```

## Common Issues and Solutions

## Common Issues and Solutions

### Issue: "gcloud crashed (EOFError)" or "ee.Authenticate() required"

**Cause**: Scripts trying to authenticate interactively on import

**Solution**: ✅ **FIXED!** Scripts now expect EE to be pre-initialized by `update_dashboard.py`

**What was changed**:
- `update_dashboard.py` initializes EE BEFORE importing modules
- `hs_update.py` and `publish_asset.py` no longer call `ee.Initialize()` on import

### Issue: "ModuleNotFoundError: No module named 'hs_update'"

**Cause**: Python files not in `src/` directory

**Solution**:
```bash
# Move files to src/
mv hs_update.py src/
mv publish_asset.py src/
```

### Issue: "Earth Engine not authenticated"

**Cause**: Service account key not properly configured

**Solution**:
```bash
# Verify secret in GitHub
Settings → Secrets → Actions → EE_PRIVATE_KEY
# Should contain full service account JSON
```

### Issue: "Task timeout after 120 minutes"

**Cause**: Earth Engine task is taking too long

**Solution**:
- Tasks continue running in EE after workflow times out
- Wait for task to complete in EE Code Editor
- Re-run workflow to make assets public

### Issue: "No new data to process"

**Cause**: No new SM assets since last run

**Solution**:
- This is expected behavior
- Workflow will skip processing and just publish existing assets
- Not an error

## Monitoring Dashboard

### GitHub Actions Logs

**View logs:**
1. Actions tab → Select workflow run
2. Click job name
3. Expand steps to see detailed output

**Key log sections:**
- ✓ Earth Engine initialization
- ✓ Processing soil moisture data
- ✓ Making assets public
- ✓ Final summary

### Earth Engine Tasks

**Check task status:**
1. https://code.earthengine.google.com/tasks
2. Look for tasks with "MetricsHS" in name
3. Monitor state: READY → RUNNING → COMPLETED

### Success Indicators

✅ Workflow completes without errors  
✅ New asset created in MetricsHSTransposed  
✅ Assets are publicly readable  
✅ Logs show "COMPLETED" status  
✅ No timeout or authentication errors  

## Schedule Verification

### Automatic Schedule

The workflow runs automatically:
- **Date**: January 14th
- **Time**: 2:00 AM UTC
- **Frequency**: Once per year

### Manual Override

You can always run manually:
- Actions → SM Dashboard Update → Run workflow

### Next Scheduled Run

```bash
# Calculate next run date
# Current year: 2025
# Next automatic run: January 14, 2026 at 2:00 AM UTC
```

## Performance Expectations

### Typical Execution Times

| Step | Duration | Notes |
|------|----------|-------|
| EE Initialization | < 1 min | Service account auth |
| Process SM Data | 5-30 min | Depends on data volume |
| Export Task Wait | 30-90 min | Earth Engine processing |
| Make Assets Public | < 5 min | Quick ACL updates |
| **Total** | **~40-120 min** | Within 2-hour timeout |

### Resource Usage

- **Compute**: GitHub Actions runner (Ubuntu)
- **Memory**: < 2 GB (Python + earthengine-api)
- **Storage**: Minimal (no large files stored)

## Final Checklist

Before marking as "complete", verify:

- [ ] All 5 files created (workflow, scripts, docs)
- [ ] Existing Python files in `src/` directory
- [ ] GitHub secret `EE_PRIVATE_KEY` is set
- [ ] Manual test run completed successfully
- [ ] New asset created in Earth Engine
- [ ] Assets are publicly accessible
- [ ] No errors in workflow logs
- [ ] README updated with new workflow
- [ ] Documentation reviewed and understood

---

**Once all items are checked, your dashboard update automation is ready!** 🎉

The workflow will run automatically every January 14th, processing metrics and making assets public without any manual intervention.