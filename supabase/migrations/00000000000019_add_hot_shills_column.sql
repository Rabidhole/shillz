-- Add hot_shills column to tokens_new table for weekly shill tracking
ALTER TABLE public.tokens_new 
ADD COLUMN IF NOT EXISTS hot_shills bigint DEFAULT 0;

-- Create index for hot_shills for better performance
CREATE INDEX IF NOT EXISTS idx_tokens_hot_shills ON public.tokens_new(hot_shills DESC);
