# ✅ GitHub Actions Migration Complete

## What Was Done

Successfully migrated the entire CORFO Soil Moisture pipeline to GitHub Actions with **4 separate workflows**:

### ✅ Workflows Created

1. **`.github/workflows/lst-processing.yml`**
   - Runs LST processing annually (Jan 5)
   - Exports to Earth Engine assets
   - Commits `lst_tasks.json` to repository

2. **`.github/workflows/sm-export.yml`**
   - Runs SM export annually (Jan 8)
   - Exports to Earth Engine assets
   - Commits `sm_tasks.json` to repository

3. **`.github/workflows/sm-download.yml`**
   - Runs download/upload annually (Jan 11)
   - Downloads SM assets from Earth Engine
   - Uploads to Google Drive using OAuth2

4. **`.github/workflows/keep-token-alive.yml`**
   - Runs every 3 months (Jan/Apr/Jul/Oct 1st)
   - Refreshes OAuth2 access token
   - Prevents token expiration

### ✅ Scripts Created

1. **`src/refresh-token-keepalive.js`**
   - Refreshes OAuth2 token to prevent expiration
   - Used by keep-alive workflow

### ✅ Documentation Created

1. **`GITHUB_ACTIONS_SETUP.md`** - Complete setup guide
2. **`WORKFLOWS_QUICK_START.md`** - Quick reference guide
3. Updated **`README.md`** - Added GitHub Actions section

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ January 5, 2 AM UTC                                         │
├─────────────────────────────────────────────────────────────┤
│ LST Processing Workflow                                     │
│ • Checks out code                                           │
│ • Runs npm run lst                                          │
│ • Exports LST to EE Assets                                  │
│ • Commits lst_tasks.json to repository                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ (3 days for EE tasks)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ January 8, 2 AM UTC                                         │
├─────────────────────────────────────────────────────────────┤
│ SM Export Workflow                                          │
│ • Checks out code                                           │
│ • Runs npm run sm:schedule                                  │
│ • Exports SM to EE Assets                                   │
│ • Commits sm_tasks.json to repository                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ (3 days for EE tasks)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ January 11, 2 AM UTC                                        │
├─────────────────────────────────────────────────────────────┤
│ SM Download Workflow                                        │
│ • Checks out code                                           │
│ • Reads sm_tasks.json from repository                       │
│ • Downloads SM assets from EE                               │
│ • Uploads to Google Drive (OAuth2)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Every 3 Months (Jan/Apr/Jul/Oct 1st, 3 AM UTC)             │
├─────────────────────────────────────────────────────────────┤
│ Token Keep-Alive Workflow                                   │
│ • Refreshes OAuth2 access token                             │
│ • Prevents token expiration                                 │
└─────────────────────────────────────────────────────────────┘
```

## Required GitHub Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Where to Get |
|--------|-------------|--------------|
| `EE_PRIVATE_KEY` | Service account JSON | `credentials/service-account-key.json` |
| `OAUTH2_CREDENTIALS_JSON` | OAuth2 client JSON | `credentials/oauth2-credentials.json` |
| `DRIVE_REFRESH_TOKEN` | OAuth2 refresh token | `.env` file (from `npm run authorize`) |

## Setup Checklist

### One-Time Setup

- [ ] **1. Get OAuth2 credentials**
  ```bash
  # Copy from other project or create new ones
  cp ../CORFO_Bienes_Publicos_23_Valparaiso/oauth2-credentials.json credentials/
  ```

- [ ] **2. Generate refresh token locally**
  ```bash
  npm install
  npm run authorize
  # Follow browser prompts
  ```

- [ ] **3. Add GitHub Secrets**
  - Copy `credentials/service-account-key.json` → `EE_PRIVATE_KEY`
  - Copy `credentials/oauth2-credentials.json` → `OAUTH2_CREDENTIALS_JSON`
  - Copy refresh token from `.env` → `DRIVE_REFRESH_TOKEN`

- [ ] **4. Share Drive folder**
  - Open "Humedad de suelo" in Drive
  - Share with `gee-automation@ee-corfobbppciren2023.iam.gserviceaccount.com`
  - Give "Editor" permissions

### Testing

- [ ] **5. Test LST workflow**
  ```bash
  Actions → LST Processing → Run workflow
  ```

- [ ] **6. Test SM export workflow**
  ```bash
  Actions → SM Export → Run workflow
  ```

- [ ] **7. Verify task files committed**
  - Check `lst_tasks.json` in repository
  - Check `sm_tasks.json` in repository

- [ ] **8. Test SM download workflow** (after 3 days)
  ```bash
  Actions → SM Download → Run workflow
  ```

- [ ] **9. Verify Drive uploads**
  - Open Google Drive
  - Check folder "Humedad de suelo"
  - Verify files uploaded

## Key Features

### ✅ Task Tracking via Git
- Task files (`lst_tasks.json`, `sm_tasks.json`) committed to repository
- No artifact expiration issues
- Persistent across workflow runs
- Easy to track and audit

### ✅ OAuth2 Token Management
- Automatic token refresh every 3 months
- No manual intervention needed
- Prevents "Token expired" errors

### ✅ Separate Workflows
- **LST** - Independent, runs first
- **SM Export** - Depends on LST being complete
- **SM Download** - Runs 3 days after export
- **Token Keep-Alive** - Independent, runs quarterly

### ✅ Error Handling
- Logs uploaded on failure
- Clear error messages in workflow output
- Validation steps before critical operations

## Cost Analysis

**GitHub Actions Free Tier:** 2,000 minutes/month

**Annual Usage:**
- LST Processing: ~10 min
- SM Export: ~10 min
- SM Download: ~60 min
- Token Keep-Alive: ~2 min × 4 = ~8 min
- **Total: ~88 minutes/year** ✅ Well within free tier!

## Security

✅ **All sensitive data in GitHub Secrets:**
- Service account keys
- OAuth2 credentials
- Refresh tokens

✅ **Never committed to repository:**
- `credentials/` folder (gitignored)
- `.env` file (gitignored)
- Credentials automatically redacted in logs

✅ **Credentials only in memory:**
- OAuth2 credentials passed as env vars
- Never written to disk in workflows

## Next Steps

1. ✅ Add secrets to GitHub
2. ✅ Test each workflow manually
3. ✅ Verify outputs in Earth Engine and Drive
4. ✅ Let workflows run automatically in January
5. ✅ Monitor keep-alive workflow every 3 months

## Documentation

- **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** - Complete setup guide
- **[WORKFLOWS_QUICK_START.md](WORKFLOWS_QUICK_START.md)** - Quick reference
- **[SM_OAUTH2_IMPLEMENTATION.md](SM_OAUTH2_IMPLEMENTATION.md)** - OAuth2 details

---

**🎉 Migration Complete!** Your entire pipeline is now automated with GitHub Actions.

No more manual runs - everything runs automatically every January! 🚀