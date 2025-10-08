# Google Photos API Setup Guide

## Step 1: Google Cloud Console Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select existing one
3. **Enable Google Photos Library API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Photos Library API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. **Go to "APIs & Services" → "Credentials"**
2. **Click "Create Credentials" → "OAuth 2.0 Client IDs"**
3. **Configure OAuth consent screen** (if not done):
   - User Type: External
   - App name: "Life Stacks"
   - User support email: your email
   - Developer contact: your email
   - Add scopes: `https://www.googleapis.com/auth/photoslibrary.readonly`
4. **Create OAuth 2.0 Client ID:**
   - Application type: Web application
   - Name: "Life Stacks - Google Photos"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/relationship-manager/google-photos/callback` (for development)
     - `https://lifestacks.ai/api/relationship-manager/google-photos/callback` (for production)

## Step 3: Environment Variables

### Development (.env.local):

```bash
# Google Photos API Configuration
GOOGLE_PHOTOS_CLIENT_ID=your_google_client_id_here
GOOGLE_PHOTOS_CLIENT_SECRET=your_google_client_secret_here

# App URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (Vercel Environment Variables):

```bash
# Google Photos API Configuration
GOOGLE_PHOTOS_CLIENT_ID=your_google_client_id_here
GOOGLE_PHOTOS_CLIENT_SECRET=your_google_client_secret_here

# App URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=https://lifestacks.ai
```

## Step 4: Database Setup

Run the SQL migration to create the user integrations table:

```sql
-- Run this in your Supabase SQL editor
-- File: create-user-integrations-table.sql
```

## Step 5: Test the Integration

1. Restart your development server: `npm run dev`
2. Go to `http://localhost:3000/modules/relationship-manager`
3. Click "Connect Google Photos"
4. Complete the OAuth flow
5. Click "Sync Photos" to import your photos

## Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Make sure the redirect URI in Google Cloud Console exactly matches: `http://localhost:3000/api/relationship-manager/google-photos/callback`

2. **"Access blocked"**
   - Your app might be in testing mode. Add your email to the test users list in OAuth consent screen

3. **"Scope not authorized"**
   - Make sure you've added `https://www.googleapis.com/auth/photoslibrary.readonly` to your OAuth consent screen

4. **Environment variables not loading**
   - Restart your development server after adding environment variables
   - Make sure `.env.local` is in your project root directory

## Production Deployment (lifestacks.ai)

### 1. Google Cloud Console Updates:

- **OAuth consent screen**: Publish the app (move from testing to production)
- **Authorized redirect URIs**: Already configured for both localhost and lifestacks.ai

### 2. Vercel Environment Variables:

Add these in your Vercel dashboard under Project Settings → Environment Variables:

```bash
GOOGLE_PHOTOS_CLIENT_ID=your_google_client_id_here
GOOGLE_PHOTOS_CLIENT_SECRET=your_google_client_secret_here
NEXT_PUBLIC_APP_URL=https://lifestacks.ai
```

### 3. OAuth Consent Screen Publishing:

- Go to Google Cloud Console → APIs & Services → OAuth consent screen
- Click "PUBLISH APP" to move from testing to production
- This allows any user to connect their Google Photos (not just test users)

### 4. Domain Verification (if required):

- Google may require domain verification for production apps
- Add `lifestacks.ai` to authorized domains in OAuth consent screen
