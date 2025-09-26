-- Fix get_weekly_sol_earnings function to count ads by start_date only
-- Ads should count towards the week they START displaying, not when they overlap

CREATE OR REPLACE FUNCTION get_weekly_sol_earnings()
RETURNS numeric AS $$
DECLARE
  week_start timestamp with time zone;
  week_end timestamp with time zone;
  total_earnings numeric := 0;
  featured_earnings numeric := 0;
  banner_earnings numeric := 0;
  booster_earnings numeric := 0;
BEGIN
  -- Calculate current week start (Monday 00:00:01)
  week_start := date_trunc('week', now()) + interval '1 second';
  -- If today is Sunday, we need to go back to the previous Monday
  IF extract(dow from now()) = 0 THEN
    week_start := week_start - interval '7 days';
  END IF;
  
  -- Calculate current week end (Sunday 23:59:59)
  week_end := week_start + interval '6 days 23 hours 59 minutes 59 seconds';
  
  -- Get earnings from sol_payments table for current week (boosters only)
  -- Boosters count when purchased (by creation date)
  SELECT COALESCE(SUM(amount_sol), 0)
  INTO booster_earnings
  FROM public.sol_payments
  WHERE created_at >= week_start 
    AND created_at <= week_end
    AND payment_type = 'booster';
  
  -- Calculate featured ads earnings by START date only (when they begin displaying)
  SELECT COALESCE(SUM(total_paid_sol), 0)
  INTO featured_earnings
  FROM public.featured_ads
  WHERE is_approved = true
    AND start_date >= week_start::date
    AND start_date <= week_end::date;
  
  -- Calculate banner ads earnings by START date only (when they begin displaying)
  SELECT COALESCE(SUM(COALESCE(total_paid_sol, price_sol, ton_amount * 0.1)), 0)
  INTO banner_earnings
  FROM public.ad_slots
  WHERE is_approved = true
    AND start_date >= week_start::date
    AND start_date <= week_end::date;
  
  total_earnings := featured_earnings + banner_earnings + booster_earnings;
  
  RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Update populate_sol_payments_from_existing function to use the same logic
CREATE OR REPLACE FUNCTION populate_sol_payments_from_existing()
RETURNS void AS $$
DECLARE
  week_start timestamp with time zone;
  week_end timestamp with time zone;
BEGIN
  -- Calculate current week start (Monday 00:00:01)
  week_start := date_trunc('week', now()) + interval '1 second';
  -- If today is Sunday, we need to go back to the previous Monday
  IF extract(dow from now()) = 0 THEN
    week_start := week_start - interval '7 days';
  END IF;
  
  -- Calculate current week end (Sunday 23:59:59)
  week_end := week_start + interval '6 days 23 hours 59 minutes 59 seconds';

  -- Insert featured ads payments - only for ads that START this week
  INSERT INTO public.sol_payments (
    transaction_hash,
    amount_sol,
    payment_type,
    reference_id,
    created_at,
    recipient_address,
    sender_address
  )
  SELECT
    fa.transaction_hash,
    fa.total_paid_sol,
    'featured_ad',
    fa.id,
    fa.created_at,
    COALESCE(fa.wallet_address, 'unknown'),
    fa.wallet_address
  FROM public.featured_ads fa
  WHERE fa.transaction_hash IS NOT NULL
    AND fa.total_paid_sol > 0
    AND fa.is_approved = true
    AND fa.start_date >= week_start::date
    AND fa.start_date <= week_end::date
    AND NOT EXISTS (
      SELECT 1 FROM public.sol_payments sp
      WHERE sp.transaction_hash = fa.transaction_hash
    );

  -- Insert banner ads payments - only for ads that START this week
  INSERT INTO public.sol_payments (
    transaction_hash,
    amount_sol,
    payment_type,
    reference_id,
    created_at,
    recipient_address,
    sender_address
  )
  SELECT
    COALESCE(ad_slots.sol_transaction_hash, ad_slots.payment_id) as transaction_hash,
    COALESCE(ad_slots.total_paid_sol, ad_slots.price_sol, ad_slots.ton_amount * 0.1) as amount_sol,
    'banner_ad',
    ad_slots.id,
    ad_slots.created_at,
    'banner_recipient',
    COALESCE(ad_slots.telegram_handle, 'unknown')
  FROM public.ad_slots
  WHERE (ad_slots.sol_transaction_hash IS NOT NULL OR ad_slots.payment_id IS NOT NULL)
    AND COALESCE(ad_slots.total_paid_sol, ad_slots.price_sol, ad_slots.ton_amount * 0.1) > 0
    AND ad_slots.is_approved = true
    AND ad_slots.start_date >= week_start::date
    AND ad_slots.start_date <= week_end::date
    AND NOT EXISTS (
      SELECT 1 FROM public.sol_payments sp
      WHERE sp.transaction_hash = COALESCE(ad_slots.sol_transaction_hash, ad_slots.payment_id)
    );

  -- Insert booster payments (these count when purchased, not when used)
  INSERT INTO public.sol_payments (
    transaction_hash,
    amount_sol,
    payment_type,
    reference_id,
    created_at,
    recipient_address,
    sender_address
  )
  SELECT
    ub.transaction_hash,
    bp.price_sol,
    'booster',
    ub.id,
    ub.purchased_at,
    'booster_recipient',
    'unknown'
  FROM public.user_boosters ub
  JOIN public.booster_packs bp ON ub.booster_pack_id = bp.id
  WHERE ub.transaction_hash IS NOT NULL
    AND bp.price_sol > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.sol_payments sp
      WHERE sp.transaction_hash = ub.transaction_hash
    );

  INSERT INTO public.system_logs (action, details, created_at)
  VALUES ('populate_payments', 'Populated sol_payments with corrected ad timing logic (ads count by start_date)', now());
END;
$$ LANGUAGE plpgsql;

-- Add comments explaining the corrected logic
COMMENT ON FUNCTION get_weekly_sol_earnings() IS 'Calculates weekly earnings: boosters by purchase date, ads by start_date only (when they begin displaying)';
COMMENT ON FUNCTION populate_sol_payments_from_existing() IS 'Populates sol_payments: boosters by purchase date, ads by start_date only';
