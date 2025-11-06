# GitHub Actions Quick Reference

## 🚀 How to Run Workflows Manually

### 1. LST Processing

```bash
# On GitHub:
1. Go to Actions tab
2. Select "LST Processing"
3. Click "Run workflow" → "Run workflow"
```

**What it does:** Exports LST for missing years + current year to Earth Engine

### 2. SM Export

```bash
# On GitHub:
1. Go to Actions tab
2. Select "SM Export - Asset Export"
3. Click "Run workflow" → "Run workflow"
```

**What it does:** Exports Soil Moisture for current year to Earth Engine

### 3. SM Download

```bash
# On GitHub:
1. Go to Actions tab
2. Select "SM Download - Drive Upload"
3. Click "Run workflow" → "Run workflow"
```

**What it does:** Downloads SM assets and uploads to Google Drive

### 4. Token Keep-Alive

```bash
# On GitHub:
1. Go to Actions tab
2. Select "Keep Drive Refresh Token Alive"
3. Click "Run workflow" → "Run workflow"
```

**What it does:** Refreshes OAuth2 token to prevent expiration

## 📅 Automatic Schedule

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| LST Processing | Jan 5, 2 AM UTC | Annual LST export |
| SM Export | Jan 8, 2 AM UTC | Annual SM export |
| SM Download | Jan 11, 2 AM UTC | Download & upload to Drive |
| Token Keep-Alive | Every 3 months | Keep OAuth2 token active |

## 🔑 Required Secrets

Before running workflows, add these secrets in GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `EE_PRIVATE_KEY` | Service account JSON |
| `OAUTH2_CREDENTIALS_JSON` | OAuth2 client JSON |
| `DRIVE_REFRESH_TOKEN` | From `.env` file |

## ✅ Pre-Flight Checklist

Before first run:

- [ ] Added `EE_PRIVATE_KEY` secret
- [ ] Added `OAUTH2_CREDENTIALS_JSON` secret  
- [ ] Added `DRIVE_REFRESH_TOKEN` secret
- [ ] Shared Drive folder "Humedad de suelo" with service account
- [ ] Tested locally with `npm run lst` and `npm run sm:schedule`

## 📊 Workflow Outputs

### LST Processing
- **Assets:** `projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/LST_VIIRS_Day_Valparaiso_YYYY_vN`
- **File:** `lst_tasks.json` (committed to repo)

### SM Export
- **Assets:** `projects/ee-corfobbppciren2023/assets/HS/SM{YEAR}Valparaiso_GCOM_mes{M}`
- **File:** `sm_tasks.json` (committed to repo)

### SM Download
- **Drive:** `Humedad de suelo/SM{YEAR}Valparaiso_VIIRS_mes{M}.tif`

## 🔍 Monitoring

### View Logs
1. Actions tab → Select workflow run → Click job name
2. Expand steps to see detailed logs

### Download Artifacts
1. Completed workflow run → Scroll to Artifacts
2. Download logs for troubleshooting

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Secret not found | Add secret in GitHub Settings |
| sm_tasks.json not found | Run SM Export first |
| Permission denied | Share Drive folder with service account |
| Token expired | Run Token Keep-Alive or regenerate token |

## 📞 Support

See detailed guides:
- [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md)
- [SM OAuth2 Implementation](SM_OAUTH2_IMPLEMENTATION.md)
- [Setup Instructions](SETUP.md)

---

**Ready to go!** All workflows are configured and ready to run. 🎉