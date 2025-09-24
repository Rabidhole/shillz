-- Create table for featured section ads (2 spots below "Hot Tokens" headline)
CREATE TABLE IF NOT EXISTS featured_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  project_url TEXT NOT NULL,
  project_logo_url TEXT,
  description TEXT,
  spot_number INTEGER NOT NULL CHECK (spot_number IN (1, 2)), -- Only 2 spots available
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_sol DECIMAL(18,9) NOT NULL DEFAULT 0.1, -- 0.1 SOL per day
  total_paid_sol DECIMAL(18,9) NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE, -- SOL transaction hash
  wallet_address TEXT NOT NULL, -- Wallet that paid
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_featured_ads_spot_date ON featured_ads(spot_number, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_featured_ads_active ON featured_ads(is_active, is_approved);
CREATE INDEX IF NOT EXISTS idx_featured_ads_transaction ON featured_ads(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_featured_ads_wallet ON featured_ads(wallet_address);

-- Function to check if a spot is available for a date range
CREATE OR REPLACE FUNCTION is_featured_spot_available(
  p_spot_number INTEGER,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the specific spot is available for the date range
  RETURN NOT EXISTS (
    SELECT 1 FROM featured_ads
    WHERE spot_number = p_spot_number
      AND is_approved = true
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

-- Function to get current active featured ads
CREATE OR REPLACE FUNCTION get_current_featured_ads()
RETURNS TABLE(
  id UUID,
  project_name TEXT,
  project_url TEXT,
  project_logo_url TEXT,
  description TEXT,
  spot_number INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.project_name,
    f.project_url,
    f.project_logo_url,
    f.description,
    f.spot_number
  FROM featured_ads f
  WHERE f.is_active = true
    AND f.is_approved = true
    AND f.start_date <= CURRENT_DATE
    AND f.end_date >= CURRENT_DATE
  ORDER BY f.spot_number ASC;
END;
$$;

-- Enable RLS
ALTER TABLE featured_ads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY featured_ads_read_policy ON featured_ads
  FOR SELECT USING (is_approved = true AND is_active = true);

CREATE POLICY featured_ads_insert_policy ON featured_ads
  FOR INSERT WITH CHECK (true);

CREATE POLICY featured_ads_update_policy ON featured_ads
  FOR UPDATE USING (auth.role() = 'service_role');

-- Insert default pricing (0.1 SOL per day)
-- This is handled in the application logic since it's a fixed price
