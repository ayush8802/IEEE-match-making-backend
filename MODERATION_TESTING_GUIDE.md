# Message Moderation System - Testing Guide

This guide provides a step-by-step testing phase for the message moderation system.

## Prerequisites

1. ✅ Database tables created (run `create_moderation_system.sql` in Supabase)
2. ✅ Environment variables configured in `backend/.env`
3. ✅ Backend server running
4. ✅ Frontend application running
5. ✅ Two test user accounts (User 1 and User 2)

## Test Phase 1: Database Setup Verification

### Step 1.1: Verify Tables Exist
Run in Supabase SQL Editor:
```sql
-- Check if moderation tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('moderation_blacklist', 'moderation_logs');

-- Expected: Should return 2 rows
```

### Step 1.2: Verify Default Blacklist Entries
```sql
-- Check active blacklist entries
SELECT word_or_phrase, category 
FROM public.moderation_blacklist 
WHERE is_active = true 
ORDER BY category, word_or_phrase;

-- Expected: Should show multiple entries including:
-- - Explicit words: nude, sex, fuck, etc.
-- - Off-platform phrases: meet in a hotel room, come to my place, etc.
-- - Abusive words: stupid, idiot, etc.
```

**✅ Test Result:** If tables exist and blacklist has entries, proceed to Test Phase 2.

---

## Test Phase 2: Rule-Based Filtering (Blocked Messages)

### Step 2.1: Test Explicit Word Blocking

1. **Log in as User 1**
2. **Navigate to Messages**
3. **Select User 2** to start a conversation
4. **Send message:** `"Let's discuss sex"`
5. **Expected Result:**
   - ❌ Message is NOT delivered to User 2
   - ✅ Red warning banner appears for User 1 with reason
   - ✅ Warning shows: "Message contains blocked content: 'sex' (category: explicit)"
   - ✅ Warning auto-dismisses after 10 seconds

6. **Verify in Database:**
```sql
-- Check moderation log
SELECT 
    sender_id,
    receiver_id,
    message_content,
    moderation_result,
    moderation_method,
    blocked_reason,
    timestamp
FROM public.moderation_logs
WHERE moderation_result = 'blocked'
ORDER BY timestamp DESC
LIMIT 1;

-- Expected: Should show the blocked message with method='rule_based'
```

**✅ Test Result:** If message blocked and logged, proceed to next test.

---

### Step 2.2: Test Off-Platform Request Blocking

1. **As User 1, send message:** `"Let's meet in a hotel room"`
2. **Expected Result:**
   - ❌ Message blocked
   - ✅ Warning shows reason mentioning off-platform request
   - ✅ Message not delivered to User 2

3. **Verify Email Alert:**
   - Check `ieeemetaverse@gmail.com` inbox
   - Should receive email with:
     - Subject: "🚨 Blocked Message Alert - Community Guidelines Violation"
     - Sender name and email
     - Receiver name and email
     - Blocked message content
     - Reason for blocking

**✅ Test Result:** If message blocked and email sent, proceed to next test.

---

### Step 2.3: Test Multiple Blocked Words

1. **Send message:** `"This is fucking stupid"`
2. **Expected Result:**
   - ❌ Message blocked
   - ✅ First matched word triggers the block

**✅ Test Result:** Rule-based filtering working correctly.

---

## Test Phase 3: Allowed Messages (Normal Flow)

### Step 3.1: Test Normal Professional Message

1. **Send message:** `"Hello, I'm interested in collaborating on AI research"`
2. **Expected Result:**
   - ✅ Message is delivered to User 2
   - ✅ Message appears in both User 1 and User 2's chat
   - ✅ No warning banner
   - ✅ Normal message status indicators work

3. **Verify in Database:**
```sql
-- Check moderation log for allowed message
SELECT 
    moderation_result,
    moderation_method,
    timestamp
FROM public.moderation_logs
WHERE message_content LIKE '%collaborating%'
ORDER BY timestamp DESC
LIMIT 1;

-- Expected: moderation_result = 'allowed'
```

**✅ Test Result:** Normal messages pass through successfully.

---

## Test Phase 4: Edge Cases

### Step 4.1: Test Case Sensitivity

1. **Send message:** `"Let's discuss SEX and NUDE topics"`
2. **Expected Result:**
   - ❌ Message blocked (case-insensitive matching works)

**✅ Test Result:** Case-insensitive filtering working.

---

### Step 4.2: Test Partial Word Matching

1. **Send message:** `"This is a sexual topic"` (contains "sexual")
2. **Expected Result:**
   - ❌ Message blocked if "sexual" is in blacklist
   - ✅ Substring matching works correctly

---

### Step 4.3: Test Empty/Whitespace Messages

1. **Send message:** `"   "` (only spaces)
2. **Expected Result:**
   - ✅ Message handling works (may be handled by existing validation)

---

## Test Phase 5: UI/UX Verification

### Step 5.1: Warning Banner Appearance

1. **Send a blocked message**
2. **Verify:**
   - ✅ Red banner appears immediately
   - ✅ Danger icon (⚠️) visible
   - ✅ "Message Blocked" heading shown
   - ✅ Reason displayed clearly
   - ✅ Close button (×) works
   - ✅ Banner disappears after clicking close
   - ✅ Banner auto-dismisses after 10 seconds

---

### Step 5.2: Warning Banner Styling

