# GitHub Actions Setup Guide

## Overview

This project uses **4 separate GitHub Actions workflows** for complete automation:

1. **LST Processing** - Exports LST data to Earth Engine assets
2. **SM Export** - Exports Soil Moisture to Earth Engine assets  
3. **SM Download** - Downloads SM assets and uploads to Google Drive
4. **Token Keep-Alive** - Refreshes OAuth2 token every 3 months

## Workflow Schedule

```
January 5th, 2 AM UTC
  ↓
[LST Processing]
  ↓ (3 days)
January 8th, 2 AM UTC
  ↓
[SM Export]
  ↓ (3 days for EE tasks)
January 11th, 2 AM UTC
  ↓
[SM Download & Upload to Drive]

---

Every 3 months (Jan 1, Apr 1, Jul 1, Oct 1)
  ↓
[Keep Token Alive]
```

## Required GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | Where to Get It |
|------------|-------------|----------------|
| `EE_PRIVATE_KEY` | Service account JSON | Copy entire `credentials/service-account-key.json` |
| `OAUTH2_CREDENTIALS_JSON` | OAuth2 client JSON | Copy entire `credentials/oauth2-credentials.json` |
| `DRIVE_REFRESH_TOKEN` | Drive refresh token | From `.env` file after running `npm run authorize` |

### How to Add Secrets

```bash
# 1. Copy service account key
cat credentials/service-account-key.json | pbcopy  # macOS
# or
cat credentials/service-account-key.json | xclip -selection clipboard  # Linux

# 2. Go to GitHub → Settings → Secrets → New repository secret
# Name: EE_PRIVATE_KEY
# Value: [paste]

# 3. Repeat for OAUTH2_CREDENTIALS_JSON and DRIVE_REFRESH_TOKEN
```

## Workflow Details

### 1. LST Processing (`lst-processing.yml`)

**Triggers:**
- Manual: Actions tab → Run workflow
- Scheduled: January 5th at 2 AM UTC every year

**What it does:**
1. Checks out code
2. Installs dependencies
3. Runs `npm run lst` to export LST data
4. Commits `lst_tasks.json` to repository
5. Uploads logs as artifacts

**Duration:** ~5-10 minutes

### 2. SM Export (`sm-export.yml`)

**Triggers:**
- Manual: Actions tab → Run workflow
- Scheduled: January 8th at 2 AM UTC every year

**What it does:**
1. Checks out code
2. Installs dependencies
3. Runs `npm run sm:schedule` to start SM exports
4. Commits `sm_tasks.json` to repository
5. Uploads logs as artifacts

**Duration:** ~5-10 minutes

### 3. SM Download (`sm-download.yml`)

**Triggers:**
- Manual: Actions tab → Run workflow
- Scheduled: January 11th at 2 AM UTC every year

**What it does:**
1. Checks out code
2. Verifies `sm_tasks.json` exists
3. Runs `npm run sm:download` to:
   - Download completed SM assets from Earth Engine
   - Upload to Google Drive folder "Humedad de suelo"
4. Uploads error logs if failed

**Duration:** ~30-60 minutes (depends on number of months)

### 4. Token Keep-Alive (`keep-token-alive.yml`)

**Triggers:**
- Manual: Actions tab → Run workflow
- Scheduled: 1st of Jan/Apr/Jul/Oct at 3 AM UTC

**What it does:**
1. Refreshes OAuth2 access token using refresh token
2. Prevents token expiration due to inactivity

**Duration:** ~30 seconds

## Testing the Workflows

### Initial Setup

```bash
# 1. Install dependencies locally
npm install

# 2. Get OAuth2 refresh token
npm run authorize

# 3. Copy refresh token from .env to GitHub Secrets
cat .env | grep DRIVE_REFRESH_TOKEN
```

### Test Locally First

```bash
# Test LST
npm run lst

# Test SM export
npm run sm:schedule

# Test SM download (after exports complete)
npm run sm:download
```

