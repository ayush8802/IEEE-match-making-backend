-- Create moderation blacklist table for rule-based filtering
-- Admins can easily add/remove/modify blocked words and phrases

CREATE TABLE IF NOT EXISTS public.moderation_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_or_phrase TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'explicit', -- 'explicit', 'abusive', 'coercion', 'off_platform', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT -- Admin who added this entry
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_moderation_blacklist_active ON public.moderation_blacklist(word_or_phrase) WHERE is_active = true;

-- Create moderation logs table for audit trail
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message_content TEXT NOT NULL,
    moderation_result TEXT NOT NULL, -- 'blocked', 'allowed'
    moderation_method TEXT NOT NULL, -- 'rule_based', 'ai_based', 'fallback'
    blocked_reason TEXT, -- Why it was blocked (keyword matched, AI classification, etc.)
    ai_response JSONB, -- Full AI response for analysis
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_sent BOOLEAN DEFAULT false
);

-- Create index for querying logs
CREATE INDEX IF NOT EXISTS idx_moderation_logs_timestamp ON public.moderation_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_sender ON public.moderation_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_result ON public.moderation_logs(moderation_result);

-- Insert default blacklist entries (explicit words)
INSERT INTO public.moderation_blacklist (word_or_phrase, category) VALUES
    ('nude', 'explicit'),
    ('naked', 'explicit'),
    ('sex', 'explicit'),
    ('sexual', 'explicit'),
    ('fuck', 'explicit'),
    ('porn', 'explicit'),
    ('pornography', 'explicit'),
    ('xxx', 'explicit'),
    ('nsfw', 'explicit')
ON CONFLICT (word_or_phrase) DO NOTHING;

-- Insert default blacklist entries (intent-based phrases)
INSERT INTO public.moderation_blacklist (word_or_phrase, category) VALUES
    ('meet in a hotel room', 'off_platform'),
    ('come to my place', 'off_platform'),
    ('visit my house', 'off_platform'),
    ('private meeting', 'off_platform'),
    ('meet offline', 'off_platform'),
    ('meet in person', 'off_platform'),
    ('outside this platform', 'off_platform'),
    ('outside the platform', 'off_platform'),
    ('let''s meet privately', 'off_platform'),
    ('private chat', 'off_platform'),
    ('whatsapp', 'off_platform'),
    ('telegram', 'off_platform'),
    ('phone number', 'off_platform'),
    ('personal number', 'off_platform'),
    ('personal email', 'off_platform')
ON CONFLICT (word_or_phrase) DO NOTHING;

-- Insert default blacklist entries (abusive language)
INSERT INTO public.moderation_blacklist (word_or_phrase, category) VALUES
    ('stupid', 'abusive'),
    ('idiot', 'abusive'),
    ('moron', 'abusive'),
    ('hate', 'abusive'),
    ('kill yourself', 'abusive'),
    ('die', 'abusive')
ON CONFLICT (word_or_phrase) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.moderation_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation_blacklist (admin access only, users can't read it)
-- In production, create proper admin policies
CREATE POLICY "Allow public read for active blacklist" ON public.moderation_blacklist
    FOR SELECT USING (is_active = true);

-- RLS Policies for moderation_logs (admin access only)
-- Users should not be able to read moderation logs
CREATE POLICY "Deny all access to moderation logs" ON public.moderation_logs
    FOR ALL USING (false);

-- Grant necessary permissions
GRANT SELECT ON public.moderation_blacklist TO anon, authenticated;
-- Moderation logs should only be accessible by service role
GRANT ALL ON public.moderation_logs TO service_role;

-- Comments
COMMENT ON TABLE public.moderation_blacklist IS 'Configurable blacklist of words and phrases to block in messages';
COMMENT ON TABLE public.moderation_logs IS 'Audit trail of all moderation decisions';
COMMENT ON COLUMN public.moderation_blacklist.category IS 'Category of blocked content: explicit, abusive, coercion, off_platform, etc.';
COMMENT ON COLUMN public.moderation_logs.moderation_method IS 'Method used: rule_based, ai_based, or fallback';
COMMENT ON COLUMN public.moderation_logs.blocked_reason IS 'Reason for blocking (e.g., matched keyword, AI classification)';


