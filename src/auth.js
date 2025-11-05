/**
 * Authentication and Initialization for Earth Engine
 * This file handles EE authentication using service account credentials
 */

import ee from '@google/earthengine';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Earth Engine with service account credentials
 * @returns {Promise} Resolves when EE is initialized
 */
export function initializeEE() {
  return new Promise((resolve, reject) => {
    // Try to load service account key from environment or file
    let privateKey;
    
    if (process.env.EE_PRIVATE_KEY) {
      // Use private key from environment variable (for GitHub Actions)
      try {
        privateKey = JSON.parse(process.env.EE_PRIVATE_KEY);
      } catch (e) {
        reject(new Error('Failed to parse EE_PRIVATE_KEY environment variable: ' + e.message));
        return;
      }
    } else {
      // Try multiple possible locations for the service account key
      const possiblePaths = [
        path.join(__dirname, '..', 'credentials', 'service-account-key.json'),
        path.join(__dirname, '..', 'credentials', 'earth-engine-key.json'),
        path.join(__dirname, '..', 'service-account-key.json'),
        path.join(__dirname, '..', 'earth-engine-key.json'),
      ];
      
      let keyPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          keyPath = p;
          break;
        }
      }
      
      if (!keyPath) {
        reject(new Error(
          'No Earth Engine service account credentials found.\n\n' +
          'Please create a SERVICE ACCOUNT (not OAuth2) key:\n' +
          '1. Go to https://console.cloud.google.com/\n' +
          '2. Select your project\n' +
          '3. Go to IAM & Admin → Service Accounts\n' +
          '4. Create or select a service account\n' +
          '5. Click "Keys" → "Add Key" → "Create new key" → JSON\n' +
          '6. Save as: credentials/service-account-key.json\n' +
          '7. Register service account at: https://signup.earthengine.google.com/#!/service_accounts\n\n' +
          'Tried locations:\n' + possiblePaths.map(p => '  - ' + p).join('\n')
        ));
        return;
      }
      
      try {
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        privateKey = JSON.parse(keyContent);
        console.log(`Using service account key from: ${keyPath}`);
      } catch (e) {
        reject(new Error(`Failed to read service account key from ${keyPath}: ${e.message}`));
        return;
      }
    }

    // Validate that we have a service account key (not OAuth2)
    if (!privateKey.private_key || !privateKey.client_email) {
      reject(new Error(
        'Invalid service account key format.\n' +
        'Make sure you downloaded a SERVICE ACCOUNT key (not OAuth2 client credentials).\n' +
        'The key should have "private_key" and "client_email" fields.'
      ));
      return;
    }

    console.log(`Authenticating with service account: ${privateKey.client_email}`);

    // Initialize using service account
    ee.data.authenticateViaPrivateKey(
      privateKey,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            console.log('✓ Earth Engine initialized successfully');
            resolve();
          },
          (error) => {
            reject(new Error(`Earth Engine initialization failed: ${error}`));
          }
        );
      },
      (error) => {
        reject(new Error(`Authentication failed: ${error}\n\nMake sure the service account is registered at: https://signup.earthengine.google.com/#!/service_accounts`));
      }
    );
  });
}
