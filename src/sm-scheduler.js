/**
 * Soil Moisture Scheduler
 * Initiates GEE export tasks and saves task list to sm_tasks.json
 * Only processes complete months (excludes current month)
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
    
    // Calculate which months to process (exclude current month and previous month)
    // Only process up to (today - 2 months) to ensure complete data
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const lastCompleteMonth = currentMonth - 2; // Two months back
    
    console.log(`\nProcessing configuration:`);
    console.log(`  Current date: ${now.toISOString().split('T')[0]}`);
    console.log(`  Current year: ${currentYear}`);
    console.log(`  Current month: ${currentMonth}`);
    console.log(`  Last complete month to process: ${lastCompleteMonth}`);
    console.log(`  Months to process: 1 to ${lastCompleteMonth}`);
    console.log(`  Excluded: current month (${currentMonth}) and previous month (${currentMonth - 1})\n`);
    
    if (lastCompleteMonth < 1) {
      console.log('⚠️  No complete months to process yet (need at least 3rd month of the year).');
      console.log('   Exiting without starting any tasks.');
      return;
    }
    
    // Run the soil moisture export with the calculated limit
    const { runSoilMoistureExport } = await import('./main_HS.js');
    const tasks = await runSoilMoistureExport({ maxMonth: lastCompleteMonth });
    
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