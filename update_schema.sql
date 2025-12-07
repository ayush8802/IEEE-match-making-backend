-- Add sender_email column to messages table
ALTER TABLE public.messages 
ADD COLUMN sender_email text;

-- Update existing messages to have a sender_email (optional, best effort)
-- Ideally we would join with auth.users, but we can't do that easily in a simple query if we don't have permissions or if it's complex.
-- For now, let's just make it nullable initially, then we can enforce it later if needed.

-- Update RLS policies to allow selecting if you are the sender_email or receiver_email
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id 
  OR receiver_email = (select email from auth.users where id = auth.uid())
  OR sender_email = (select email from auth.users where id = auth.uid())
);
