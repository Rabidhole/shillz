-- Fix the pot_snapshot_winners table to include SOL amounts
-- Add columns for SOL prize amounts
ALTER TABLE public.pot_snapshot_winners 
ADD COLUMN IF NOT EXISTS projected_prize_sol numeric(12, 6),
ADD COLUMN IF NOT EXISTS prize_percentage numeric(5, 2);

-- Update the take_weekly_snapshot function with correct percentages and SOL calculations
CREATE OR REPLACE FUNCTION take_weekly_snapshot()
RETURNS uuid AS $$
DECLARE
  snapshot_id uuid;
  pot_amount numeric;
  weekly_earnings numeric;
  sol_usd_price numeric := 200; -- Default fallback price
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
    sol_usd_price,
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
    sol_usd_price,
    -- Legacy values
    pot_amount * sol_usd_price, -- Use actual SOL price
    pot_amount * sol_usd_price,
    'sol_recipient',
    0, -- No TON balance
    0, -- No TON USD
    6.0 -- Legacy TON price
  )
  RETURNING id INTO snapshot_id;
  
  -- Get top 10 users by weekly shills and add them as winners with correct percentages
  INSERT INTO public.pot_snapshot_winners (
    snapshot_id, 
    user_id, 
    weekly_shills, 
    position,
    projected_prize_sol,
    prize_percentage,
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
    -- Calculate SOL amounts based on correct percentages
    (pot_amount * CASE ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC)
      WHEN 1 THEN 0.30  -- 30% for 1st place
      WHEN 2 THEN 0.20  -- 20% for 2nd place
      WHEN 3 THEN 0.15  -- 15% for 3rd place
      WHEN 4 THEN 0.10  -- 10% for 4th place
      WHEN 5 THEN 0.08  -- 8% for 5th place
      WHEN 6 THEN 0.06  -- 6% for 6th place
      WHEN 7 THEN 0.04  -- 4% for 7th place
      WHEN 8 THEN 0.03  -- 3% for 8th place
      WHEN 9 THEN 0.02  -- 2% for 9th place
      WHEN 10 THEN 0.02 -- 2% for 10th place
      ELSE 0
    END) as projected_prize_sol,
    -- Store the percentage
    (CASE ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC)
      WHEN 1 THEN 30.00
      WHEN 2 THEN 20.00
      WHEN 3 THEN 15.00
      WHEN 4 THEN 10.00
      WHEN 5 THEN 8.00
      WHEN 6 THEN 6.00
      WHEN 7 THEN 4.00
      WHEN 8 THEN 3.00
      WHEN 9 THEN 2.00
      WHEN 10 THEN 2.00
      ELSE 0
    END) as prize_percentage,
    -- Legacy values
    u.wallet_address as username,
    ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC) as rank,
    u.total_shills,
    -- Calculate USD amount using SOL price
    (pot_amount * sol_usd_price * CASE ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC)
      WHEN 1 THEN 0.30
      WHEN 2 THEN 0.20
      WHEN 3 THEN 0.15
      WHEN 4 THEN 0.10
      WHEN 5 THEN 0.08
      WHEN 6 THEN 0.06
      WHEN 7 THEN 0.04
      WHEN 8 THEN 0.03
      WHEN 9 THEN 0.02
      WHEN 10 THEN 0.02
      ELSE 0
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

-- Add comments for the new columns
COMMENT ON COLUMN public.pot_snapshot_winners.projected_prize_sol IS 'Prize amount in SOL for this winner';
COMMENT ON COLUMN public.pot_snapshot_winners.prize_percentage IS 'Percentage of total pot this winner receives';
