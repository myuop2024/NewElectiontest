# Google Classroom OAuth Setup Guide

## Issue: Service Unavailable / Test Mode Setup

Since your Google app is in test mode, you need to configure the authorized redirect URIs properly in Google Cloud Console.

## Required Steps:

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your OAuth 2.0 Client ID
4. In "Authorized redirect URIs", add ALL these URLs:

```
http://localhost:5000/api/auth/google/callback
https://0e9f65df-17ed-4901-95c1-5f41bdd17469-00-1mis3rm0rjk3k.spock.replit.dev/api/auth/google/callback
https://caffejm.replit.app/api/auth/google/callback
```

### 2. Test Users (Required for Test Mode)

1. In Google Cloud Console, go to "APIs & Services" → "OAuth consent screen"
2. Scroll down to "Test users"
3. Add your email address as a test user
4. Only test users can use the OAuth flow when the app is in test mode

### 3. Current Environment Details

- Development domain: `0e9f65df-17ed-4901-95c1-5f41bdd17469-00-1mis3rm0rjk3k.spock.replit.dev`
- Deployed domain: `caffejm.replit.app`
- Local testing: `localhost:5000`

## Debugging Information

The system now includes enhanced debug logging. When you attempt OAuth, check the server logs for:
- Host headers
- Protocol detection
- Redirect URI generation
- OAuth callback processing

## Test the Connection

1. Login with: admin@caffe.org.jm / password
2. Navigate to Training Center
3. Click "Connect to Google Classroom"
4. Check server logs for debug information
5. Authorize with your test user account

## Common Issues

- **redirect_uri_mismatch**: Add the correct redirect URI to Google Cloud Console
- **access_denied**: Ensure you're using a test user account
- **Service Unavailable**: Check domain routing and authorized redirect URIs