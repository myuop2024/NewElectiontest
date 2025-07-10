# Google Cloud Console Setup for Test Mode OAuth

## Step-by-Step Configuration Guide

### 1. Access Google Cloud Console

1. Open your browser and go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Select your project (or create a new one if needed)

### 2. Enable Google Classroom API

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for **"Google Classroom API"**
3. Click on it and press **"Enable"**
4. Wait for the API to be enabled

### 3. Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** user type (or Internal if you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: "CAFFE Electoral Observer Platform"
   - **User support email**: Your email address
   - **App logo**: Optional (can skip)
   - **App domain**: Leave blank for now
   - **Developer contact information**: Your email address
4. Click **"Save and Continue"**

### 4. Add OAuth Scopes

1. On the **"Scopes"** page, click **"Add or Remove Scopes"**
2. Search for and add these scopes:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/classroom.rosters.readonly`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
3. Click **"Update"** and then **"Save and Continue"**

### 5. Add Test Users (CRITICAL FOR TEST MODE)

1. On the **"Test users"** page, click **"Add Users"**
2. Enter your email address (the one you'll use to test)
3. Click **"Add"**
4. Click **"Save and Continue"**

**Important**: Only test users can use your OAuth app in test mode!

### 6. Configure OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
3. Choose **"Web application"** as the application type
4. Give it a name: "CAFFE Electoral Observer OAuth"

### 7. Add Authorized Redirect URIs

**This is the most critical step!** Add ALL these URLs exactly as shown:

```
http://localhost:5000/api/auth/google/callback
https://0e9f65df-17ed-4901-95c1-5f41bdd17469-00-1mis3rm0rjk3k.spock.replit.dev/api/auth/google/callback
https://caffejm.replit.app/api/auth/google/callback
```

**Steps:**
1. In the **"Authorized redirect URIs"** section, click **"Add URI"**
2. Paste the first URL: `http://localhost:5000/api/auth/google/callback`
3. Click **"Add URI"** again
4. Paste the second URL: `https://0e9f65df-17ed-4901-95c1-5f41bdd17469-00-1mis3rm0rjk3k.spock.replit.dev/api/auth/google/callback`
5. Click **"Add URI"** again
6. Paste the third URL: `https://caffejm.replit.app/api/auth/google/callback`
7. Click **"Create"**

### 8. Copy Your Credentials

1. After creating, you'll see a dialog with your credentials
2. Copy the **Client ID** and **Client Secret**
3. Keep these safe - you'll need them

### 9. Set Environment Variables

The system already has your credentials configured as:
- `GOOGLE_CLASSROOM_CLIENT_ID`
- `GOOGLE_CLASSROOM_CLIENT_SECRET`

### 10. Test the Setup

1. Go to your CAFFE platform
2. Login with: admin@caffe.org.jm / password
3. Navigate to **Training Center**
4. Click **"Connect to Google Classroom"**
5. You should be redirected to Google's OAuth page
6. Sign in with your test user account
7. Grant permissions to the app

### Troubleshooting

**Error: "redirect_uri_mismatch"**
- Double-check that all three redirect URIs are added exactly as shown
- Make sure there are no extra spaces or characters

**Error: "access_denied"**
- Ensure you're signed in with the email address you added as a test user
- Check that you've added yourself as a test user in step 5

**Error: "Service Unavailable"**
- Check that the Google Classroom API is enabled
- Verify your OAuth credentials are correct

### Important Notes

- Your app is in **test mode**, so only test users can access it
- To publish your app (remove test mode), you'll need to go through Google's verification process
- Test mode allows up to 100 test users
- The redirect URIs must match exactly - case sensitive and no trailing slashes

Once configured, your OAuth flow should work seamlessly across all environments (development, deployed, and local testing).