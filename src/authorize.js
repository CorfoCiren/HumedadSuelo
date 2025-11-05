/**
 * OAuth2 Authorization Script for Google Drive Access
 * Run this ONCE locally to generate your DRIVE_REFRESH_TOKEN
 * 
 * Steps:
 * 1. Place your oauth2-credentials.json in the credentials/ folder
 * 2. Run: npm run authorize
 * 3. Follow the browser prompts to authorize
 * 4. Copy the refresh token to your .env file as DRIVE_REFRESH_TOKEN
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, '..', '.env');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credentials', 'oauth2-credentials.json');

async function authorize() {
  // Load OAuth2 credentials
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('\n❌ Error: oauth2-credentials.json not found!');
    console.error('\nPlease:');
    console.error('1. Go to https://console.cloud.google.com/apis/credentials');
    console.error('2. Create OAuth 2.0 Client ID (Desktop app)');
    console.error('3. Download the JSON file');
    console.error('4. Save it as: credentials/oauth2-credentials.json\n');
    process.exit(1);
  }

  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const credentials = JSON.parse(content);
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Generate auth URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force to get refresh token
  });

  console.log('\n========================================');
  console.log('GOOGLE DRIVE OAUTH2 AUTHORIZATION');
  console.log('========================================\n');
  console.log('Opening browser for authorization...\n');
  console.log('If browser doesn\'t open, visit this URL:');
  console.log(authUrl);
  console.log('\n');

  // Open browser
  await open(authUrl);

  // Wait for authorization code
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the authorization code from the browser: ', async (code) => {
      rl.close();

      try {
        const { tokens } = await oAuth2Client.getToken(code);
        
        if (!tokens.refresh_token) {
          console.error('\n❌ No refresh token received!');
          console.error('This might happen if you\'ve authorized this app before.');
          console.error('Try revoking access at: https://myaccount.google.com/permissions');
          console.error('Then run this script again.\n');
          process.exit(1);
        }

        console.log('\n✓ Authorization successful!\n');
        console.log('========================================');
        console.log('REFRESH TOKEN (save this in .env):');
        console.log('========================================');
        console.log(tokens.refresh_token);
        console.log('========================================\n');

        // Update or create .env file
        let envContent = '';
        if (fs.existsSync(TOKEN_PATH)) {
          envContent = fs.readFileSync(TOKEN_PATH, 'utf8');
        }

        // Update or add DRIVE_REFRESH_TOKEN
        if (envContent.includes('DRIVE_REFRESH_TOKEN=')) {
          envContent = envContent.replace(
            /DRIVE_REFRESH_TOKEN=.*/,
            `DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`
          );
        } else {
          envContent += `\nDRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
        }

        fs.writeFileSync(TOKEN_PATH, envContent);
        console.log('✓ Updated .env file with refresh token\n');
        console.log('You can now run: npm start\n');

        resolve();
      } catch (error) {
        console.error('\n❌ Error retrieving access token:', error.message);
        reject(error);
      }
    });
  });
}

authorize().catch(console.error);
