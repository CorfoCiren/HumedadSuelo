/**
 * OAuth2 Refresh Token Keep-Alive Script
 * Prevents refresh token from expiring due to inactivity
 * Run this every 3 months via GitHub Actions
 */

import { google } from 'googleapis';

async function keepAlive() {
  try {
    if (!process.env.OAUTH2_CREDENTIALS_JSON || !process.env.DRIVE_REFRESH_TOKEN) {
      console.error('Missing OAUTH2_CREDENTIALS_JSON or DRIVE_REFRESH_TOKEN environment variables');
      process.exit(2);
    }

    const parsed = JSON.parse(process.env.OAUTH2_CREDENTIALS_JSON);
    const credentials = parsed.installed || parsed;

    const { client_id, client_secret, redirect_uris } = credentials;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris ? redirect_uris[0] : 'urn:ietf:wg:oauth:2.0:oob'
    );

    oAuth2Client.setCredentials({ refresh_token: process.env.DRIVE_REFRESH_TOKEN });

    console.log('Requesting access token using refresh token...');
    const res = await oAuth2Client.getAccessToken();

    if (!res || !res.token) {
      console.error('Failed to obtain access token. Response:', res);
      process.exit(1);
    }

    console.log('✓ Access token obtained successfully (refresh token is alive).');
    console.log('Next keep-alive should run in 3 months.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Keep-alive failed:', err.message || err);
    process.exit(1);
  }
}

keepAlive();