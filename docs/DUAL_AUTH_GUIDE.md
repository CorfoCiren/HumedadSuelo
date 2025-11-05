# Dual Authentication System: Service Account + OAuth2

## Overview

This project uses **two different authentication methods** for different purposes:

1. **Service Account** (for Earth Engine API)
2. **OAuth2** (for Google Drive uploads)

## Why Two Authentication Methods?

### Service Account Limitations

✅ **Good for:**
- Earth Engine API access
- Automated scripts
- GitHub Actions
- Server-to-server communication

❌ **Cannot:**
- Upload to its own Google Drive
- Access personal Google Drive files
- Act as a regular user

### OAuth2 Benefits

✅ **Good for:**
- Google Drive file operations
- Acting on behalf of a real user
- Accessing shared Drive folders

❌ **Requires:**
- Initial browser-based authorization
- Refresh token management
- User consent

## How It Works Together

```
┌─────────────────────────────────────────────────────────┐
│ YOUR PROJECT                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────┐         ┌───────────────┐          │
│  │ Earth Engine  │         │ Google Drive  │          │
│  │   Processing  │         │    Upload     │          │
│  ├───────────────┤         ├───────────────┤          │
│  │ Service Acct  │         │    OAuth2     │          │
│  │ (Automated)   │         │ (User Auth)   │          │
│  └───────┬───────┘         └───────┬───────┘          │
│          │                         │                   │
│          ▼                         ▼                   │
│  ┌───────────────┐         ┌───────────────┐          │
│  │ EE Assets     │         │ Drive Folder  │          │
│  │ (Cloud Path)  │         │ "LST VIIRS"   │          │
│  └───────────────┘         └───────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. Earth Engine Export (Service Account)

```javascript
// Uses: credentials/service-account-key.json
// Environment: EE_PRIVATE_KEY (GitHub Actions)

import { initializeEE } from './auth.js';
await initializeEE(); // Authenticates with service account
// Now can access Earth Engine API
```

### 2. Drive Upload (OAuth2)

```javascript
// Uses: credentials/oauth2-credentials.json + DRIVE_REFRESH_TOKEN
// Environment: OAUTH2_CREDENTIALS_JSON + DRIVE_REFRESH_TOKEN

import { initializeDrive } from './driveHelper.js';
const drive = await initializeDrive(); // Authenticates with OAuth2
// Now can upload to Drive
```

## File Structure

```
credentials/
├── service-account-key.json       # For Earth Engine (NEVER commit)
└── oauth2-credentials.json        # For Drive (NEVER commit)

.env                                # Contains DRIVE_REFRESH_TOKEN
```

## Setup Checklist

- [ ] **Service Account Setup**
  - [ ] Created in Google Cloud Console
  - [ ] Downloaded `service-account-key.json`
  - [ ] Registered with Earth Engine
  - [ ] Placed in `credentials/` folder

- [ ] **OAuth2 Setup**
  - [ ] Created OAuth2 client in Google Cloud Console
  - [ ] Downloaded `oauth2-credentials.json`
  - [ ] Placed in `credentials/` folder
  - [ ] Ran `npm run authorize` to get refresh token
  - [ ] Refresh token saved to `.env`

- [ ] **Drive Folder Sharing**
  - [ ] Created "LST VIIRS" folder in Drive
  - [ ] Shared with service account email
  - [ ] Gave "Editor" permissions

- [ ] **GitHub Secrets** (if using GitHub Actions)
  - [ ] `EE_PRIVATE_KEY` (service account JSON)
  - [ ] `OAUTH2_CREDENTIALS_JSON` (OAuth2 client JSON)
  - [ ] `DRIVE_REFRESH_TOKEN` (from `.env`)

## Quick Reference

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Get OAuth2 refresh token (one-time)
npm run authorize

# 3. Run the script
npm start
```

### Environment Variables

```bash
# .env file
SERVICE_ACCOUNT_EMAIL=gee-automation@ee-corfobbppciren2023.iam.gserviceaccount.com
GEE_PROJECT_ID=ee-corfobbppciren2023
SERVICE_ACCOUNT_KEY_PATH=./credentials/service-account-key.json
DRIVE_REFRESH_TOKEN=1//0gXXXXXXXXXXXXX... # From npm run authorize
```

### GitHub Actions

```yaml
env:
  EE_PRIVATE_KEY: ${{ secrets.EE_PRIVATE_KEY }}
  OAUTH2_CREDENTIALS_JSON: ${{ secrets.OAUTH2_CREDENTIALS_JSON }}
  DRIVE_REFRESH_TOKEN: ${{ secrets.DRIVE_REFRESH_TOKEN }}
```

## Troubleshooting

### "Request is missing required authentication credential"

**Issue:** Service account key not found or invalid

**Solutions:**
1. Check `credentials/service-account-key.json` exists
2. Verify it's a **service account** key (not OAuth2)
3. Ensure it's registered with Earth Engine

### "DRIVE_REFRESH_TOKEN is not set"

**Issue:** OAuth2 not authorized

**Solutions:**
1. Run `npm run authorize`
2. Follow browser prompts
3. Copy refresh token to `.env`

### "Token has been expired or revoked"

**Issue:** Refresh token is invalid

**Solutions:**
1. Revoke access: https://myaccount.google.com/permissions
2. Run `npm run authorize` again
3. Update `.env` and GitHub secrets

### "Insufficient Permission" (Drive upload)

**Issue:** Service account can't access Drive folder

**Solutions:**
1. Open "LST VIIRS" folder in Drive
2. Share with service account email
3. Give "Editor" permissions

## Security Best Practices

✅ **DO:**
- Keep credentials in `credentials/` folder (gitignored)
- Use environment variables for secrets
- Rotate refresh tokens periodically
- Use GitHub Secrets for CI/CD

❌ **DON'T:**
- Commit any `.json` credentials to Git
- Share refresh tokens publicly
- Use OAuth2 credentials for Earth Engine
- Use service account for Drive uploads

## Additional Resources

- [Service Account Guide](OAUTH_VS_SERVICE_ACCOUNT.md)
- [OAuth2 Setup Guide](OAUTH2_SETUP.md)
- [GitHub Actions Setup](../README.md#github-actions)

---

**Need Help?** Check the troubleshooting sections in each guide or review the example project files.
