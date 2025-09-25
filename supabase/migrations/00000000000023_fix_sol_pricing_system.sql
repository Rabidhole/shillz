-- Fix SOL pricing system across all tables
-- This migration consolidates payment tracking and updates pricing to SOL

-- 1. Create sol_payments table for centralized payment tracking
CREATE TABLE IF NOT EXISTS public.sol_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_hash text UNIQUE NOT NULL,
  amount_sol numeric(18,9) NOT NULL,
  amount_usd numeric(10,2),
  sol_usd_price numeric(10,2),
  recipient_address text NOT NULL,
  sender_address text,
  payment_type text NOT NULL, -- 'booster', 'banner_ad', 'featured_ad'
  reference_id uuid, -- Points to the booster/ad record
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sol_payments_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sol_payments_created_at ON public.sol_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sol_payments_type ON public.sol_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_sol_payments_hash ON public.sol_payments(transaction_hash);

-- 2. Update ad_slots table to include SOL pricing
ALTER TABLE public.ad_slots 
ADD COLUMN IF NOT EXISTS price_sol numeric(18,9),
ADD COLUMN IF NOT EXISTS total_paid_sol numeric(18,9),
ADD COLUMN IF NOT EXISTS sol_transaction_hash text;

-- Create index for SOL transaction hash
CREATE INDEX IF NOT EXISTS idx_ad_slots_sol_hash ON public.ad_slots(sol_transaction_hash);

-- 3. Update booster_packs with correct SOL pricing
UPDATE public.booster_packs 
SET 
  price_usd = CASE 
    WHEN id = '2x-1h' THEN 1.00  -- ~0.01 SOL at $100 SOL
    WHEN id = '4x-4h' THEN 3.00  -- ~0.03 SOL at $100 SOL
    ELSE price_usd
  END
WHERE id IN ('2x-1h', '4x-4h');

-- Add SOL pricing columns to booster_packs
ALTER TABLE public.booster_packs 
ADD COLUMN IF NOT EXISTS price_sol numeric(18,9);

-- Set SOL prices for boosters
UPDATE public.booster_packs 
SET price_sol = CASE 
  WHEN id = '2x-1h' THEN 0.01
  WHEN id = '4x-4h' THEN 0.03
  ELSE 0.01
END;

-- 4. Create function to get weekly SOL earnings from all sources
CREATE OR REPLACE FUNCTION get_weekly_sol_earnings()
RETURNS numeric AS $$
DECLARE
  total_earnings numeric := 0;
  featured_earnings numeric := 0;
  banner_earnings numeric := 0;
  booster_earnings numeric := 0;
  one_week_ago timestamp with time zone;
BEGIN
  one_week_ago := now() - interval '7 days';
  
  -- Get earnings from sol_payments table (if it has data)
  SELECT COALESCE(SUM(amount_sol), 0) INTO total_earnings
  FROM public.sol_payments 
  WHERE created_at >= one_week_ago;
  
  -- If sol_payments table is empty, calculate from individual tables
  IF total_earnings = 0 THEN
    -- Featured ads earnings
    SELECT COALESCE(SUM(total_paid_sol), 0) INTO featured_earnings
    FROM public.featured_ads 
    WHERE created_at >= one_week_ago AND is_approved = true;
    
    -- Banner ads earnings (use price_sol if available, fallback to convert from TON)
    SELECT COALESCE(SUM(COALESCE(total_paid_sol, price_sol, ton_amount * 0.1)), 0) INTO banner_earnings
    FROM public.ad_slots 
    WHERE created_at >= one_week_ago AND is_approved = true;
    
    -- Booster earnings (calculate from user_boosters and booster_packs)
    SELECT COALESCE(SUM(bp.price_sol), 0) INTO booster_earnings
    FROM public.user_boosters ub
    JOIN public.booster_packs bp ON ub.booster_pack_id = bp.id
    WHERE ub.purchased_at >= one_week_ago;
    
    total_earnings := featured_earnings + banner_earnings + booster_earnings;
  END IF;
  
  RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- 5. Update community pot function to use 40% and new earnings calculation
CREATE OR REPLACE FUNCTION get_community_pot_amount()
RETURNS numeric AS $$
DECLARE
  weekly_earnings numeric;
BEGIN
  weekly_earnings := get_weekly_sol_earnings();
  RETURN weekly_earnings * 0.4; -- 40% of weekly earnings
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to populate sol_payments from existing data
CREATE OR REPLACE FUNCTION populate_sol_payments_from_existing()
RETURNS void AS $$
BEGIN
  -- Insert featured ads payments
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
    AND NOT EXISTS (
      SELECT 1 FROM public.sol_payments sp 
      WHERE sp.transaction_hash = fa.transaction_hash
    );

  -- Insert booster payments (using transaction_hash from user_boosters)
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
    'booster_recipient', -- You may want to update this
    'unknown'
  FROM public.user_boosters ub
  JOIN public.booster_packs bp ON ub.booster_pack_id = bp.id
  WHERE ub.transaction_hash IS NOT NULL 
    AND bp.price_sol > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.sol_payments sp 
      WHERE sp.transaction_hash = ub.transaction_hash
    );

  -- Log the population
  INSERT INTO public.system_logs (action, details, created_at)
  VALUES ('populate_payments', 'Populated sol_payments from existing data', now());
END;
$$ LANGUAGE plpgsql;

-- 7. Run the population function
SELECT populate_sol_payments_from_existing();

-- 8. Add RLS policies for sol_payments
ALTER TABLE public.sol_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sol_payments_read_policy" ON public.sol_payments
  FOR SELECT USING (true);

CREATE POLICY "sol_payments_insert_policy" ON public.sol_payments
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR true);

-- 9. Add comments for clarity
COMMENT ON TABLE public.sol_payments IS 'Centralized SOL payment tracking for all payment types';
COMMENT ON COLUMN public.sol_payments.payment_type IS 'Type: booster, banner_ad, featured_ad';
COMMENT ON COLUMN public.sol_payments.reference_id IS 'References the specific booster/ad record';

COMMENT ON COLUMN public.booster_packs.price_sol IS 'Price in SOL: 0.01 for 2x-1h, 0.03 for 4x-4h';
COMMENT ON COLUMN public.ad_slots.price_sol IS 'Price in SOL for banner ads';
COMMENT ON COLUMN public.ad_slots.total_paid_sol IS 'Total amount paid in SOL';
