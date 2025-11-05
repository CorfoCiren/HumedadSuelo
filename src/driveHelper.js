/**
 * Google Drive Upload Module
 * Handles OAuth2 authentication and file uploads to Google Drive
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Google Drive API with OAuth2
 * @returns {Promise<drive_v3.Drive>} Authenticated Drive client
 */
export async function initializeDrive() {
  const refreshToken = process.env.DRIVE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      'DRIVE_REFRESH_TOKEN is not set in .env file.\n' +
      'Please run: npm run authorize'
    );
  }

  // Load OAuth2 credentials
  let credentials;
  
  if (process.env.OAUTH2_CREDENTIALS_JSON) {
    // GitHub Actions: from environment variable
    const parsed = JSON.parse(process.env.OAUTH2_CREDENTIALS_JSON);
    credentials = parsed.installed || parsed;
    console.log('Using OAuth2 credentials from environment variable');
  } else {
    // Local development: from file
    const credentialsPath = path.join(__dirname, '..', 'credentials', 'oauth2-credentials.json');
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(
        'oauth2-credentials.json not found.\n' +
        'Please place your OAuth2 client credentials in: credentials/oauth2-credentials.json'
      );
    }
    
    const content = fs.readFileSync(credentialsPath, 'utf8');
    const parsed = JSON.parse(content);
    credentials = parsed.installed || parsed;
    console.log('Using OAuth2 credentials from file');
  }

  const { client_id, client_secret, redirect_uris } = credentials;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Set refresh token
  oAuth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.drive({ version: 'v3', auth: oAuth2Client });
}

/**
 * Get or create a folder in Google Drive
 * @param {drive_v3.Drive} drive - Authenticated Drive client
 * @param {string} folderName - Name of the folder
 * @returns {Promise<string>} Folder ID
 */
export async function getOrCreateFolder(drive, folderName) {
  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files.length > 0) {
    console.log(`Found existing folder: ${folderName} (${response.data.files[0].id})`);
    return response.data.files[0].id;
  }

  // Create new folder
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

/**
 * Upload a file to Google Drive
 * @param {drive_v3.Drive} drive - Authenticated Drive client
 * @param {string} folderId - Target folder ID
 * @param {string} filePath - Path to file to upload
 * @param {string} fileName - Name for the file in Drive
 * @returns {Promise<object>} Upload result
 */
export async function uploadFile(drive, folderId, filePath, fileName) {
  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: 'image/tiff', // GeoTIFF for Earth Engine exports
    body: fs.createReadStream(filePath)
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
