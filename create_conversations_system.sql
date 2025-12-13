-- Comprehensive Messaging System Migration
-- Creates conversations table and enhances messages table with full status tracking

-- ============================================
-- 1. ENHANCE MESSAGES TABLE
-- ============================================

-- Add status column if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));

-- Add timestamp columns for status tracking
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

-- Add conversation_id for grouping messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id uuid;

-- Add receiver_id for better user matching (nullable for backward compatibility)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES auth.users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- ============================================
-- 2. CREATE CONVERSATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id uuid REFERENCES auth.users(id) NOT NULL,
    user2_id uuid REFERENCES auth.users(id),
    user2_email text, -- For users not yet registered
    last_message_id uuid REFERENCES public.messages(id),
    last_message_at timestamp with time zone,
    user1_unread_count integer DEFAULT 0,
    user2_unread_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    -- Note: We'll enforce uniqueness via application logic and triggers
    -- PostgreSQL doesn't support expressions in UNIQUE constraints directly
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_email ON public.conversations(user2_email);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations where they are user1 or user2
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
    auth.uid() = user1_id 
    OR auth.uid() = user2_id
    OR user2_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Users can insert conversations where they are user1
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = user1_id);

-- Users can update conversations where they are user1 or user2
CREATE POLICY "Users can update their conversations"
ON public.conversations FOR UPDATE
USING (
    auth.uid() = user1_id 
    OR auth.uid() = user2_id
    OR user2_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Update messages RLS to include conversation_id
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR receiver_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR sender_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- ============================================
-- 4. FUNCTIONS FOR AUTO-UPDATING CONVERSATIONS
-- ============================================

-- Function to update conversation when message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    conv_id uuid;
    other_user_id uuid;
    other_user_email text;
BEGIN
    -- Determine the other user (receiver)
    other_user_id := NEW.receiver_id;
    other_user_email := NEW.receiver_email;
    
    -- Find existing conversation (check both directions)
    SELECT id INTO conv_id
    FROM public.conversations
    WHERE (
        -- Check sender->receiver direction
        (user1_id = NEW.sender_id AND (
            (other_user_id IS NOT NULL AND user2_id = other_user_id) OR
            (other_user_email IS NOT NULL AND user2_email = other_user_email)
        ))
        OR
        -- Check receiver->sender direction (if receiver has user ID)
        (other_user_id IS NOT NULL AND user1_id = other_user_id AND user2_id = NEW.sender_id)
    )
    LIMIT 1;
    
    -- If conversation doesn't exist, create it
    IF conv_id IS NULL THEN
        INSERT INTO public.conversations (user1_id, user2_id, user2_email, last_message_id, last_message_at)
        VALUES (NEW.sender_id, other_user_id, other_user_email, NEW.id, NEW.created_at)
        RETURNING id INTO conv_id;
        
        -- Update message with conversation_id
        UPDATE public.messages SET conversation_id = conv_id WHERE id = NEW.id;
    ELSE
        -- Update existing conversation
        UPDATE public.conversations
        SET 
            last_message_id = NEW.id,
            last_message_at = NEW.created_at,
            updated_at = NOW(),
            -- Increment unread count for the receiver
            user2_unread_count = CASE 
                WHEN user1_id = NEW.sender_id THEN user2_unread_count + 1
                ELSE user1_unread_count + 1
            END
        WHERE id = conv_id;
        
        -- Update message with conversation_id
        UPDATE public.messages SET conversation_id = conv_id WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation on message insert
DROP TRIGGER IF EXISTS trigger_update_conversation ON public.messages;
CREATE TRIGGER trigger_update_conversation
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- 5. FUNCTION TO MARK MESSAGES AS READ
-- ============================================

CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_conversation_id uuid,
    p_user_id uuid
)
RETURNS void AS $$
BEGIN
    -- Update messages to read status
    UPDATE public.messages
    SET 
        status = 'read',
        read_at = NOW()
    WHERE 
        conversation_id = p_conversation_id
        AND receiver_id = p_user_id
        AND status != 'read';
    
    -- Reset unread count in conversation
    UPDATE public.conversations
    SET 
        user1_unread_count = CASE WHEN user1_id = p_user_id THEN 0 ELSE user1_unread_count END,
        user2_unread_count = CASE WHEN user2_id = p_user_id THEN 0 ELSE user2_unread_count END
    WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. UPDATE EXISTING MESSAGES
-- ============================================

-- Set status to 'sent' for existing messages without status
UPDATE public.messages 
SET status = 'sent' 
WHERE status IS NULL;

-- Create conversations for existing messages (optional, can be run separately)
-- This would group existing messages into conversations
-- Note: This is a one-time migration that can be run manually if needed

