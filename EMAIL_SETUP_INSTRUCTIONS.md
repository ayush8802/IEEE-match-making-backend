# Email Setup Instructions for Moderation Alerts

## Issue
Emails are not being sent because SMTP (Simple Mail Transfer Protocol) is not configured in your `.env` file.

## Current Status
✅ Moderation system is working (messages are blocked correctly)  
❌ Email notifications are NOT being sent (SMTP not configured)  
📝 Email content is being logged in backend console instead

## Solution: Configure SMTP for Gmail

### Step 1: Check Backend Logs (Current Behavior)

When a message is blocked, you should see a log entry in your backend console like:

```
📧 Moderation Alert Email (not sent - dev mode): {
  to: 'ieeemetaverse@gmail.com',
  senderName: '...',
  senderEmail: '...',
  receiverName: '...',
  receiverEmail: '...',
  blockedReason: '...',
  messagePreview: '...'
}
```

This means the system is working, but emails need SMTP to be sent.

---

### Step 2: Configure Gmail SMTP

#### Option A: Using Gmail App Password (Recommended)

1. **Enable 2-Factor Authentication on your Gmail account**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate an App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it: "IEEE Matchmaking Platform"
   - Click "Generate"
   - **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

3. **Add to your `.env` file:**

```env
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=abcdefghijklmnop  # Use the App Password from step 2 (remove spaces)
```

**Important:** 
- Use the App Password, NOT your regular Gmail password
- Remove spaces from the App Password (16 characters total)

---

#### Option B: Using Other Email Services

**For Outlook/Office365:**
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

**For SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

---

### Step 3: Restart Backend Server

After adding SMTP configuration, restart your backend server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

---

### Step 4: Test Email Sending

1. Send a blocked message (e.g., "I need your phone number")
2. Check backend console - should see:
   ```
   ✅ Moderation alert email sent successfully
   ```
3. Check `ieeemetaverse@gmail.com` inbox (and spam folder)

---

### Step 5: Verify Configuration

Run the check script:
```bash
cd backend
node check_email_setup.js
```

Should show:
```
✅ SMTP appears to be configured!
```

---

## Troubleshooting

### Emails still not arriving?

1. **Check Spam/Junk folder** - Gmail might filter automated emails
2. **Check backend logs** for SMTP errors:
   ```
   Error sending moderation alert email: ...
   ```
3. **Verify App Password** - Make sure you're using the 16-character App Password
4. **Check firewall** - Ensure port 587 is not blocked
5. **Try different SMTP service** - Some ISPs block SMTP ports

### Common Errors

**Error: "Invalid login"**
- Double-check your SMTP_USER email address
- Make sure you're using App Password (not regular password)
- Verify 2FA is enabled

**Error: "Connection timeout"**
- Check if port 587 is blocked by firewall
- Try port 465 with `SMTP_SECURE=true`

**Error: "Authentication failed"**
- Regenerate App Password
- Make sure there are no spaces in the password in .env file

---

## Alternative: Check Logs Instead of Emails

If you prefer not to configure SMTP right now, you can:

1. **Check backend console logs** when messages are blocked
2. **Query moderation_logs table** in Supabase:
   ```sql
   SELECT 
       timestamp,
       sender_id,
       message_content,
       blocked_reason,
       email_sent
   FROM public.moderation_logs
   WHERE moderation_result = 'blocked'
   ORDER BY timestamp DESC;
   ```

The `email_sent` column will be `false` until SMTP is configured.

---

## Quick Setup Checklist

- [ ] SMTP_HOST added to .env
- [ ] SMTP_PORT added to .env
- [ ] SMTP_USER added to .env
- [ ] SMTP_PASS added to .env (App Password for Gmail)
- [ ] Backend server restarted
- [ ] Test message sent
- [ ] Email received (check spam folder)

---

**Note:** Email notifications are important for moderation, but the system works fine without them. All blocked messages are logged in the database for review.


