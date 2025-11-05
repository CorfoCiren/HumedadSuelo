/**
 * Main Entry Point for Soil Moisture Processing
 * Orchestrates the entire LST processing workflow
 */

import { initializeEE } from './auth.js';

async function main() {
  try {
    console.log('========================================');
    console.log('CORFO SOIL MOISTURE - LST PROCESSING');
    console.log('========================================\n');

    // Initialize Earth Engine
    console.log('Initializing Earth Engine...');
    await initializeEE();

    // Import and run LST export AFTER initialization
    console.log('\nStarting LST export process...\n');
    const { runLSTExport } = await import('./main_LST.js');
    await runLSTExport();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
