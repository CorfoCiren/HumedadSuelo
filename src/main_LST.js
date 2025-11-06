/**
 * Main LST Processing Script
 * Automatically exports LST rasters for missing years from base year to current year
 */

import ee from '@google/earthengine';

/**
 * Lists existing years in the assets folder (single API call)
 */
function getExistingYearsMap(assetPath) {
  try {
    // Normalize input to Cloud asset path (projects/ee-<user>/assets/<rest>)
    var cloudPath = assetPath;

    if (assetPath.indexOf('users/') === 0) {
      var parts = assetPath.split('/');
      if (parts.length >= 3) {
        var username = parts[1];
        var rest = parts.slice(2).join('/');
        cloudPath = 'projects/ee-' + username + '/assets/' + rest;
      }
    } else if (assetPath.indexOf('projects/earthengine-legacy/assets/users/') === 0) {
      // Convert legacy path to cloud path
      var m = assetPath.match(/^projects\/earthengine-legacy\/assets\/users\/([^/]+)\/(.+)$/);
      if (m) {
        cloudPath = 'projects/ee-' + m[1] + '/assets/' + m[2];
      }
    } else if (assetPath.indexOf('projects/ee-') === 0) {
      cloudPath = assetPath; // already cloud path
    }

    // Use cloudPath only — do not fall back to legacy paths
    var assetList = ee.data.listAssets(cloudPath);

    var years = [];
    var yearMap = {};

    if (assetList && assetList.assets && assetList.assets.length) {
      assetList.assets.forEach(function (asset) {
        var name = asset.name.split('/').pop();
        // Extract year from names like: LST_VIIRS_Day_Valparaiso_2015 or ..._2015_v1
        var m = name.match(/_(\d{4})(?:_v\d+)?$/);
        if (m) {
          var y = parseInt(m[1], 10);
          if (!isNaN(y)) {
            years.push(y);
            yearMap[y] = true;
          }
        }
      });
    }

    years.sort(function (a, b) { return a - b; });
    console.log('Existing years in assets (checked ' + cloudPath + '):', years.join(', '));
    return { years: years, yearMap: yearMap };
  } catch (e) {
    console.log('Error listing assets:', e);
    return { years: [], yearMap: {} };
  }
}

/**
 * Executes LST export for multiple years
 * This function is called AFTER Earth Engine is initialized
 */
async function runLSTExport() {
  // Dynamically import the module AFTER EE is initialized
  const { run: lstExport } = await import('./modules/5.Continous_LST_Day_Export_versioned_auto.js');
  
  // NO trailing slash (as in working script)
  const assetPath = 'users/corfobbppciren2023/Humedad_de_Suelo_Auxiliares';
  const BASE_YEAR = 2015;
  const currentYear = new Date().getFullYear();

  console.log('========================================');
  console.log('SEARCHING FOR MISSING YEARS');
  console.log('========================================');
  console.log('Folder:', assetPath);
  console.log('Base year:', BASE_YEAR);
  console.log('Current year:', currentYear);
  console.log('========================================\n');

  const info = getExistingYearsMap(assetPath);
  const yearMap = info.yearMap;

  // Detect missing past years
  const missingPastYears = [];
  for (let y = BASE_YEAR; y < currentYear; y++) {
    if (!yearMap[y]) {
      missingPastYears.push(y);
    }
  }

  console.log('Missing past years:', missingPastYears.length ? missingPastYears.join(', ') : '(none)');

  let exportCount = 0;

  // Export ONLY missing past years
  for (let i = 0; i < missingPastYears.length; i++) {
    const year = missingPastYears[i];
    console.log('→ Exporting missing year:', year);
    lstExport({ firstYear: year });
    exportCount++;
  }

  // ALWAYS export current year
  console.log('→ Exporting current year:', currentYear, '(forced update)');
  lstExport({ firstYear: currentYear });
  exportCount++;

  console.log('\n========================================');
  console.log('PROCESS COMPLETED');
  console.log('========================================');
  console.log('Exports started:', exportCount);
  console.log('→ Check the Tasks tab in Earth Engine');
  console.log('========================================');
}

// Export for use in other modules
export { runLSTExport };
