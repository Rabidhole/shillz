-- Migrate data from users_new to users table
INSERT INTO public.users (
  id,
  wallet_address,
  tier,
  total_shills,
  daily_shills,
  weekly_shills,
  created_at
)
SELECT 
  id,
  COALESCE(wallet_address, telegram_username) as wallet_address,
  tier,
  total_shills,
  0 as daily_shills, -- Initialize to 0
  0 as weekly_shills, -- Initialize to 0
  created_at
FROM public.users_new
WHERE wallet_address IS NOT NULL OR telegram_username IS NOT NULL;

-- Update foreign key references in user_boosters table
ALTER TABLE public.user_boosters 
DROP CONSTRAINT IF EXISTS user_boosters_user_id_fkey;

ALTER TABLE public.user_boosters
ADD CONSTRAINT user_boosters_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update any other tables that reference users_new.id
-- (This will be handled in the application code updates)

-- Create a view for backward compatibility during transition
CREATE VIEW public.users_new_compat AS
SELECT 
  id,
  wallet_address as telegram_username,
  tier,
  total_shills,
  created_at
FROM public.users;

-- Add comment explaining the migration
COMMENT ON TABLE public.users IS 'New users table with wallet_address as primary identifier and weekly/daily shill tracking';
COMMENT ON VIEW public.users_new_compat IS 'Compatibility view for users_new table during migration period';
