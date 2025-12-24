# Google OAuth Setup Guide

This guide explains how to configure Google Sign-In for the Denotes application.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name (e.g., "Denotes App")
4. Click **Create**

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace account)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Denotes
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the **Scopes** page, click **Add or Remove Scopes**
   - Select `.../auth/userinfo.email`
   - Select `.../auth/userinfo.profile`
   - Select `openid`
7. Click **Save and Continue**
8. Add test users if needed (for testing before publishing)
9. Click **Save and Continue**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Enter a name (e.g., "Denotes Web Client")
5. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - `https://your-production-domain.com` (for production)
6. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://your-production-domain.com/api/auth/callback/google` (for production)
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Required for OAuth callbacks
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**Note**: For production, update `NEXTAUTH_URL` to your production domain.

## Step 5: Test Google Sign-In

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to the login page
3. Click **Sign in with Google**
4. Select your Google account
5. You should be redirected to the app and logged in

## How It Works

- **New Users**: When a user signs in with Google for the first time, a new account is automatically created with their Google email and name.
- **Existing Users**: If a user already has an account with the same email (created via email/password), their account is linked to Google.
- **Profile**: Users who sign in with Google will see "Google Account" as their sign-in method in the profile page.
- **Password**: Google OAuth users don't have a password, so the "Change Password" option is hidden for them.

## Troubleshooting

### "Error: redirect_uri_mismatch"
- Ensure the redirect URI in Google Cloud Console matches exactly:
  - Development: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://your-domain.com/api/auth/callback/google`

### "Error: Access blocked: App is not verified"
- For testing, add your email as a test user in the OAuth consent screen
- For production, submit your app for Google verification

### Google Sign-In Button Not Working
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly
- Verify that you're using the correct credentials (not API keys)
- Check the browser console for errors

## Production Checklist

1. ✅ Add production domain to authorized origins
2. ✅ Add production callback URL to redirect URIs
3. ✅ Update `NEXTAUTH_URL` environment variable
4. ✅ Submit app for Google verification (optional but recommended)
5. ✅ Test the complete sign-in flow

