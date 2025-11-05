# OAuth2 Setup for Google Drive Uploads

## Why OAuth2 is Needed

Service accounts **cannot upload to their own Google Drive**. To upload LST results to Google Drive, we need:

1. **Service Account** for Earth Engine API (already set up)
2. **OAuth2 credentials** for Google Drive uploads (on behalf of a real user)

## Setup Steps

### Step 1: Create OAuth2 Client Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project (`ee-corfobbppciren2023`)
3. Click **"+ CREATE CREDENTIALS" → "OAuth client ID"**
4. Application type: **"Desktop app"**
5. Name: `LST Drive Uploader`
6. Click **"CREATE"**
7. Download the JSON file
8. Save it as: `credentials/oauth2-credentials.json`

**The file should look like:**
```json
{
  "installed": {
    "client_id": "123456789.apps.googleusercontent.com",
    "project_id": "ee-corfobbppciren2023",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost"]
  }
}
```

### Step 2: Authorize the Application

Run the authorization script **once** on your local machine:

```bash
npm run authorize
```

This will:
1. Open your browser for Google authentication
2. Ask you to sign in with your **corfobbppciren2023@gmail.com** account
3. Grant permission to access Google Drive
4. Generate a refresh token
5. Save the refresh token to `.env`

**Important:** The refresh token allows the script to access Drive without needing to log in each time.

### Step 3: Share the Drive Folder

1. Open Google Drive with your `corfobbppciren2023@gmail.com` account
2. Find or create the folder: **"LST VIIRS"**
3. Right-click → Share
4. Add your service account email: `gee-automation@ee-corfobbppciren2023.iam.gserviceaccount.com`
5. Give it **"Editor"** permissions
6. Click **"Share"**

### Step 4: Verify .env File

Your `.env` file should now contain:

```bash
# Earth Engine Service Account
SERVICE_ACCOUNT_EMAIL=gee-automation@ee-corfobbppciren2023.iam.gserviceaccount.com
GEE_PROJECT_ID=ee-corfobbppciren2023
SERVICE_ACCOUNT_KEY_PATH=./credentials/service-account-key.json

# Google Drive OAuth2
DRIVE_REFRESH_TOKEN=1//0gXXXXXXXXXXXXXXXXXXXXXXXX...
```

### Step 5: Test Locally

```bash
npm start
```

The script will:
1. Authenticate with Earth Engine using service account
2. Export LST data to EE assets
3. (Future feature: Download and upload to Drive using OAuth2)

## For GitHub Actions

### Add Secrets

Go to your repository: **Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Value | Where to Get It |
|------------|-------|----------------|
| `EE_PRIVATE_KEY` | Service account JSON | Copy entire `credentials/service-account-key.json` |
| `OAUTH2_CREDENTIALS_JSON` | OAuth2 client JSON | Copy entire `credentials/oauth2-credentials.json` |
| `DRIVE_REFRESH_TOKEN` | Refresh token | From your `.env` file |

### Update Workflow

```yaml
- name: Run LST processing
  env:
    EE_PRIVATE_KEY: ${{ secrets.EE_PRIVATE_KEY }}
    OAUTH2_CREDENTIALS_JSON: ${{ secrets.OAUTH2_CREDENTIALS_JSON }}
    DRIVE_REFRESH_TOKEN: ${{ secrets.DRIVE_REFRESH_TOKEN }}
  run: npm start
```

## Security Notes

✅ **Never commit these files:**
- `credentials/oauth2-credentials.json`
- `credentials/service-account-key.json`
- `.env`

✅ **Refresh token benefits:**
- No interactive login needed in automation
- Tokens can be revoked at: https://myaccount.google.com/permissions
- Rotate refresh tokens periodically for security

## Troubleshooting

### "DRIVE_REFRESH_TOKEN is not set"

Run `npm run authorize` to generate a new refresh token.

### "Token has been expired or revoked"

The refresh token is invalid. Solutions:
1. Revoke access at: https://myaccount.google.com/permissions
2. Run `npm run authorize` again
3. Update `.env` and GitHub secrets with new token

### "Insufficient Permission"

Make sure you shared the "LST VIIRS" folder with your service account email.

## Architecture

```
┌─────────────────────────────────────────┐
│ Earth Engine Export (Service Account)  │
├─────────────────────────────────────────┤
│ • Processes VIIRS + CFSv2 data          │
│ • Exports to EE Assets                  │
│ • Uses service-account-key.json         │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│ Google Drive Upload (OAuth2)            │
├─────────────────────────────────────────┤
│ • Downloads asset as GeoTIFF            │
│ • Uploads to shared Drive folder        │
│ • Uses OAuth2 refresh token             │
└─────────────────────────────────────────┘
```

---

**You're all set!** The project now uses OAuth2 for Drive uploads while keeping service account auth for Earth Engine.
