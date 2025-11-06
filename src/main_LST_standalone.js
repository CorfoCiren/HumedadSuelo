/**
 * Standalone LST Processing Script
 * Run only LST export without Soil Moisture
 */

import { initializeEE } from './auth.js';

async function main() {
  try {
    console.log('========================================');
    console.log('CORFO - LST PROCESSING ONLY');
    console.log('========================================\n');

    console.log('Initializing Earth Engine...');
    await initializeEE();

    console.log('\nStarting LST export process...\n');
    const { runLSTExport } = await import('./main_LST.js');
    await runLSTExport();

    console.log('\n✅ LST processing complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();