1. **Verify visual appearance:**
   - ✅ Red background (#dc2626)
   - ✅ White text readable
   - ✅ Proper spacing and padding
   - ✅ Smooth animation on appear
   - ✅ Doesn't block chat input area permanently

---

## Test Phase 6: Email Notifications (Optional - Requires SMTP)

### Step 6.1: Verify Email Delivery

1. **Send a blocked message**
2. **Check email inbox** (`ieeemetaverse@gmail.com`)
3. **Verify email contains:**
   - ✅ Subject line correct
   - ✅ Sender information (name + email)
   - ✅ Receiver information (name + email)
   - ✅ Timestamp
   - ✅ Blocked message content
   - ✅ Reason for blocking
   - ✅ Professional formatting

**Note:** If SMTP not configured, emails are logged in backend console.

---

## Test Phase 7: AI Moderation (Optional - Requires OpenAI API Key)

### Prerequisites:
- Set `ENABLE_AI_MODERATION=true` in `.env`
- Add valid `OPENAI_API_KEY` in `.env`
- Restart backend server

### Step 7.1: Test AI Detection of Implicit Requests

1. **Send message:** `"Can we continue this conversation on WhatsApp?"`
2. **Expected Result:**
   - ❌ Message blocked by AI
   - ✅ Reason mentions off-platform request
   - ✅ Moderation method = 'ai_based' in logs

3. **Verify in Database:**
```sql
SELECT 
    moderation_method,
    blocked_reason,
    ai_response
FROM public.moderation_logs
WHERE moderation_method = 'ai_based'
ORDER BY timestamp DESC
LIMIT 1;
```

---

### Step 7.2: Test AI Context Understanding

1. **Send message:** `"I'd like to meet you privately to discuss the project"`
2. **Expected Result:**
   - ❌ Blocked by AI (detects private meeting request)

---

### Step 7.3: Test AI Fallback

1. **Disable OpenAI API** (temporarily break API key)
2. **Send message:** `"Test message"`
3. **Expected Result:**
   - ✅ Falls back to rule-based filtering
   - ✅ Message allowed if passes rule-based check
   - ✅ No errors in backend logs

---

## Test Phase 8: Performance & Logging

### Step 8.1: Verify Logging

Run this query after sending several messages:
```sql
-- View moderation statistics
SELECT 
    moderation_result,
    moderation_method,
    COUNT(*) as count,
    MIN(timestamp) as first_log,
    MAX(timestamp) as last_log
FROM public.moderation_logs
GROUP BY moderation_result, moderation_method;
```

**Expected:** Should show counts for both blocked and allowed messages.

---

### Step 8.2: Verify Performance

1. **Send 10 normal messages rapidly**
2. **Expected Result:**
   - ✅ No noticeable delay
   - ✅ All messages delivered normally
   - ✅ No backend errors

---

## Test Phase 9: Admin Functions

### Step 9.1: Add Custom Blacklist Entry

```sql
-- Add a test phrase
INSERT INTO public.moderation_blacklist (word_or_phrase, category, is_active)
VALUES ('test_phrase_123', 'explicit', true);

-- Test it
-- Send message containing "test_phrase_123"
-- Expected: Message blocked
```

---

### Step 9.2: Deactivate Blacklist Entry

```sql
-- Deactivate a phrase
UPDATE public.moderation_blacklist
SET is_active = false
WHERE word_or_phrase = 'test_phrase_123';

-- Test it
-- Send message containing "test_phrase_123"
-- Expected: Message allowed (phrase deactivated)
```

---

## Expected Test Results Summary

| Test Phase | Status | Notes |
|------------|--------|-------|
| Phase 1: Database Setup | ✅ | Tables and default entries exist |
| Phase 2: Rule-Based Blocking | ✅ | Explicit words and phrases blocked |
| Phase 3: Allowed Messages | ✅ | Normal messages pass through |
| Phase 4: Edge Cases | ✅ | Case-insensitive, substring matching works |
| Phase 5: UI/UX | ✅ | Warning banner displays correctly |
| Phase 6: Email Notifications | ✅ | Emails sent (if SMTP configured) |
| Phase 7: AI Moderation | ⚠️ | Optional - only if enabled |
| Phase 8: Performance | ✅ | No performance issues |
| Phase 9: Admin Functions | ✅ | Blacklist management works |

---

## Troubleshooting

### Messages not being blocked:
1. Check blacklist entries: `SELECT * FROM moderation_blacklist WHERE is_active = true;`
2. Check backend logs for moderation errors
3. Verify moderation code is running (check logs)

### Email alerts not sending:
1. Verify SMTP settings in `.env`
2. Check `MODERATION_EMAIL` is set
3. Check backend logs for email errors

### Warning banner not showing:
1. Check browser console for errors
2. Verify socket connection is active
3. Check `message_blocked` event is being received

### AI moderation not working:
1. Verify `ENABLE_AI_MODERATION=true`
2. Check `OPENAI_API_KEY` is valid
3. Verify API quota/limits
4. Check backend logs for API errors

---

## Quick Test Checklist

- [ ] Database tables created
- [ ] Default blacklist entries present
- [ ] Explicit word blocked: "sex"
- [ ] Off-platform phrase blocked: "hotel room"
- [ ] Normal message allowed: "Hello, how are you?"
- [ ] Warning banner appears for blocked messages
- [ ] Warning banner dismisses correctly
- [ ] Email alert sent (if SMTP configured)
- [ ] Moderation logs created
- [ ] Performance acceptable

---

**Testing Complete!** 🎉

If all tests pass, the moderation system is working correctly and ready for production use.


