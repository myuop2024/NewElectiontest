# Google Classroom Integration Setup Instructions

## Current OAuth Error Fix

The OAuth error you're seeing is because the Google Cloud Console project needs to be configured with the correct redirect URI for your Replit environment.

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one if needed)
3. Enable the Google Classroom API if not already enabled

### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required information:
   - App name: "CAFFE Electoral Observer Training"
   - User support email: your email
   - App logo: (optional)
   - Authorized domains: Add `replit.dev`
   - Developer contact information: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/classroom.courses`
   - `https://www.googleapis.com/auth/classroom.coursework.students`
   - `https://www.googleapis.com/auth/classroom.rosters`
   - `https://www.googleapis.com/auth/classroom.profile.emails`
   - `https://www.googleapis.com/auth/classroom.profile.photos`

### Step 3: Update OAuth 2.0 Credentials (CRITICAL FIX)
1. Navigate to **APIs & Services** > **Credentials**
2. Find your existing OAuth 2.0 Client ID or create a new one
3. Click on the credential name to edit it
4. In the "Authorized redirect URIs" section, add this exact URI:
   ```
   https://0e9f65df-17ed-4901-95c1-5f41bdd17469-00-1mis3rm0rjk3k.spock.replit.dev/api/auth/google/callback
   ```
5. **IMPORTANT**: Remove any old/incorrect redirect URIs
6. Click **Save**

**Note**: If you don't have OAuth credentials yet:
1. Click **+ CREATE CREDENTIALS** > **OAuth 2.0 Client IDs**
2. Choose **Web application**
3. Set the name: "CAFFE Electoral Training Platform"
4. Add the redirect URI above
5. Copy the **Client ID** and **Client Secret** to your Replit Secrets

### Step 4: Update Environment Variables
The OAuth credentials are already set in your Replit environment:
- `GOOGLE_CLASSROOM_CLIENT_ID` 
- `GOOGLE_CLASSROOM_CLIENT_SECRET`

If you need to update them with new credentials, use the Replit Secrets tab.

### Step 5: Test the Integration
1. Go to the Training Hub in your CAFFE app
2. Click the "Google Classroom" tab
3. Click "Connect to Google Classroom"
4. You should now be redirected to Google's OAuth flow without errors

## Important Notes

- The redirect URI must match exactly (including https://)
- If you deploy to production, you'll need to add the production domain redirect URI
- The OAuth consent screen may show "unverified app" warning - this is normal for development
- Users will need to click "Advanced" > "Go to CAFFE Electoral Observer Training (unsafe)" during development

## Troubleshooting

If you still get OAuth errors:
1. Double-check the redirect URI in Google Cloud Console
2. Ensure the Google Classroom API is enabled
3. Verify the Client ID and Client Secret in Replit Secrets
4. Clear browser cache and try again

## Production Deployment

When deploying to production:
1. Add your production domain redirect URI to Google Cloud Console
2. Update the OAuth consent screen with production details
3. Consider applying for OAuth verification for production use