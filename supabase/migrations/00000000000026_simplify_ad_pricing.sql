-- Simplify ad pricing to flat rates - no tiers or discounts
-- Banner ads: 0.2 SOL per day
-- Featured ads: 0.1 SOL per day

-- Clear existing pricing tiers
DELETE FROM ad_pricing;

-- Insert simple flat rate pricing
INSERT INTO ad_pricing (duration_days, base_price_usd, multiplier, is_active)
VALUES 
  (1, 0.2, 1.0, true); -- 1 day: 0.2 SOL per day (no discounts)

-- Update ad_slots to use flat SOL pricing
ALTER TABLE ad_slots 
ALTER COLUMN price_sol SET DEFAULT 0.2;

-- Update featured_ads to use flat SOL pricing  
ALTER TABLE featured_ads 
ALTER COLUMN price_sol SET DEFAULT 0.1;

-- Add comment to clarify the simplified pricing
COMMENT ON TABLE ad_pricing IS 'Simplified flat rate pricing: 0.2 SOL/day for banner ads, 0.1 SOL/day for featured ads';
