# Workflow Monitoring Guide

## 📊 Monitoring Dashboard

### GitHub Actions Tab

```
https://github.com/YOUR_USERNAME/CORFO_23BP_Valparaiso_HS/actions
```

**What you'll see:**
- All workflow runs (past and current)
- Status: ✅ Success | ⏳ In Progress | ❌ Failed
- Duration and timestamps
- Commit that triggered the run

## 🔍 Checking Workflow Status

### View Active Workflows

1. Go to **Actions** tab
2. Look for workflows with 🟡 yellow dot (running)
3. Click to see live logs

### View Completed Workflows

1. Go to **Actions** tab
2. Look for workflows with ✅ green check (success) or ❌ red X (failed)
3. Click to see summary and logs

## 📝 Reading Workflow Logs

### Step-by-Step Log View

```
Actions Tab
  ↓
Select Workflow Run
  ↓
Click Job Name (e.g., "process-lst")
  ↓
Expand Individual Steps
  ↓
See Detailed Output
```

### Key Log Sections

**LST Processing:**
```
========================================
SEARCHING FOR MISSING YEARS
========================================
Existing years: 2015, 2016, ..., 2024
Missing past years: (none)
→ Exporting current year: 2025 (forced update)

PROCESS COMPLETED
Exports started: 1
📄 Task list saved to: lst_tasks.json
```

**SM Export:**
```
========================================
SOIL MOISTURE EXPORT
========================================
Year: 2025
Processing months: 1 to 11

→ Exporting month 1 of 2025
→ Exporting month 2 of 2025
...

Exports started: 11
📄 Task list saved to: sm_tasks.json
```

**SM Download:**
```
Starting download and upload process...
Found 11 tasks to process.

Processing Year: 2025, Month: 1
Downloading asset: projects/ee-corfobbppciren2023/assets/HS/SM2025Valparaiso_GCOM_mes1
  ✓ Downloaded to: temp_sm_tiffs/SM2025Valparaiso_VIIRS_mes1.tif
  ✓ Uploaded: SM2025Valparaiso_VIIRS_mes1.tif

All tasks processed!
  Successfully uploaded: 11
  Failed or skipped: 0
  Total: 11
```

## 📧 Email Notifications

### Enable Workflow Failure Alerts

1. Go to **Settings** → **Notifications**
2. Check **"Actions" → "Send notifications for failed workflows"**
3. You'll receive emails when workflows fail

### Configure Custom Notifications (Optional)

Add to workflow YAML:

```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Workflow failed: ${{ github.workflow }}',
        body: 'Check the workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
      })
```

## 🎯 What to Monitor

### After LST Workflow

✅ **Check:**
- [ ] Workflow completed successfully
- [ ] `lst_tasks.json` committed to repository
- [ ] Earth Engine tasks visible in [Tasks tab](https://code.earthengine.google.com/tasks)

### After SM Export Workflow

✅ **Check:**
- [ ] Workflow completed successfully
- [ ] `sm_tasks.json` committed to repository
- [ ] Earth Engine tasks visible in [Tasks tab](https://code.earthengine.google.com/tasks)

### After SM Download Workflow

✅ **Check:**
- [ ] Workflow completed successfully
- [ ] Files uploaded to Google Drive "Humedad de suelo" folder
- [ ] Number of files matches number of tasks

### After Token Keep-Alive

✅ **Check:**
- [ ] Workflow completed successfully
- [ ] Log shows "Access token obtained successfully"

## 🚨 Common Warning Signs

| Warning | Meaning | Action |
|---------|---------|--------|
| Workflow taking > 60 min | May be stuck | Check logs, cancel if needed |
| "sm_tasks.json not found" | SM Export didn't run first | Run SM Export workflow |
| "Permission denied" | Missing Drive permissions | Share folder with service account |
| "Token expired" | OAuth2 token invalid | Run Token Keep-Alive or regenerate |

## 📥 Downloading Artifacts

### When Workflows Fail

1. Go to failed workflow run
2. Scroll to **Artifacts** section
3. Download logs (e.g., `sm-download-logs`)
4. Unzip and review error details

### Artifact Retention

- **Logs:** 30 days
- **Tasks are committed to Git** (no expiration!)

## 🔄 Re-Running Failed Workflows

### Manual Re-Run

1. Go to failed workflow run
2. Click **"Re-run all jobs"** button
3. Or **"Re-run failed jobs"** to only retry failures

### After Fixing Issues

```bash
# Example: If token expired, regenerate it
npm run authorize

# Update GitHub Secret with new token
# Then re-run workflow
```

## 📊 Earth Engine Task Monitoring

### Check EE Tasks

1. Go to [Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Click **Tasks** tab
3. Look for tasks with description containing:
   - `Asset_LST` (LST exports)
   - `Asset_SM` (SM exports)

### Task States

- 🟡 **READY** - Queued, not started
- 🔵 **RUNNING** - Currently processing
- ✅ **COMPLETED** - Finished successfully
- ❌ **FAILED** - Error occurred

### Typical Processing Times

- **LST (1 year):** 6-12 hours
- **SM (1 month):** 4-8 hours
- **SM (11 months):** 2-3 days total

## 📁 Google Drive Monitoring

### Check Upload Success

1. Log in to Drive as `corfobbppciren2023@gmail.com`
2. Open folder "Humedad de suelo"
3. Verify files:
   - `SM2025Valparaiso_VIIRS_mes1.tif`
   - `SM2025Valparaiso_VIIRS_mes2.tif`
   - ... etc.

### Expected File Sizes

- Each SM GeoTIFF: ~50-200 MB
- Total for 11 months: ~0.5-2 GB

## 🔍 Troubleshooting Quick Checks

### Workflow Won't Start

```bash
# Check if secrets are set
Settings → Secrets → Actions
# Should see:
# - EE_PRIVATE_KEY
# - OAUTH2_CREDENTIALS_JSON
# - DRIVE_REFRESH_TOKEN
```

### Workflow Fails Immediately

```bash
# Check workflow YAML syntax
# Look for indentation errors or invalid keys
```

### Tasks Not Appearing in EE

```bash
# Check service account permissions
# Verify service account is registered with Earth Engine
```

### Files Not Uploading to Drive

```bash
# Check Drive folder sharing
# Verify service account has "Editor" access
```

## 📈 Success Metrics

### Healthy Pipeline Indicators

✅ All 4 workflows complete successfully  
✅ Task files committed to repository  
✅ EE tasks complete within 3 days  
✅ Files appear in Google Drive  
✅ No error notifications received  

### Annual Run Summary

```
January 5:  LST Processing ✅
January 8:  SM Export ✅
January 11: SM Download ✅

Result: 
- 1 LST asset created
- 11 SM assets created
- 11 SM files in Drive
```

---

**Monitor these 4 checkpoints each January to ensure smooth operation!** 🎯