/**
 * FULLY AUTOMATIC SM Product Processor (Cloud Assets)
 * Automatically detects and processes ALL missing months up to last month
 */

import ee from '@google/earthengine';
import fs from 'fs';

// Cache for gap detection
let CACHED_GAPS = null;

function findAllMissingMonths() {
  if (CACHED_GAPS !== null) return CACHED_GAPS;

  const assetFolder = 'projects/ee-corfobbppciren2023/assets/HS/'; // Cloud Assets folder (trailing slash)
  const existingSet = {};
  let minYear = null;
  let maxYear = null;

  try {
    // Prefer plain string (Code Editor style). If environment requires object form, catch and retry.
    let listing;
    try {
      listing = ee.data.listAssets(assetFolder);
    } catch (e) {
      listing = ee.data.listAssets({ parent: assetFolder });
    }

    const assets = listing && listing.assets ? listing.assets : [];
    assets.forEach((asset) => {
      const fileName = asset.name.split('/').pop();
      const m = fileName.match(/SM(\d{4})Valparaiso_GCOM_mes(\d+)/);
      if (m) {
        const y = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10);
        existingSet[`${y}-${mo}`] = true;
        if (minYear === null || y < minYear) minYear = y;
        if (maxYear === null || y > maxYear) maxYear = y;
      }
    });
  } catch (e) {
    console.log('Warning: could not list assets in', assetFolder, '-', e && e.message ? e.message : e);
  }

  if (minYear === null) minYear = 2015; // default start

  // Process up to LAST MONTH
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1..12

  let targetMonth = currentMonth - 1;
  let targetYear = currentYear;
  if (targetMonth < 1) {
    targetMonth = 12;
    targetYear = currentYear - 1;
  }

  console.log(
    'Scanning period: ' +
      minYear +
      '-01 to ' +
      targetYear +
      '-' +
      (targetMonth < 10 ? '0' : '') +
      targetMonth
  );

  const missing = [];
  for (let y = minYear; y <= targetYear; y++) {
    const endMonth = y === targetYear ? targetMonth : 12;
    for (let m = 1; m <= endMonth; m++) {
      const key = `${y}-${m}`;
      if (!existingSet[key]) missing.push({ year: y, month: m });
    }
  }

  missing.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  CACHED_GAPS = missing;
  return CACHED_GAPS;
}

/**
 * Executes Soil Moisture export for all missing months up to last month
 * Call AFTER Earth Engine is initialized
 */
async function runSoilMoistureExport() {
  const { run: smExport } = await import('./modules/Export.js');

  const batchSize = 5; // submit in small batches

  console.log('========================================');
  console.log('SM AUTO-PROCESSOR');
  console.log('========================================');

  const missing = findAllMissingMonths();

  if (!missing.length) {
    console.log('\n✓ ALL MONTHS UP TO DATE!');
    console.log('No missing months found.');
    console.log('========================================');
    return [];
  }

  console.log('Missing months found:', missing.length);
  console.log('Batch size:', batchSize);
  const first = missing[0];
  const last = missing[missing.length - 1];
  console.log(
    'Range: ' +
      first.year +
      '-' +
      (first.month < 10 ? '0' : '') +
      first.month +
      ' to ' +
      last.year +
      '-' +
      (last.month < 10 ? '0' : '') +
      last.month
  );
  console.log('========================================\n');

  // Build batches
  const batches = [];
  for (let i = 0; i < missing.length; i += batchSize) {
    batches.push(missing.slice(i, Math.min(i + batchSize, missing.length)));
  }
  console.log('Total batches:', batches.length);
  console.log('========================================\n');

  const tasks = [];
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log('Batch', b + 1, '/', batches.length, ':');

    for (const item of batch) {
      const label = `${item.year}-${item.month < 10 ? '0' : ''}${item.month}`;
      try {
        const info = await smExport({ firstYear: item.year, mes: item.month });
        tasks.push(info);
        console.log('  ✓ Submitted:', label);
        successCount++;
      } catch (e) {
        console.log('  ✗ Error:', label);
        errorCount++;
        errors.push({ label, error: e && e.message ? e.message : e });
      }
    }

    console.log('');
  }

  console.log('========================================');
  console.log('BATCH SUBMISSION COMPLETE');
  console.log('========================================');
  console.log('✓ Success:', successCount + '/' + missing.length);
  if (errorCount > 0) {
    console.log('✗ Errors:', errorCount);
    console.log('\nFailed months:');
    errors.forEach((e) => console.log('  -', e.label + ':', e.error));
  }
  console.log('\n→ Check the Tasks tab');
  console.log('========================================');

  // Persist task list
  const tasksFilePath = 'sm_tasks.json';
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
  return tasks;
}

export { runSoilMoistureExport };