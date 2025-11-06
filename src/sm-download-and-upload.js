/**
 * Soil Moisture Download and Upload Script
 * Downloads completed SM assets from Earth Engine and uploads to Google Drive
 */

import dotenv from 'dotenv';
import ee from '@google/earthengine';
import { google } from 'googleapis';
import { initializeEE } from './auth.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Drive API
async function initializeDrive() {
  const refreshToken = process.env.DRIVE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error('DRIVE_REFRESH_TOKEN is not set in the .env file. Please run: npm run authorize');
  }
  
  console.log('Refresh token (first 10 chars):', refreshToken.substring(0, 10) + '...');
  console.log('Refresh token length:', refreshToken.length);

  let credentials;
  
  if (process.env.OAUTH2_CREDENTIALS_JSON) {
    const parsed = JSON.parse(process.env.OAUTH2_CREDENTIALS_JSON);
    credentials = parsed.installed || parsed;
    console.log('Using OAuth2 credentials from environment variable');
    console.log('Client ID (first 20 chars):', credentials.client_id ? credentials.client_id.substring(0, 20) + '...' : 'MISSING');
  } else {
    const credentialsPath = path.join(__dirname, '..', 'credentials', 'oauth2-credentials.json');
    if (fs.existsSync(credentialsPath)) {
      const content = fs.readFileSync(credentialsPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed.removed) {
        throw new Error(
          'oauth2-credentials.json is a placeholder.\n\n' +
          'Please copy the real file from your other project:\n' +
          '  cp ../CORFO_Bienes_Publicos_23_Valparaiso/oauth2-credentials.json credentials/'
        );
      }
      credentials = parsed.installed || parsed;
      console.log('Using OAuth2 credentials from file');
    } else {
      throw new Error(
        'oauth2-credentials.json not found.\n\n' +
        'Please copy it from your other project:\n' +
        '  cp ../CORFO_Bienes_Publicos_23_Valparaiso/oauth2-credentials.json credentials/'
      );
    }
  }

  const { client_id, client_secret, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, 
    client_secret, 
    redirect_uris ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
  );
  
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    // Test the refresh token by requesting an access token
    console.log('Validating OAuth2 refresh token...');
    await oAuth2Client.getAccessToken();
    console.log('✓ OAuth2 refresh token is valid');
  } catch (error) {
    if (error.message && error.message.includes('invalid_grant')) {
      throw new Error(
        '\n❌ OAuth2 refresh token is invalid or expired!\n\n' +
        'This usually means:\n' +
        '  1. The token was revoked at https://myaccount.google.com/permissions\n' +
        '  2. The token hasn\'t been used in 6+ months and expired\n' +
        '  3. The token was generated with different OAuth2 credentials\n\n' +
        'To fix this:\n' +
        '  1. Run locally: npm run authorize\n' +
        '  2. Copy the new refresh token from .env file\n' +
        '  3. Update GitHub Secret: DRIVE_REFRESH_TOKEN\n' +
        '  4. Re-run this workflow\n\n' +
        'Original error: ' + error.message
      );
    }
    throw error;
  }

  return google.drive({ version: 'v3', auth: oAuth2Client });
}

// Get or create Drive folder
async function getOrCreateFolder(drive, folderName) {
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files.length > 0) {
    console.log(`Found existing folder: ${folderName} (${response.data.files[0].id})`);
    return response.data.files[0].id;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id',
  });

  console.log(`Created folder: ${folderName} (${folder.data.id})`);
  return folder.data.id;
}

// Upload GeoTIFF to Drive
async function uploadTiffToDrive(drive, folderId, tiffPath, fileName) {
  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: 'image/tiff',
    body: fs.createReadStream(tiffPath)
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log(`  ✓ Uploaded: ${file.data.name} (${file.data.id})`);
    return file.data;
  } catch (error) {
    console.error(`  ✗ Upload failed for ${fileName}:`, error.message);
    throw error;
  }
}

