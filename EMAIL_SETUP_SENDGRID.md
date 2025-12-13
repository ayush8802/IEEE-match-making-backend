# Email Setup with SendGrid

Railway blocks outbound SMTP connections, so we'll use SendGrid (transactional email service) instead.

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

## Step 2: Create API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `IEEE Matchmaking`
4. Select **Full Access** (or **Mail Send** permissions)
5. Click **Create & View**
6. **COPY THE API KEY** (you can only see it once!)

## Step 3: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Email**: `ieeemetaverse@gmail.com`
   - **From Name**: `IEEE Matchmaking Platform`
   - Fill in other required fields
4. Click **Create**
5. Check your email and click the verification link

## Step 4: Add Environment Variables to Railway

In Railway backend service → **Variables**, add:

```
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
MODERATION_EMAIL=ieeemetaverse@gmail.com
```

**Remove or keep these (won't be used with SendGrid):**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`

## Step 5: Test

After Railway redeploys, test sending a blocked message. Check logs for email success/failure.

## Alternative: Mailgun

If you prefer Mailgun:

1. Sign up at https://mailgun.com (free tier: 5,000 emails/month)
2. Verify your domain (or use sandbox domain for testing)
3. Get your API key from Settings → API Keys
4. Add to Railway:
   ```
   EMAIL_SERVICE=mailgun
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=your_domain.mailgun.org
   MODERATION_EMAIL=ieeemetaverse@gmail.com
   ```

