-- Fix ad pot calculation to count ads by display dates instead of creation dates
-- Ads should count towards the pot for the week they're actually displayed, not when they were booked

-- Update get_weekly_sol_earnings function to count ads by display dates
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
  -- Note: sol_payments contains all payments, but we need to filter by type
  SELECT COALESCE(SUM(amount_sol), 0)
  INTO booster_earnings
  FROM public.sol_payments
  WHERE created_at >= week_start 
    AND created_at <= week_end
    AND payment_type = 'booster';
  
  -- Calculate featured ads earnings by display dates (not creation dates)
  SELECT COALESCE(SUM(total_paid_sol), 0)
  INTO featured_earnings
  FROM public.featured_ads
  WHERE is_approved = true
    AND start_date <= week_end::date
    AND end_date >= week_start::date;
  
  -- Calculate banner ads earnings by display dates (not creation dates)
  SELECT COALESCE(SUM(COALESCE(total_paid_sol, price_sol, ton_amount * 0.1)), 0)
  INTO banner_earnings
  FROM public.ad_slots
  WHERE is_approved = true
    AND start_date <= week_end::date
    AND end_date >= week_start::date;
  
  total_earnings := featured_earnings + banner_earnings + booster_earnings;
  
  RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Update populate_sol_payments_from_existing function to handle display dates correctly
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
  
  -- Clear existing sol_payments to avoid duplicates
  DELETE FROM public.sol_payments;
  
  -- Insert featured ads payments - only for ads that are currently being displayed
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
    fa.created_at, -- Keep original creation date for tracking
    COALESCE(fa.wallet_address, 'unknown'),
    fa.wallet_address
  FROM public.featured_ads fa
  WHERE fa.transaction_hash IS NOT NULL 
    AND fa.total_paid_sol > 0
    AND fa.is_approved = true
    AND fa.start_date <= week_end::date
    AND fa.end_date >= week_start::date;

  -- Insert banner ads payments - only for ads that are currently being displayed
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
    ad_slots.created_at, -- Keep original creation date for tracking
    'banner_recipient',
    COALESCE(ad_slots.telegram_handle, 'unknown')
  FROM public.ad_slots
  WHERE (ad_slots.sol_transaction_hash IS NOT NULL OR ad_slots.payment_id IS NOT NULL)
    AND COALESCE(ad_slots.total_paid_sol, ad_slots.price_sol, ad_slots.ton_amount * 0.1) > 0
    AND ad_slots.is_approved = true
    AND ad_slots.start_date <= week_end::date
    AND ad_slots.end_date >= week_start::date;

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
    AND ub.purchased_at >= week_start 
    AND ub.purchased_at <= week_end;

  -- Log the population
  INSERT INTO public.system_logs (action, details, created_at)
  VALUES ('populate_payments_by_display_dates', 'Populated sol_payments based on display dates for ads and purchase dates for boosters', now());
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the new logic
COMMENT ON FUNCTION get_weekly_sol_earnings() IS 'Calculates weekly earnings: boosters count when purchased, ads count when displayed';
COMMENT ON FUNCTION populate_sol_payments_from_existing() IS 'Populates sol_payments: boosters by purchase date, ads by display date';