// Download asset as GeoTIFF
async function downloadAsset(assetId, outputPath) {
  console.log(`Downloading asset: ${assetId}`);
  
  try {
    const image = ee.Image(assetId);
    const url = image.getDownloadURL({
      format: 'GEO_TIFF',
      scale: 1000,
      crs: 'EPSG:4326'
    });

    if (!url || typeof url !== 'string') {
      throw new Error('Failed to obtain download URL');
    }

    console.log(`  Download URL obtained`);

    const response = await axios({ method: 'get', url, responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
    console.log(`  ✓ Downloaded to: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`  ✗ Download failed for ${assetId}:`, error.message);
    return false;
  }
}

// Main function to process completed assets
async function processCompletedAssets(taskList) {
  await initializeEE();
  const drive = await initializeDrive();
  const folderId = await getOrCreateFolder(drive, 'Humedad de suelo');
  
  const tempDir = path.join(__dirname, '..', 'temp_sm_tiffs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Determine current date and last complete month; filter tasks accordingly
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Keep only tasks up to (today - 2 months): exclude current month and previous month
  const lastCompleteMonth = currentMonth - 2; // e.g., if now is Mar (3) -> process up to Jan (1)

  console.log('\nProcessing configuration:');
  console.log(`  Current date: ${now.toISOString().split('T')[0]}`);
  console.log(`  Current year: ${currentYear}`);
  console.log(`  Current month: ${currentMonth}`);
  console.log(`  Last complete month to process: ${lastCompleteMonth}`);

  if (lastCompleteMonth < 1) {
    console.log('\n⚠️  No complete months to process yet (need at least 3rd month of the year).');
    console.log('   Exiting without downloading any assets.');
    return;
  }

  // Keep tasks from previous years and tasks in current year up to lastCompleteMonth
  const filteredTasks = taskList.filter(function(task) {
    // If task has invalid year/month, include it by default
    if (typeof task.year !== 'number' || typeof task.month !== 'number') return true;
    if (task.year < currentYear) return true; // past years -> process
    if (task.year > currentYear) return false; // future years -> skip
    // task.year === currentYear -> only process months <= lastCompleteMonth
    return task.month <= lastCompleteMonth;
  });

  console.log('\nStarting download and upload process...');
  console.log(`Found ${taskList.length} tasks in task file; ${filteredTasks.length} will be processed (skipped ${taskList.length - filteredTasks.length}).`);

  let successCount = 0;
  let errorCount = 0;

  for (const task of filteredTasks) {
    try {
      console.log(`\n------------------------------------------------------------`);
      console.log(`Processing Year: ${task.year}, Month: ${task.month}`);

      const filePrefix = `SM${task.year}Valparaiso_VIIRS_mes${task.month}`;
      const fullAssetId = task.assetPath;
      const outputPath = path.join(tempDir, `${filePrefix}.tif`);

      const downloaded = await downloadAsset(fullAssetId, outputPath);
      
      if (downloaded) {
        await uploadTiffToDrive(drive, folderId, outputPath, `${filePrefix}.tif`);
        successCount++;
        
        // Clean up downloaded file
        fs.unlinkSync(outputPath);
      } else {
        console.error(`❌ Skipping upload for ${task.year}-${task.month} due to download failure`);
        errorCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${task.year}-${task.month}:`, error.message);
      errorCount++;
      continue;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`All tasks processed!`);
  console.log(`  Successfully uploaded: ${successCount}`);
  console.log(`  Failed or skipped: ${errorCount}`);
  console.log(`  Total: ${taskList.length}`);
  console.log('='.repeat(60));
  
  // Clean up temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('='.repeat(60));
  console.log('Starting SM Asset Download and Drive Upload Process...');
  console.log('='.repeat(60));

  const tasksFile = process.argv[2] || 'sm_tasks.json';
  
  if (fs.existsSync(tasksFile)) {
    console.log(`\nLoading tasks from: ${tasksFile}`);
    const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    
    if (tasks && tasks.length > 0) {
      processCompletedAssets(tasks);
    } else {
      console.log('Task file is empty. Nothing to process.');
    }
  } else {
    console.error(`\nError: Task file not found at '${tasksFile}'`);
    console.error('Please run the export script first to generate the task list.');
    process.exit(1);
  }
}