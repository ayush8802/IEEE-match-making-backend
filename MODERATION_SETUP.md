# Message Moderation System Setup Guide

This document explains how to set up and configure the message moderation system for the IEEE Matchmaking Platform.

## Overview

The moderation system provides two layers of protection:
1. **Rule-based filtering**: Fast keyword/phrase blacklist checks
2. **AI-based moderation** (optional): Advanced content analysis using OpenAI API

## Database Setup

1. Run the SQL script to create moderation tables:
```bash
# In Supabase SQL Editor, run:
backend/create_moderation_system.sql
```

This creates:
- `moderation_blacklist` table: Configurable list of blocked words/phrases
- `moderation_logs` table: Audit trail of all moderation decisions

## Environment Variables

Add these to your `.env` file:

### Required
```env
# Email for moderation alerts
MODERATION_EMAIL=ieeemetaverse@gmail.com
```

### Optional (for AI moderation)
```env
# OpenAI API Key (optional - enables AI-based moderation)
OPENAI_API_KEY=sk-...

# OpenAI Model (optional - defaults to gpt-3.5-turbo)
OPENAI_MODEL=gpt-3.5-turbo

# Enable AI moderation (set to "true" to enable)
ENABLE_AI_MODERATION=false
```

### Email Configuration (Required for moderation alerts)
```env
# SMTP settings for sending moderation alert emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Configuration

### Managing the Blacklist

Admins can add/remove blocked words and phrases via the `moderation_blacklist` table:

```sql
-- Add a new blocked phrase
INSERT INTO public.moderation_blacklist (word_or_phrase, category, is_active)
VALUES ('example phrase', 'explicit', true);

-- Deactivate a blocked phrase (don't delete, just deactivate)
UPDATE public.moderation_blacklist
SET is_active = false
WHERE word_or_phrase = 'example phrase';

-- View all active blocked phrases
SELECT * FROM public.moderation_blacklist
WHERE is_active = true
ORDER BY category, word_or_phrase;
```

### Categories

- `explicit`: Sexual or explicit content
- `abusive`: Harassment or abusive language
- `coercion`: Manipulation or pressure tactics
- `off_platform`: Requests for private meetings or off-platform communication

## How It Works

### Message Flow

1. User sends message → Socket handler receives `send_message` event
2. **Moderation check runs BEFORE message is saved**
   - Rule-based check runs first (fastest)
   - If rule-based passes and AI is enabled, AI check runs
3. **If blocked**:
   - Message is NOT saved to database
   - Message is NOT delivered to recipient
   - Sender receives `message_blocked` event with reason
   - Email alert sent to moderation team
   - Moderation decision logged
4. **If allowed**:
   - Message is saved and delivered normally
   - Moderation decision logged for audit

### Rule-Based Filtering

- Checks message content against active blacklist entries
- Case-insensitive substring matching
- Fast and reliable - always runs first
- Fails open: If blacklist can't be fetched, message is allowed

### AI-Based Moderation (Optional)

- Uses OpenAI GPT model to analyze message content
- Checks for:
  - Explicit sexual content
  - Harassment/bullying
  - Coercion/manipulation
  - Requests for private meetings
  - Requests for off-platform communication
- Returns "Allowed" or "Blocked" classification
- Fails gracefully: If AI service unavailable, falls back to rule-based

## Monitoring

### View Moderation Logs

```sql
-- View all blocked messages
SELECT * FROM public.moderation_logs
WHERE moderation_result = 'blocked'
ORDER BY timestamp DESC;

-- View moderation stats
SELECT 
    moderation_result,
    moderation_method,
    COUNT(*) as count
FROM public.moderation_logs
GROUP BY moderation_result, moderation_method;
```

### Email Alerts

When a message is blocked, an email is automatically sent to `MODERATION_EMAIL` containing:
- Sender name and email
- Receiver name and email
- Timestamp
- Blocked message content
- Reason for blocking

## Frontend Integration

The frontend automatically handles blocked messages:

- Sender sees a red warning banner with the reason
- Warning auto-dismisses after 10 seconds
- Message is never shown to the recipient
- UI clearly indicates community guidelines violation

## Testing

### Test Rule-Based Filtering

Send a message containing a blocked word from the blacklist:
```
Message: "Let's meet in a hotel room"
Expected: Message blocked, warning shown to sender
```

### Test AI Moderation (if enabled)

Send messages with implicit requests:
```
Message: "Can we discuss this on WhatsApp?"
Expected: Blocked if AI detects off-platform request
```

## Security Notes

- Moderation runs **server-side only** - cannot be bypassed by clients
- All moderation decisions are logged for audit
- Failed moderation checks default to allowing messages (fail open) to prevent blocking legitimate messages
- Blacklist is stored in database, not hardcoded - easily updatable

## Troubleshooting

### Messages not being blocked

1. Check that `moderation_blacklist` table exists and has active entries
2. Verify moderation logs are being created
3. Check backend logs for moderation errors

### Email alerts not sending

1. Verify SMTP configuration in `.env`
2. Check `MODERATION_EMAIL` is set
3. Check backend logs for email errors

### AI moderation not working

1. Verify `OPENAI_API_KEY` is set
2. Set `ENABLE_AI_MODERATION=true`
3. Check API quota/limits
4. Check backend logs for API errors


