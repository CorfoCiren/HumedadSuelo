# CORFO_23BP_Valparaiso_HS

## 🚀 GitHub Actions Automation

This project is fully automated with GitHub Actions! Five workflows run automatically:

1. **LST Processing** (Jan 5) - Exports LST data
2. **SM Export** (Jan 8) - Exports Soil Moisture to assets
3. **SM Download** (Jan 11) - Downloads and uploads to Google Drive
4. **Dashboard Update** (Jan 14) - Processes metrics and makes assets public
5. **Token Keep-Alive** (Every 3 months) - Refreshes OAuth2 token

### Quick Start

```bash
# 1. Add secrets to GitHub (one-time setup)
Settings → Secrets → Add:
  - EE_PRIVATE_KEY (service account JSON)
  - OAUTH2_CREDENTIALS_JSON (OAuth2 client JSON)
  - DRIVE_REFRESH_TOKEN (from .env file)

# 2. Run workflows manually or let them run automatically
Actions → Select workflow → Run workflow
```

See detailed guides:
- **[GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md)** - Complete setup guide
- **[Dashboard Update Setup](DASHBOARD_UPDATE_SETUP.md)** - Python integration (NEW!)
- **[Workflow Monitoring](WORKFLOW_MONITORING.md)** - How to monitor workflows

---

