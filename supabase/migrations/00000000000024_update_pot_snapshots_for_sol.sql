-- Update pot_snapshots table to use SOL instead of TON
-- This migration updates the existing table structure

-- Add new SOL-based columns
ALTER TABLE public.pot_snapshots 
ADD COLUMN IF NOT EXISTS total_amount_sol numeric(18,9),
ADD COLUMN IF NOT EXISTS weekly_earnings_sol numeric(18,9),
ADD COLUMN IF NOT EXISTS snapshot_date timestamp with time zone;

-- Update pot_snapshot_winners to use new user structure
ALTER TABLE public.pot_snapshot_winners 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS weekly_shills bigint,
ADD COLUMN IF NOT EXISTS position integer;

-- Add foreign key constraint for user_id (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE public.pot_snapshot_winners 
        ADD CONSTRAINT pot_snapshot_winners_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_pot_snapshots_snapshot_date ON public.pot_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_pot_snapshot_winners_user_id ON public.pot_snapshot_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_pot_snapshot_winners_position ON public.pot_snapshot_winners(position);

-- Update the take_weekly_snapshot function to use the correct column names
CREATE OR REPLACE FUNCTION take_weekly_snapshot()
RETURNS uuid AS $$
DECLARE
  snapshot_id uuid;
  pot_amount numeric;
  weekly_earnings numeric;
BEGIN
  -- Get weekly earnings from SOL payments or calculate from individual tables
  weekly_earnings := get_weekly_sol_earnings();
  
  -- Calculate 40% of weekly earnings
  pot_amount := weekly_earnings * 0.4;
  
  -- Create snapshot with both old and new columns for compatibility
  INSERT INTO public.pot_snapshots (
    total_amount_sol, 
    weekly_earnings_sol, 
    snapshot_date,
    -- Legacy columns for backward compatibility
    pot_usd,
    goal_usd,
    wallet_address,
    wallet_balance_ton,
    wallet_balance_usd,
    ton_usd
  )
  VALUES (
    pot_amount,
    weekly_earnings, 
    now(),
    -- Legacy values
    pot_amount * 100, -- Assume $100 SOL for legacy USD calculation
    pot_amount * 100,
    'sol_recipient',
    0, -- No TON balance
    0, -- No TON USD
    6.0 -- Legacy TON price
  )
  RETURNING id INTO snapshot_id;
  
  -- Get top 10 users by weekly shills and add them as winners
  INSERT INTO public.pot_snapshot_winners (
    snapshot_id, 
    user_id, 
    weekly_shills, 
    position,
    -- Legacy columns
    username,
    rank,
    total_shills,
    projected_prize_usd
  )
  SELECT 
    snapshot_id,
    u.id,
    u.weekly_shills,
    ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC) as position,
    -- Legacy values
    u.wallet_address as username,
    ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC) as rank,
    u.total_shills,
    (pot_amount * 100 * CASE ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC)
      WHEN 1 THEN 0.12
      WHEN 2 THEN 0.08
      WHEN 3 THEN 0.06
      ELSE 0.03
    END) as projected_prize_usd
  FROM public.users u
  WHERE u.weekly_shills > 0
  ORDER BY u.weekly_shills DESC
  LIMIT 10;
  
  -- Log the snapshot
  INSERT INTO public.system_logs (action, details, created_at)
  VALUES ('weekly_snapshot', 
          'Created snapshot ' || snapshot_id || ' with pot amount: ' || pot_amount || ' SOL', 
          now());
  
  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments to clarify the table structure
COMMENT ON COLUMN public.pot_snapshots.total_amount_sol IS 'Community pot amount in SOL (40% of weekly earnings)';
COMMENT ON COLUMN public.pot_snapshots.weekly_earnings_sol IS 'Total weekly earnings in SOL';
COMMENT ON COLUMN public.pot_snapshots.snapshot_date IS 'When the snapshot was taken (Sunday 11:59:59 PM)';

COMMENT ON COLUMN public.pot_snapshot_winners.user_id IS 'References users.id';
COMMENT ON COLUMN public.pot_snapshot_winners.weekly_shills IS 'Weekly shill count for this user';
COMMENT ON COLUMN public.pot_snapshot_winners.position IS 'Ranking position (1-10)';
