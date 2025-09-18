-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_multiplier(UUID);

-- Create booster_packs table
CREATE TABLE IF NOT EXISTS booster_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_ton DECIMAL(10,9) NOT NULL, -- TON has 9 decimal places
  multiplier DECIMAL(4,2) NOT NULL,
  duration_hours INTEGER NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_boosters table
CREATE TABLE IF NOT EXISTS user_boosters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  booster_pack_id UUID NOT NULL REFERENCES booster_packs(id),
  is_active BOOLEAN DEFAULT true,
  uses_remaining INTEGER,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_id TEXT NOT NULL, -- TON transaction ID
  ton_amount DECIMAL(10,9) NOT NULL, -- Amount paid in TON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_boosters_user_id ON user_boosters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_boosters_expires_at ON user_boosters(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_boosters_is_active ON user_boosters(is_active);
CREATE INDEX IF NOT EXISTS idx_user_boosters_payment_id ON user_boosters(payment_id);

-- Create partial unique index to ensure only one active booster per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_booster_per_user 
ON user_boosters (user_id)
WHERE is_active = true;

-- Function to get user's current multiplier
CREATE OR REPLACE FUNCTION get_user_multiplier(p_user_id UUID)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
AS $$
DECLARE
  booster_multiplier DECIMAL(4,2);
BEGIN
  -- Get the active booster multiplier (if any)
  SELECT bp.multiplier
  INTO booster_multiplier
  FROM user_boosters ub
  JOIN booster_packs bp ON bp.id = ub.booster_pack_id
  WHERE ub.user_id = p_user_id
    AND ub.is_active = true
    AND ub.expires_at > NOW()
  LIMIT 1;

  RETURN COALESCE(booster_multiplier, 1);
END;
$$;

-- Insert initial booster packs
INSERT INTO booster_packs (name, description, price_ton, multiplier, duration_hours, max_uses)
VALUES 
  (
    'Quick Boost',
    'Double your shill power for 1 hour! Perfect for quick pumps.',
    0.15, -- 0.15 TON ≈ $0.99 (at current rates)
    2.0,
    1,
    NULL
  ),
  (
    'Power Boost',
    'Quadruple your shill power for 4 hours! Best value for serious shillers.',
    0.4, -- 0.4 TON ≈ $2.99 (at current rates)
    4.0,
    4,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE booster_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_boosters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS booster_packs_read_policy ON booster_packs;
DROP POLICY IF EXISTS user_boosters_read_policy ON user_boosters;
DROP POLICY IF EXISTS user_boosters_insert_policy ON user_boosters;
DROP POLICY IF EXISTS user_boosters_update_policy ON user_boosters;

-- Create policies
CREATE POLICY booster_packs_read_policy ON booster_packs
  FOR SELECT USING (true);

CREATE POLICY user_boosters_read_policy ON user_boosters
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY user_boosters_insert_policy ON user_boosters
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY user_boosters_update_policy ON user_boosters
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Function to deactivate expired boosters
CREATE OR REPLACE FUNCTION deactivate_expired_boosters()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_boosters
  SET is_active = false
  WHERE is_active = true
    AND expires_at <= NOW();
END;
$$;