/**
 * Main Soil Moisture Processing Script
 * Automatically exports Soil Moisture rasters for each month of the year
 */

import ee from '@google/earthengine';
import fs from 'fs';

/**
 * Executes Soil Moisture export for all months of a given year
 * This function is called AFTER Earth Engine is initialized
 */
async function runSoilMoistureExport() {
  // Dynamically import the module AFTER EE is initialized
  const { run: smExport } = await import('./modules/Export.js');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  console.log('========================================');
  console.log('SOIL MOISTURE EXPORT');
  console.log('========================================');
  console.log('Year:', currentYear);
  console.log('Processing months: 1 to', currentMonth);
  console.log('========================================\n');

  const tasks = [];

  // Export each month up to current month
  for (let mes = 1; mes <= currentMonth; mes++) {
    console.log(`→ Exporting month ${mes} of ${currentYear}`);
    const taskInfo = await smExport({ firstYear: currentYear, mes: mes });
    tasks.push(taskInfo);
  }

  // Save tasks to JSON file for later download/upload
  const tasksFilePath = 'sm_tasks.json';
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
  
  console.log('\n========================================');
  console.log('SOIL MOISTURE EXPORT COMPLETED');
  console.log('========================================');
  console.log('Exports started:', tasks.length);
  console.log(`📄 Task list saved to: ${tasksFilePath}`);
  console.log('→ Check the Tasks tab in Earth Engine');
  console.log('========================================');
  
  return tasks;
}

// Export for use in other modules
export { runSoilMoistureExport };