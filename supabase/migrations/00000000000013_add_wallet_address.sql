-- Add wallet_address column to users_new table
ALTER TABLE public.users_new 
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users_new(wallet_address);

-- Add unique constraint on wallet_address
ALTER TABLE public.users_new 
ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);

-- Update existing users to have wallet_address if they don't have one
-- This is a migration for existing data
UPDATE public.users_new 
SET wallet_address = telegram_username
WHERE wallet_address IS NULL AND telegram_username IS NOT NULL AND telegram_username != '';

-- Make wallet_address NOT NULL after setting default values
ALTER TABLE public.users_new 
ALTER COLUMN wallet_address SET NOT NULL;

-- Update RLS policies to work with wallet addresses
DROP POLICY IF EXISTS "Users can view own data" ON public.users_new;
DROP POLICY IF EXISTS "Users can update own data" ON public.users_new;

-- Create new policies based on wallet address
CREATE POLICY "Users can view own data by wallet" ON public.users_new
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can update own data by wallet" ON public.users_new
  FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