### Test in GitHub Actions

1. Go to **Actions** tab
2. Select **LST Processing**
3. Click **Run workflow** → **Run workflow**
4. Wait for completion
5. Verify `lst_tasks.json` was committed
6. Repeat for other workflows

## Monitoring

### View Logs

1. Go to **Actions** tab
2. Click on workflow run
3. Click on job name
4. Expand steps to see detailed logs

### Download Artifacts

1. Go to completed workflow run
2. Scroll to **Artifacts** section
3. Download logs for troubleshooting

### Check Outputs

- **LST assets:** `projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/`
- **SM assets:** `projects/ee-corfobbppciren2023/assets/HS/`
- **Drive files:** Google Drive folder "Humedad de suelo"
- **Task tracking:** `lst_tasks.json` and `sm_tasks.json` in repository

## Troubleshooting

### "EE_PRIVATE_KEY secret not found"

**Solution:** Add service account JSON to GitHub Secrets

```bash
# Verify your service account key is valid
cat credentials/service-account-key.json | jq .client_email
```

### "sm_tasks.json not found"

**Solution:** SM Export workflow must run before SM Download

1. Manually run **SM Export** workflow
2. Wait for it to commit `sm_tasks.json`
3. Then run **SM Download** workflow

### "DRIVE_REFRESH_TOKEN is not set"

**Solution:** Add refresh token to GitHub Secrets

```bash
# Get refresh token from .env
cat .env | grep DRIVE_REFRESH_TOKEN

# Copy value and add to GitHub Secrets
```

### "Token has been expired or revoked"

**Solution:** Regenerate refresh token

```bash
# 1. Revoke old token
# Go to: https://myaccount.google.com/permissions
# Find your app and remove access

# 2. Generate new token
npm run authorize

# 3. Update GitHub Secret with new token
```

### "Insufficient Permission" (Drive upload)

**Solution:** Share Drive folder with service account

1. Open Google Drive as `corfobbppciren2023@gmail.com`
2. Find folder "Humedad de suelo"
3. Share with `gee-automation@ee-corfobbppciren2023.iam.gserviceaccount.com`
4. Give "Editor" permissions

## Workflow Dependencies

```
┌─────────────────────────────────────────┐
│ LST Processing                          │
│ • Exports LST to EE Assets              │
│ • Commits lst_tasks.json                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ SM Export                               │
│ • Requires LST assets to exist          │
│ • Exports SM to EE Assets               │
│ • Commits sm_tasks.json                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ SM Download                             │
│ • Reads sm_tasks.json from repo         │
│ • Downloads SM assets                   │
│ • Uploads to Google Drive               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Token Keep-Alive (Independent)          │
│ • Runs every 3 months                   │
│ • Prevents OAuth2 token expiration      │
└─────────────────────────────────────────┘
```

## Cost Considerations

- **GitHub Actions Free Tier:** 2,000 minutes/month for private repos
- **Estimated usage per year:**
  - LST Processing: ~10 min
  - SM Export: ~10 min
  - SM Download: ~60 min
  - Token Keep-Alive: ~2 min × 4 times = ~8 min
  - **Total: ~88 minutes/year** ✅

## Security Best Practices

✅ **Never commit:**
- Service account keys
- OAuth2 credentials
- Refresh tokens
- `.env` files

✅ **Use GitHub Secrets:**
- All sensitive data stored as secrets
- Never exposed in logs
- Automatically redacted in workflow outputs

✅ **Rotate credentials:**
- Service account keys: Yearly
- OAuth2 refresh tokens: When expired or revoked

## Next Steps

1. ✅ Add all secrets to GitHub
2. ✅ Test each workflow manually
3. ✅ Verify outputs in Earth Engine and Drive
4. ✅ Set up email notifications for workflow failures (optional)

---

**Everything is automated!** 🚀 The workflows will run automatically each January.