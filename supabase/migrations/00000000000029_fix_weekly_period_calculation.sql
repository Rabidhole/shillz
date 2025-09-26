-- Fix weekly period calculation to use Monday 00:00:01 to Sunday 23:59:59
-- instead of rolling 7-day windows

-- Update get_weekly_sol_earnings function to use fixed weekly period
CREATE OR REPLACE FUNCTION get_weekly_sol_earnings()
RETURNS numeric AS $$
DECLARE
  week_start timestamp with time zone;
  week_end timestamp with time zone;
  total_earnings numeric := 0;
BEGIN
  -- Calculate current week start (Monday 00:00:01)
  week_start := date_trunc('week', now()) + interval '1 second';
  -- If today is Sunday, we need to go back to the previous Monday
  IF extract(dow from now()) = 0 THEN
    week_start := week_start - interval '7 days';
  END IF;
  
  -- Calculate current week end (Sunday 23:59:59)
  week_end := week_start + interval '6 days 23 hours 59 minutes 59 seconds';
  
  -- Get earnings from sol_payments table for current week
  SELECT COALESCE(SUM(amount_sol), 0)
  INTO total_earnings
  FROM public.sol_payments
  WHERE created_at >= week_start 
    AND created_at <= week_end;
  
  -- If no data in sol_payments, calculate from individual tables
  IF total_earnings = 0 THEN
    -- Calculate from featured_ads
    SELECT COALESCE(SUM(total_paid_sol), 0)
    INTO total_earnings
    FROM public.featured_ads
    WHERE created_at >= week_start 
      AND created_at <= week_end;
    
    -- Add booster earnings
    SELECT COALESCE(SUM(bp.price_sol), 0)
    INTO total_earnings
    FROM public.user_boosters ub
    JOIN public.booster_packs bp ON ub.booster_pack_id = bp.id
    WHERE ub.purchased_at >= week_start 
      AND ub.purchased_at <= week_end;
  END IF;
  
  RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Update get_community_pot_amount function
CREATE OR REPLACE FUNCTION get_community_pot_amount()
RETURNS numeric AS $$
DECLARE
  weekly_earnings numeric;
  pot_amount numeric;
BEGIN
  weekly_earnings := get_weekly_sol_earnings();
  pot_amount := weekly_earnings * 0.4; -- 40% of weekly earnings
  RETURN pot_amount;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION get_weekly_sol_earnings() IS 'Calculates SOL earnings for current week (Monday 00:00:01 to Sunday 23:59:59)';
COMMENT ON FUNCTION get_community_pot_amount() IS 'Calculates community pot as 40% of current week earnings';
