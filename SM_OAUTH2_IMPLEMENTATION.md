# Soil Moisture OAuth2 Drive Upload - Implementation Complete

## What Changed

### ✅ Problem Fixed
**Before:** Service accounts cannot upload to Google Drive (Error: Service accounts do not have storage quota)

**After:** Two-phase workflow:
1. Export to EE Assets (service account)
2. Download & upload to Drive (OAuth2 user credentials)

## New Files Created

### 1. `src/sm-scheduler.js`
Initiates GEE export tasks and saves task list to `sm_tasks.json`

### 2. `src/sm-download-and-upload.js`
Downloads completed assets from EE and uploads to Google Drive using OAuth2

## Modified Files

### 1. `src/modules/Export.js`
- ❌ Removed: `ee.batch.Export.image.toDrive()` (doesn't work with service accounts)
- ✅ Added: Return task info for tracking
- ✅ Only exports to EE Assets now

### 2. `src/main_HS.js`
- ✅ Collects task info from all exports
- ✅ Saves tasks to `sm_tasks.json`
- ✅ Returns task list for scheduler

### 3. `package.json`
- ✅ Added `axios` dependency for downloads
- ✅ Added scripts:
  - `npm run sm:schedule` - Start exports and save tasks
  - `npm run sm:download` - Download and upload to Drive

### 4. `.gitignore`
- ✅ Added `temp_sm_tiffs/` to ignore temp files

## New Workflow

### Phase 1: Export to Earth Engine Assets (Immediate)

```bash
npm run sm:schedule
```

This will:
1. Initialize Earth Engine with service account
2. Start 11 export tasks (one per month, Jan-Nov)
3. Save task info to `sm_tasks.json`
4. **Commit `sm_tasks.json` to Git** for tracking

**Output:**
```
sm_tasks.json (committed to Git):
[
  {
    "taskId": "ABC123...",
    "assetPath": "projects/ee-corfobbppciren2023/assets/HS/SM2025Valparaiso_GCOM_mes1",
    "year": 2025,
    "month": 1,
    "status": "SUBMITTED"
  },
  ...
]
```

### Phase 2: Download & Upload to Drive (2-3 days later)

```bash
npm run sm:download
```

This will:
1. Read `sm_tasks.json`
2. Download each asset as GeoTIFF
3. Upload to Google Drive folder "Humedad de suelo"
4. Clean up temp files

**Requirements:**
- `DRIVE_REFRESH_TOKEN` in `.env` (get with `npm run authorize`)
- Drive folder "Humedad de suelo" shared with service account

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get OAuth2 Refresh Token (One-time)

```bash
npm run authorize
```

Follow the browser prompts and authorize with `corfobbppciren2023@gmail.com`.

### 3. Share Drive Folder

1. Log in to Google Drive as `corfobbppciren2023@gmail.com`
2. Find folder: "Humedad de suelo"
3. Share with: `gee-automation@ee-corfobbppciren2023.iam.gserviceaccount.com`
4. Give "Editor" permissions

### 4. Run the Workflow

```bash
# Step 1: Export to EE Assets
npm run sm:schedule

# Commit the tasks file
git add sm_tasks.json
git commit -m "Update SM tasks for $(date +%Y-%m)"
git push

# Step 2: Wait 2-3 days for EE tasks to complete

# Step 3: Download and upload to Drive
npm run sm:download
```

## For GitHub Actions

### Required Secrets

Add these to GitHub repository secrets:

| Secret | Value |
|--------|-------|
| `EE_PRIVATE_KEY` | Service account JSON |
| `OAUTH2_CREDENTIALS_JSON` | OAuth2 client JSON |
| `DRIVE_REFRESH_TOKEN` | From `.env` file |

### Workflow Example

```yaml
# .github/workflows/sm-export.yml
name: SM Export

on:
  schedule:
    - cron: '0 2 1 * *'  # Monthly on 1st at 2 AM
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - name: Run SM scheduler
        env:
          EE_PRIVATE_KEY: ${{ secrets.EE_PRIVATE_KEY }}
        run: npm run sm:schedule
      - name: Commit tasks.json
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add sm_tasks.json
          git commit -m "Update SM tasks $(date +%Y-%m-%d)" || exit 0
          git push

# .github/workflows/sm-download.yml
name: SM Download

on:
  schedule:
    - cron: '0 2 4 * *'  # Monthly on 4th at 2 AM (3 days later)
  workflow_dispatch:

jobs:
  download:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - name: Download and upload to Drive
        env:
          EE_PRIVATE_KEY: ${{ secrets.EE_PRIVATE_KEY }}
          OAUTH2_CREDENTIALS_JSON: ${{ secrets.OAUTH2_CREDENTIALS_JSON }}
          DRIVE_REFRESH_TOKEN: ${{ secrets.DRIVE_REFRESH_TOKEN }}
        run: npm run sm:download
```

## File Structure

```
CORFO_23BP_Valparaiso_HS/
├── sm_tasks.json                    # ✅ Tracked in Git (committed after export)
├── src/
│   ├── sm-scheduler.js              # ✅ New: Export scheduler
│   ├── sm-download-and-upload.js    # ✅ New: Download & upload
│   ├── main_HS.js                   # ✅ Updated: Returns tasks
│   └── modules/
│       └── Export.js                # ✅ Updated: Only Assets export
└── temp_sm_tiffs/                   # ⚠️ Temporary (gitignored)
```

## Task Tracking

### sm_tasks.json Example

```json
[
  {
    "taskId": "ABC123DEF456",
    "assetPath": "projects/ee-corfobbppciren2023/assets/HS/SM2025Valparaiso_GCOM_mes1",
    "year": 2025,
    "month": 1,
    "status": "SUBMITTED"
  },
  {
    "taskId": "GHI789JKL012",
    "assetPath": "projects/ee-corfobbppciren2023/assets/HS/SM2025Valparaiso_GCOM_mes2",
    "year": 2025,
    "month": 2,
    "status": "SUBMITTED"
  }
]
```

## Testing

### Local Test

```bash
# 1. Export to EE
npm run sm:schedule

# 2. Wait for tasks to complete (or test with existing assets)

# 3. Download and upload
npm run sm:download
```

### Check Progress

- **EE Tasks:** https://code.earthengine.google.com/tasks
- **Google Drive:** Drive folder "Humedad de suelo"

## Benefits

✅ **No storage quota errors** - Uses OAuth2 user credentials  
✅ **Task tracking** - `sm_tasks.json` committed to Git  
✅ **Resumable** - Can re-run download step if it fails  
✅ **Automated** - Works in GitHub Actions  
✅ **Secure** - No credentials in repository

---

**Everything is ready!** Run `npm install` then `npm run sm:schedule` to test. 🚀