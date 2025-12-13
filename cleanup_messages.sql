-- ============================================
-- CLEANUP SCRIPT: Delete All Messages and Conversations
-- ============================================
-- This script will delete all messages and conversations from the database
-- Use this to clean up test data and start fresh
-- 
-- WARNING: This will permanently delete ALL messages and conversations!
-- ============================================

-- Step 1: Delete conversations FIRST (they have foreign key to messages.last_message_id)
-- This must be done first to avoid foreign key constraint violations
DELETE FROM public.conversations;

-- Step 2: Delete all messages (now safe since conversations are deleted)
DELETE FROM public.messages;

-- Step 3: Reset sequences (optional, but good practice)
-- Reset any auto-incrementing IDs if you have them

-- Step 4: Verify deletion (optional - run these to check)
-- SELECT COUNT(*) FROM public.messages; -- Should return 0
-- SELECT COUNT(*) FROM public.conversations; -- Should return 0

-- ============================================
-- Alternative: Update conversations first, then delete
-- ============================================
-- If you want to preserve conversation structure but remove messages:
-- UPDATE public.conversations SET last_message_id = NULL, last_message_at = NULL;
-- DELETE FROM public.messages;

-- ============================================
-- To delete messages for specific users only:
-- ============================================
-- DELETE FROM public.messages 
-- WHERE sender_id = 'USER_ID_HERE' OR receiver_id = 'USER_ID_HERE';
--
-- DELETE FROM public.conversations
-- WHERE user1_id = 'USER_ID_HERE' OR user2_id = 'USER_ID_HERE';

