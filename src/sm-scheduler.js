/**
 * Soil Moisture Scheduler
 * Initiates GEE export tasks and saves task list to sm_tasks.json
 */

import { initializeEE } from './auth.js';
import fs from 'fs';

const runSoilMoistureScheduler = async () => {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('Initiating Soil Moisture GEE export tasks...');
  console.log('Start time:', new Date().toISOString());
  console.log('='.repeat(60));
  
  try {
    // Initialize Earth Engine
    await initializeEE();
    
    // Run the soil moisture export
    const { runSoilMoistureExport } = await import('./main_HS.js');
    const tasks = await runSoilMoistureExport();
    
    const elapsedMin = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log(`✓ GEE export tasks initiated successfully: ${tasks.length}`);
    console.log(`  Initiation script finished in: ${elapsedMin} minutes`);
    console.log('='.repeat(60));
    
    // Tasks already saved in main_HS.js
    console.log(`\n➡️ You can now run 'npm run sm:download' to process the results later.`);
    
  } catch (error) {
    console.error('\n' + '!'.repeat(60));
    console.error('Failed to initiate GEE export tasks:', error);
    console.error('!'.repeat(60));
    process.exit(1);
  }
};

// Run immediately
runSoilMoistureScheduler();