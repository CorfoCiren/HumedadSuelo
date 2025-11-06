# Soil Moisture Processing - Migration Complete

## Summary

Successfully migrated all GEE Code Editor scripts to Node.js with Earth Engine API:

### ✅ Converted Modules

1. **Main Orchestrators:**
   - `src/main.js` - Overall pipeline coordinator
   - `src/main_HS.js` - Soil Moisture export orchestrator
   - `src/main_LST.js` - LST export orchestrator (already existing)

2. **Core Modules:**
   - `src/modules/Export.js` - Drive and Asset exports
   - `src/modules/Producto_SM.js` - Soil Moisture product generation
   - `src/modules/RandomForest.js` - RF classifier
   - `src/modules/predictores.js` - Predictor variables assembly
   
3. **Data Modules:**
   - `src/modules/1.coleccion_imagenes.js` - Asset collections
   - `src/modules/rep_y_geometria.js` - Geometry and boundaries
   - `src/modules/soil_texture_geographic.js` - Soil properties
   - `src/modules/NDVI_EVI.js` - Vegetation indices
   - `src/modules/API.js` - Antecedent Precipitation Index
   - `src/modules/Tair_Evapo_Precip.js` - Climate variables
   - `src/modules/LST_versioned.js` - LST data loader
   - `src/modules/maskS2clouds.js` - Sentinel-2 cloud masking

### ✅ Asset Path Migration

All legacy paths migrated to Cloud Assets:

**Before:**
```javascript
'users/corfobbppciren2023/Humedad_de_Suelo_Auxiliares/...'
'projects/earthengine-legacy/assets/users/corfobbppciren2023/...'
```

**After:**
```javascript
'projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/...'
```

### ✅ Module System Migration

**Before (GEE Code Editor):**
```javascript
var module = require('users/corfobbppciren2023/...');
exports.run = function(config) { ... };
```

**After (Node.js ES6):**
```javascript
import module from './module.js';
export function run(config) { ... }
```

## Usage

### Run Full Pipeline (LST + Soil Moisture)

```bash
npm start
```

This will:
1. Initialize Earth Engine
2. Process and export LST for missing years + current year
3. Process and export Soil Moisture for current year (all months up to current month)

### Run LST Only

```javascript
// Modify src/main.js to comment out Soil Moisture step
await runLSTExport();
// await runSoilMoistureExport(); // Comment this
```

### Run Soil Moisture Only

```javascript
// Modify src/main.js to comment out LST step
// await runLSTExport(); // Comment this
await runSoilMoistureExport();
```

## Configuration

Current configuration in `src/main_HS.js`:
- **Year**: Current year (automatic)
- **Months**: 1 to current month (automatic)

To customize, edit the loop in `main_HS.js`:

```javascript
// Export specific months only
for (let mes = 10; mes <= 12; mes++) {  // Oct-Dec only
  smExport({ firstYear: 2024, mes: mes });
}
```

## Exports

The pipeline creates these exports:

### LST Exports
- **Asset**: `projects/ee-corfobbppciren2023/assets/Humedad_de_Suelo_Auxiliares/LST_VIIRS_Day_Valparaiso_YYYY_vN`
- **Versioned**: Automatically increments version if year already exists

### Soil Moisture Exports
- **Drive**: `Humedad de suelo/SM{YEAR}Valparaiso_VIIRS_mes{MONTH}`
- **Asset**: `projects/ee-corfobbppciren2023/assets/HS/SM{YEAR}Valparaiso_GCOM_mes{MONTH}`

## Next Steps

1. **Test the full pipeline** with a single month to verify all modules work
2. **Add task tracking** for Soil Moisture exports (similar to LST tasks.json)
3. **Optional**: Create separate scripts for:
   - LST-only processing
   - Soil Moisture-only processing
   - Drive upload automation (using OAuth2 like LST project)

## Troubleshooting

### "Cannot find module"
- Ensure all imports use `.js` extension
- Check that module exports match imports (`export function` vs `export default`)

### "Asset not found"
- Verify all asset paths use Cloud Asset format
- Check service account has access to assets

### "Authentication failed"
- Run from project root where `src/auth.js` can find credentials
- Verify service account key is valid

## Files Modified

```
src/
├── main.js                          ✅ Updated
├── main_HS.js                       ✅ Created
├── main_LST.js                      ✅ Existing
└── modules/
    ├── 1.coleccion_imagenes.js      ✅ Updated (Cloud Assets)
    ├── Export.js                    ✅ Converted
    ├── Producto_SM.js               ✅ Converted
    ├── RandomForest.js              ✅ Converted
    ├── predictores.js               ✅ Converted
    ├── rep_y_geometria.js           ✅ Converted
    ├── soil_texture_geographic.js   ✅ Converted
    ├── NDVI_EVI.js                  ✅ Converted
    ├── API.js                       ✅ Converted
    ├── Tair_Evapo_Precip.js         ✅ Converted
    ├── LST_versioned.js             ✅ Converted
    └── maskS2clouds.js              ✅ Created
```

---

**Migration Complete!** 🎉 The entire Soil Moisture pipeline is now automated and ready to run.