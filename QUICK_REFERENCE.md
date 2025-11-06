# Quick Reference Guide

## Running the Pipeline

### Full Pipeline (LST + Soil Moisture)
```bash
npm start
```
Runs both LST and Soil Moisture processing in sequence.

### LST Only
```bash
npm run lst
```
Processes only LST data for missing years + current year.

### Soil Moisture Only
```bash
npm run sm
```
Processes only Soil Moisture for current year (requires LST to exist).

## What Gets Exported

### LST Exports
```
Asset: projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/
       LST_VIIRS_Day_Valparaiso_2025_v1
```

### Soil Moisture Exports
```
Drive:  Humedad de suelo/SM2025Valparaiso_VIIRS_mes1
Asset:  projects/ee-corfobbppciren2023/assets/HS/SM2025Valparaiso_GCOM_mes1
```

## Processing Details

### LST Processing
- **Input**: VIIRS LST + CFSv2 temperature forecasts
- **Method**: Temporal Fourier Analysis + blending
- **Output**: Daily continuous LST for entire year
- **Frequency**: Annually (checks for missing years)

### Soil Moisture Processing
- **Inputs**: 
  - LST (from previous step)
  - NDVI/EVI (Landsat/Sentinel-2)
  - Climate data (ERA5)
  - Soil properties
  - Antecedent Precipitation Index
- **Method**: Random Forest regression
- **Output**: Daily soil moisture for each month
- **Frequency**: Monthly (processes up to current month)

## Troubleshooting

### "Asset not found: LST_VIIRS_Day_Valparaiso_YYYY"
Run LST processing first:
```bash
npm run lst
```

### "Module not found"
Install dependencies:
```bash
npm install
```

### "Authentication failed"
Check service account key exists:
```bash
ls -la credentials/service-account-key.json
```

## Configuration

### Change Processing Year
Edit `src/main_HS.js`:
```javascript
const targetYear = 2024;  // Change this
const currentMonth = 12;   // Change this

for (let mes = 1; mes <= currentMonth; mes++) {
  smExport({ firstYear: targetYear, mes: mes });
}
```

### Process Specific Months Only
Edit `src/main_HS.js`:
```javascript
// Process only October, November, December
for (let mes of [10, 11, 12]) {
  smExport({ firstYear: 2025, mes: mes });
}
```

## GitHub Actions

The workflow runs automatically:
- **Schedule**: Daily at 2 AM UTC
- **Manual**: Actions tab → Run workflow

To modify schedule, edit `.github/workflows/lst-processing.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

## File Structure

```
src/
├── main.js                    # Full pipeline
├── main_LST_standalone.js     # LST only
├── main_HS_standalone.js      # SM only
├── main_LST.js                # LST logic
├── main_HS.js                 # SM logic
├── auth.js                    # EE authentication
└── modules/
    ├── Export.js              # Drive/Asset exports
    ├── Producto_SM.js         # SM product
    ├── RandomForest.js        # RF classifier
    ├── predictores.js         # Predictor assembly
    ├── NDVI_EVI.js            # Vegetation indices
    ├── API.js                 # Precipitation index
    ├── Tair_Evapo_Precip.js   # Climate vars
    ├── LST_versioned.js       # LST loader
    └── ... (other modules)
```

## Support

- **Setup Guide**: [SETUP.md](SETUP.md)
- **Migration Notes**: [SOIL_MOISTURE_MIGRATION.md](SOIL_MOISTURE_MIGRATION.md)
- **OAuth2 Setup**: [docs/OAUTH2_SETUP.md](docs/OAUTH2_SETUP.md)
- **Next Steps**: [NEXT_STEPS.md](NEXT_STEPS.md)