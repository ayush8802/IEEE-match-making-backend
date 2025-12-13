-- Add status column to messages table
-- This enables tracking message delivery status (sent, delivered, read)

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);

-- Update existing messages to have 'sent' status if they're older than this migration
UPDATE public.messages 
SET status = 'sent' 
WHERE status IS NULL;



