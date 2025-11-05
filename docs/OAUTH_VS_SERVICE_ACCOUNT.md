# OAuth2 vs Service Account Authentication

## ❌ You have an OAuth2 token (won't work for Node.js automation)

If your JSON file looks like this, **it will NOT work**:

```json
{
  "installed": {
    "client_id": "123456789.apps.googleusercontent.com",
    "project_id": "your-project",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "...",
    "redirect_uris": ["http://localhost"]
  }
}
```

**Why?** OAuth2 requires interactive browser login - not suitable for automated scripts or GitHub Actions.

## ✅ You need a Service Account key

Your JSON file should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0...",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Key indicators:**
- ✅ Has `"type": "service_account"`
- ✅ Has `"private_key"` (starts with `-----BEGIN PRIVATE KEY-----`)
- ✅ Has `"client_email"` (ends with `.iam.gserviceaccount.com`)

## How to Get a Service Account Key

### Step 1: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Select your project (must be Earth Engine enabled)
3. Click **"+ CREATE SERVICE ACCOUNT"**
4. Enter details:
   - Name: `earth-engine-automation`
   - Description: `For automated Earth Engine processing`
5. Click **"CREATE AND CONTINUE"**
6. Grant role: **"Earth Engine Resource Writer"** or **"Earth Engine Resource Admin"**
7. Click **"CONTINUE"** then **"DONE"**

### Step 2: Download JSON Key

1. Click on the service account you just created
2. Go to **"KEYS"** tab
3. Click **"ADD KEY" → "Create new key"**
4. Select **"JSON"** format
5. Click **"CREATE"**
6. The key will download automatically

### Step 3: Register with Earth Engine

**CRITICAL STEP - Don't skip this!**

1. Go to [Earth Engine Service Account Registration](https://signup.earthengine.google.com/#!/service_accounts)
2. Enter the service account email (e.g., `earth-engine-automation@your-project.iam.gserviceaccount.com`)
3. Click **"REGISTER"**
4. Wait for approval (usually instant)

### Step 4: Place the Key File

```bash
# In your project directory:
mkdir -p credentials
mv ~/Downloads/your-project-*.json credentials/service-account-key.json
```

## Troubleshooting

### "Request is missing required authentication credential"

This means the script can't find a valid service account key. Check:

1. ✅ The key file is in `credentials/service-account-key.json`
2. ✅ The file is a SERVICE ACCOUNT key (not OAuth2)
3. ✅ The service account is registered with Earth Engine
4. ✅ The file has valid JSON format

### "Authentication failed"

This means the service account isn't registered with Earth Engine:

1. Go to https://signup.earthengine.google.com/#!/service_accounts
2. Register the `client_email` from your JSON key
3. Wait a few minutes and try again

### "Permission denied on assets"

The service account needs access to your assets:

1. Go to Earth Engine Code Editor: https://code.earthengine.google.com/
2. Navigate to your asset folder
3. Click the "Share" button
4. Add the service account email with appropriate permissions
5. Click "Add"

## Quick Test

Once you have the service account key:

```bash
# Make sure the key is in the right place
ls -la credentials/service-account-key.json

# Test authentication
npm start
```

You should see:
```
Authenticating with service account: your-service-account@project.iam.gserviceaccount.com
✓ Earth Engine initialized successfully
```

If you see this error instead:
```
Error: Request is missing required authentication credential
```

Then you're still using OAuth2 credentials - go back to Step 1 above!
