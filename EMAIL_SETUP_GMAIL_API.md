# Email Setup with Gmail API

Gmail API uses HTTPS and won't be blocked by Railway's firewall. This is a better solution than SMTP.

## Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (or select existing)
3. Name it: `IEEE Matchmaking`

## Step 2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and click **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen:
   - **User Type**: External
   - **App name**: IEEE Matchmaking Platform
   - **User support email**: ieeemetaverse@gmail.com
   - **Developer contact**: ieeemetaverse@gmail.com
   - Click **Save and Continue**
   - **Scopes**: Add `https://www.googleapis.com/auth/gmail.send`
   - Click **Save and Continue**
   - **Test users**: Add `ieeemetaverse@gmail.com`
   - Click **Save and Continue**
   - Click **Back to Dashboard**

4. Create OAuth Client ID:
   - **Application type**: Web application
   - **Name**: IEEE Matchmaking Email
   - **Authorized redirect URIs**: `http://localhost:3000` (for testing)
   - Click **Create**
   - **COPY** the Client ID and Client Secret

## Step 4: Generate Refresh Token

You need to generate a refresh token once. Run this script locally:

```bash
cd backend
node generate_gmail_refresh_token.js
```

Or use this online tool: https://developers.google.com/oauthplayground/

**Using OAuth Playground:**
1. Go to https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) → Check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In the left panel, find "Gmail API v1"
5. Select: `https://www.googleapis.com/auth/gmail.send`
6. Click **Authorize APIs**
7. Sign in with `ieeemetaverse@gmail.com`
8. Click **Allow**
9. Click **Exchange authorization code for tokens**
10. **COPY** the Refresh Token

## Step 5: Add Environment Variables to Railway

In Railway backend service → **Variables**, add:

```
EMAIL_SERVICE=gmail_api
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_USER_EMAIL=ieeemetaverse@gmail.com
MODERATION_EMAIL=ieeemetaverse@gmail.com
```

**Remove these (not needed with Gmail API):**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`

## Step 6: Test

After Railway redeploys, test sending a blocked message. Check logs for email success.

## Troubleshooting

**Error: "Invalid grant"**
- Refresh token may have expired
- Regenerate refresh token

**Error: "Access denied"**
- Make sure Gmail API is enabled
- Check OAuth consent screen is configured
- Verify scopes include `gmail.send`

**Error: "User not found"**
- Verify `GMAIL_USER_EMAIL` matches the email used to generate refresh token

