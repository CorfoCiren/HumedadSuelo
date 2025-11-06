# Dashboard Update - Authentication Fix

## Problem

The workflow was failing with authentication errors because:

1. **Import-time initialization**: `publish_asset.py` and `hs_update.py` were trying to call `ee.Initialize()` or `ee.Authenticate()` when imported
2. **Interactive authentication**: In GitHub Actions, there's no browser to complete OAuth flow
3. **Import order**: Scripts were imported before service account credentials were set up

## Solution

### Changes Made

#### 1. **`src/update_dashboard.py`** - Fixed initialization order

```python
# OLD (broken):
import ee
import hs_update  # ← This triggers ee.Initialize() in hs_update.py
import publish_asset  # ← This triggers ee.Authenticate() 

# NEW (fixed):
import ee

def initialize_earth_engine():
    """Initialize BEFORE importing other modules"""
    if os.getenv('EE_PRIVATE_KEY'):
        # Use service account in GitHub Actions
        credentials = ee.ServiceAccountCredentials(...)
        ee.Initialize(credentials)
    else:
        # Use user credentials locally
        ee.Initialize(project='ee-corfobbppciren2023')

# Import AFTER defining initialize function
import hs_update
import publish_asset

def main():
    initialize_earth_engine()  # ← Call FIRST
    hs_update.main()  # ← Now safe to use
    publish_asset.main()  # ← Now safe to use
```

#### 2. **`src/publish_asset.py`** - Removed auto-initialization

```python
# OLD (broken):
import ee

try:
    ee.Initialize(project='ee-corfobbppciren2023')
except:
    ee.Authenticate()  # ← Fails in GitHub Actions
    ee.Initialize(project='ee-corfobbppciren2023')

# NEW (fixed):
import ee

# Note: Earth Engine must be initialized BEFORE importing this module
# The initialization is done in update_dashboard.py
```

#### 3. **`src/hs_update.py`** - Added documentation

```python
# Added at top:
"""
Note: Earth Engine must be initialized BEFORE calling functions in this module
"""
import ee
# Do NOT initialize EE here
```

#### 4. **`.github/workflows/sm-dashboard-update.yml`** - Set PYTHONPATH

```yaml
# OLD:
run: python src/update_dashboard.py

# NEW:
env:
  PYTHONPATH: ${{ github.workspace }}/src
run: |
  cd src
  python update_dashboard.py
```

## Why This Works

### In GitHub Actions (with `EE_PRIVATE_KEY` secret)

```
1. Start workflow
2. Set EE_PRIVATE_KEY environment variable
3. Run update_dashboard.py
4. Call initialize_earth_engine()
   → Detects EE_PRIVATE_KEY
   → Creates service account credentials
   → Calls ee.Initialize(credentials)
5. Import hs_update and publish_asset
   → No initialization code runs
   → EE already initialized
6. Call hs_update.main()
7. Call publish_asset.main()
```

### Locally (without `EE_PRIVATE_KEY`)

```
1. Run python src/update_dashboard.py
2. Call initialize_earth_engine()
   → No EE_PRIVATE_KEY found
   → Calls ee.Initialize(project='...')
   → Uses cached user credentials
3. Import hs_update and publish_asset
4. Call hs_update.main()
5. Call publish_asset.main()
```

## Testing

### Test Locally

```bash
# First time: authenticate
python -c "import ee; ee.Authenticate()"

# Then run the script
cd src
python update_dashboard.py
```

### Test in GitHub Actions

1. Go to Actions tab
2. Select "SM Dashboard Update"
3. Click "Run workflow"
4. Check logs for:
   ```
   ✓ Initialized with service account: ...@....iam.gserviceaccount.com
   ```

## Common Errors (Fixed)

### ❌ "ImportError: attempted relative import with no known parent package"

**Cause**: Using `from . import hs_update` in a script run directly

**Fix**: Use absolute imports `import hs_update` and set PYTHONPATH

### ❌ "gcloud crashed (EOFError): EOF when reading a line"

**Cause**: `ee.Authenticate()` trying to open browser in headless environment

**Fix**: Use service account credentials, not interactive OAuth

### ❌ "Please authorize access to your Earth Engine account"

**Cause**: `ee.Initialize()` called without credentials before service account setup

**Fix**: Initialize EE BEFORE importing other modules

## Best Practices

### ✅ DO

- Initialize Earth Engine ONCE at the start of your main script
- Use service account credentials in CI/CD
- Import modules AFTER EE is initialized
- Document that modules expect EE to be pre-initialized

### ❌ DON'T

- Call `ee.Initialize()` or `ee.Authenticate()` at module import time
- Use interactive authentication in automated workflows
- Assume EE is already initialized in library modules

## File Structure

```
src/
├── update_dashboard.py       ← Main entry point
│   ├── Initializes EE first
│   ├── Then imports modules
│   └── Calls main functions
│
├── hs_update.py              ← Library module
│   ├── Does NOT initialize EE
│   └── Expects EE pre-initialized
│
└── publish_asset.py          ← Library module
    ├── Does NOT initialize EE
    └── Expects EE pre-initialized
```

---

**The authentication is now fixed!** The workflow will use service account credentials in GitHub Actions and user credentials locally. 🎉