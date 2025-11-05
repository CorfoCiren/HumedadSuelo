# Setup Instructions

## 1. Install Dependencies

```bash
npm install
```

## 2. Setup Earth Engine Authentication

### ⚠️ IMPORTANT: You need a SERVICE ACCOUNT key (NOT OAuth2 credentials)

### For Local Development:

#### Step 1: Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Earth Engine enabled project
3. Navigate to **IAM & Admin → Service Accounts**
4. Click **"Create Service Account"** (or use an existing one)
5. Give it a name (e.g., "earth-engine-processing")
6. Grant it the **"Earth Engine Resource Writer"** role (or appropriate permissions)
7. Click **"Done"**

#### Step 2: Create a JSON Key

1. Click on the service account you just created
2. Go to the **"Keys"** tab
3. Click **"Add Key" → "Create new key"**
4. Choose **JSON** format
5. Click **"Create"**
6. A JSON file will be downloaded - this is your **service account key**

   **This file should look like:**
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
     "client_id": "...",
     ...
   }
   ```

   **NOT like this (OAuth2 client):**
   ```json
   {
     "installed": {
       "client_id": "...",
       "project_id": "...",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       ...
     }
   }
   ```

#### Step 3: Register the Service Account with Earth Engine

1. Go to [https://signup.earthengine.google.com/#!/service_accounts](https://signup.earthengine.google.com/#!/service_accounts)
2. Enter the **service account email** from the JSON file (e.g., `your-service-account@your-project.iam.gserviceaccount.com`)
3. Click **"Register"**
4. Wait for approval (usually instant for existing projects)

#### Step 4: Save the Credentials Locally

```bash
# Create credentials directory
mkdir -p credentials

# Move/copy your downloaded JSON key to:
# credentials/service-account-key.json
# OR
# credentials/earth-engine-key.json
```

The script will automatically look for the key in these locations:
- `credentials/service-account-key.json` ✅ (recommended)
- `credentials/earth-engine-key.json`
- `service-account-key.json`
- `earth-engine-key.json`

### For GitHub Actions:

1. Get your service account JSON key (from Step 2 above)

2. Get your OAuth2 credentials (see [OAuth2 Setup Guide](docs/OAUTH2_SETUP.md))

3. Add secrets to GitHub:
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   
   **Add these secrets:**
   
   | Secret Name | Value |
   |------------|-------|
   | `EE_PRIVATE_KEY` | Entire service account JSON content |
   | `OAUTH2_CREDENTIALS_JSON` | Entire OAuth2 client JSON content |
   | `DRIVE_REFRESH_TOKEN` | From your `.env` file (run `npm run authorize` first) |

## 2.5. Setup Google Drive OAuth2 (for Drive uploads)

**Why?** Service accounts cannot upload to their own Google Drive. We need OAuth2 to upload on behalf of your Gmail account.

See the complete guide: **[OAuth2 Setup Guide](docs/OAUTH2_SETUP.md)**

**Quick steps:**
1. Create OAuth2 credentials in Google Cloud Console
2. Save as `credentials/oauth2-credentials.json`
3. Run `npm run authorize` to generate refresh token
4. Share "LST VIIRS" Drive folder with your service account

## 3. Verify Assets Access

Make sure your service account has access to:
- `projects/ee-corfobbppciren2023/assets/`
- `projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/`
- `projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_LST/`

## 4. Test Locally

```bash
npm start
```

You should see:
```
========================================
CORFO SOIL MOISTURE - LST PROCESSING
========================================

Initializing Earth Engine...
✓ Earth Engine initialized successfully

Starting LST export process...
========================================
SEARCHING FOR MISSING YEARS
========================================
...
```

## 5. Deploy to GitHub Actions

1. Push your code to GitHub (credentials folder will be ignored)
2. Go to Actions tab
3. Select "LST Processing" workflow
4. Click "Run workflow" to test

## Troubleshooting

### "Authentication failed"
- Check that your service account JSON is valid
- Verify the service account is registered with Earth Engine
- Ensure EE_PRIVATE_KEY secret is properly set in GitHub

### "Error listing assets"
- Verify asset paths are correct
- Check service account has read permissions
- Try accessing the assets in Earth Engine Code Editor

### "Export failed"
- Check Earth Engine quotas
- Verify export destination exists
- Review task manager in Earth Engine Code Editor
