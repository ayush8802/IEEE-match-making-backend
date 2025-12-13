-- Simple cleanup: Delete all messages and conversations
-- Run this in Supabase SQL Editor
-- IMPORTANT: Delete conversations first due to foreign key constraints

-- Step 1: Delete conversations first (they reference messages)
DELETE FROM public.conversations;

-- Step 2: Now delete messages (no foreign key dependencies)
DELETE FROM public.messages;

