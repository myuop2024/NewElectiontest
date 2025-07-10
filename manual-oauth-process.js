// Manual OAuth processing script
import { OAuth2Client } from 'google-auth-library';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { googleClassroomTokens } from './shared/schema.js';

async function processOAuthCode() {
  try {
    // Initialize OAuth client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLASSROOM_CLIENT_ID,
      process.env.GOOGLE_CLASSROOM_CLIENT_SECRET,
      'https://caffejm.replit.app/api/auth/google/callback'
    );

    // The authorization code from your callback URL
    const code = '4/0AVMBsJij4dfvlDh9zXuC4Xl6PQ2v2NZOM7KYGU1zJXyxP6Q35GCziK_VNNROsRH_2fu9iQ';
    const userId = 13; // Your admin user ID

    console.log('Processing OAuth code...');
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received:', Object.keys(tokens));

    // Set up database connection
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    });
    const db = drizzle({ client: pool });

    // Store tokens in database
    await db.insert(googleClassroomTokens).values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenType: tokens.token_type || "Bearer",
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope
    }).onConflictDoUpdate({
      target: googleClassroomTokens.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        updatedAt: new Date()
      }
    });

    console.log('✅ Google Classroom tokens stored successfully!');
    console.log('User ID:', userId);
    console.log('Access token stored (length):', tokens.access_token?.length);
    console.log('Refresh token available:', !!tokens.refresh_token);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error processing OAuth:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

processOAuthCode();