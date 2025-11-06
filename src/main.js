/**
 * Main Entry Point for Soil Moisture Processing
 * Orchestrates the entire LST + Soil Moisture workflow
 */

import { initializeEE } from './auth.js';

async function main() {
  try {
    console.log('========================================');
    console.log('CORFO SOIL MOISTURE - FULL PIPELINE');
    console.log('========================================\n');

    // Initialize Earth Engine
    console.log('Initializing Earth Engine...');
    await initializeEE();

    // Import and run LST export AFTER initialization
    console.log('\n=== STEP 1: LST PROCESSING ===\n');
    const { runLSTExport } = await import('./main_LST.js');
    await runLSTExport();

    // Import and run Soil Moisture export
    console.log('\n=== STEP 2: SOIL MOISTURE PROCESSING ===\n');
    const { runSoilMoistureExport } = await import('./main_HS.js');
    await runSoilMoistureExport();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
