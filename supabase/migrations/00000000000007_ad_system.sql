-- Drop existing tables and functions if they exist
DROP TABLE IF EXISTS ad_slots CASCADE;
DROP TABLE IF EXISTS ad_pricing CASCADE;
DROP FUNCTION IF EXISTS is_date_range_available(DATE, DATE, UUID);
DROP FUNCTION IF EXISTS get_current_ad();

-- Create ad_slots table for managing advertisement bookings
CREATE TABLE ad_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  telegram_handle TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_ton DECIMAL(10,9) NOT NULL,
  payment_id TEXT NOT NULL, -- TON transaction ID
  ton_amount DECIMAL(10,9) NOT NULL, -- Amount paid in TON
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ad_pricing table for dynamic pricing
CREATE TABLE ad_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duration_days INTEGER NOT NULL,
  base_price_usd DECIMAL(10,2) NOT NULL,
  multiplier DECIMAL(4,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ad_slots_dates ON ad_slots(start_date, end_date);
CREATE INDEX idx_ad_slots_active ON ad_slots(is_active, is_approved);
CREATE INDEX idx_ad_slots_payment_id ON ad_slots(payment_id);

-- Insert default pricing tiers
INSERT INTO ad_pricing (duration_days, base_price_usd, multiplier)
VALUES 
  (1, 49.99, 1.0),     -- 1 day: $49.99/day - no discount
  (3, 139.99, 0.93),   -- 3 days: $46.66/day - 7% discount
  (7, 314.99, 0.90),   -- 7 days: $44.99/day - 10% discount
  (14, 594.99, 0.85),  -- 14 days: $42.50/day - 15% discount
  (30, 1049.99, 0.70); -- 30 days: $34.99/day - 30% discount

-- Function to check if a date range is available
CREATE OR REPLACE FUNCTION is_date_range_available(
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if any approved ads overlap with the requested date range
  RETURN NOT EXISTS (
    SELECT 1 FROM ad_slots
    WHERE is_approved = true
      AND is_active = true
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (
        (start_date <= p_start_date AND end_date >= p_start_date) OR
        (start_date <= p_end_date AND end_date >= p_end_date) OR
        (start_date >= p_start_date AND end_date <= p_end_date)
      )
  );
END;
$$;

-- Function to get current active ad
CREATE OR REPLACE FUNCTION get_current_ad()
RETURNS TABLE(
  id UUID,
  title TEXT,
  image_url TEXT,
  link_url TEXT,
  start_date DATE,
  end_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.image_url,
    a.link_url,
    a.start_date,
    a.end_date
  FROM ad_slots a
  WHERE a.is_active = true
    AND a.is_approved = true
    AND a.start_date <= CURRENT_DATE
    AND a.end_date >= CURRENT_DATE
  ORDER BY a.start_date ASC
  LIMIT 1;
END;
$$;

-- Enable RLS
ALTER TABLE ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for ad_slots
CREATE POLICY ad_slots_read_policy ON ad_slots
  FOR SELECT USING (is_approved = true AND is_active = true);

CREATE POLICY ad_slots_insert_policy ON ad_slots
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR true);

CREATE POLICY ad_slots_update_policy ON ad_slots
  FOR UPDATE USING (auth.role() = 'service_role');

-- Create policies for ad_pricing
CREATE POLICY ad_pricing_read_policy ON ad_pricing
  FOR SELECT USING (is_active = true);