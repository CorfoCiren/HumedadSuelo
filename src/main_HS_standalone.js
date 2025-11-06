/**
 * Standalone Soil Moisture Processing Script
 * Run only Soil Moisture export (requires LST to be already processed)
 */

import { initializeEE } from './auth.js';

async function main() {
  try {
    console.log('========================================');
    console.log('CORFO - SOIL MOISTURE PROCESSING ONLY');
    console.log('========================================\n');

    console.log('Initializing Earth Engine...');
    await initializeEE();

    console.log('\nStarting Soil Moisture export process...\n');
    const { runSoilMoistureExport } = await import('./main_HS.js');
    await runSoilMoistureExport();

    console.log('\n✅ Soil Moisture processing complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();