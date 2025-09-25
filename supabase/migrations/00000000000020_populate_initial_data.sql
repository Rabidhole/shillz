-- Populate users table with existing data from users_new
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
WHERE wallet_address IS NOT NULL OR telegram_username IS NOT NULL
ON CONFLICT (wallet_address) DO NOTHING;

-- Update daily_shills and weekly_shills for existing users
UPDATE public.users 
SET 
  daily_shills = (
    SELECT COUNT(*)::bigint
    FROM public.shills_new s
    WHERE s.user_id = users.id
      AND s.created_at >= date_trunc('day', now())
  ),
  weekly_shills = (
    SELECT COUNT(*)::bigint
    FROM public.shills_new s
    WHERE s.user_id = users.id
      AND s.created_at >= date_trunc('week', now())
  )
WHERE id IN (SELECT id FROM public.users);

-- Update hot_shills for tokens
UPDATE public.tokens_new 
SET hot_shills = (
  SELECT COUNT(*)::bigint
  FROM public.shills_new s
  WHERE s.token_id = tokens_new.id
    AND s.created_at >= date_trunc('week', now())
)
WHERE id IN (SELECT id FROM public.tokens_new);

-- Create an initial pot snapshot if none exists
INSERT INTO public.pot_snapshots (total_amount_sol, weekly_earnings_sol, snapshot_date)
SELECT 
  0 as total_amount_sol,
  0 as weekly_earnings_sol,
  now() as snapshot_date
WHERE NOT EXISTS (SELECT 1 FROM public.pot_snapshots);

-- Add some initial winners to the snapshot
INSERT INTO public.pot_snapshot_winners (snapshot_id, user_id, weekly_shills, position)
SELECT 
  ps.id as snapshot_id,
  u.id as user_id,
  u.weekly_shills,
  ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC) as position
FROM public.pot_snapshots ps
CROSS JOIN public.users u
WHERE u.weekly_shills > 0
  AND NOT EXISTS (SELECT 1 FROM public.pot_snapshot_winners WHERE snapshot_id = ps.id)
LIMIT 10;
