-- Create table to track SOL payments for community pot calculation
CREATE TABLE IF NOT EXISTS sol_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users_new(id) ON DELETE CASCADE,
  booster_pack_id TEXT NOT NULL REFERENCES booster_packs(id),
  amount_sol DECIMAL(18,9) NOT NULL, -- SOL amount paid
  amount_usd DECIMAL(12,2) NOT NULL, -- USD equivalent at time of payment
  sol_usd_price DECIMAL(10,4) NOT NULL, -- SOL price in USD at time of payment
  recipient_address TEXT NOT NULL, -- SOL address that received the payment
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sol_payments_created_at ON sol_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_sol_payments_user_id ON sol_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sol_payments_booster_pack_id ON sol_payments(booster_pack_id);
CREATE INDEX IF NOT EXISTS idx_sol_payments_transaction_hash ON sol_payments(transaction_hash);

-- Enable RLS
ALTER TABLE sol_payments ENABLE ROW LEVEL SECURITY;

-- Create policy for reading payments (public read access)
CREATE POLICY sol_payments_read ON sol_payments FOR SELECT USING (true);

-- Create policy for inserting payments (service role only)
CREATE POLICY sol_payments_insert ON sol_payments FOR INSERT WITH CHECK (true);

-- Add function to calculate weekly earnings
CREATE OR REPLACE FUNCTION get_weekly_sol_earnings()
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
AS $$
DECLARE
  weekly_earnings DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(amount_usd), 0)
  INTO weekly_earnings
  FROM sol_payments
  WHERE created_at >= NOW() - INTERVAL '7 days';
  
  RETURN weekly_earnings;
END;
$$;

-- Add function to calculate community pot (20% of weekly earnings)
CREATE OR REPLACE FUNCTION get_community_pot_amount()
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
AS $$
DECLARE
  weekly_earnings DECIMAL(12,2);
  pot_amount DECIMAL(12,2);
BEGIN
  SELECT get_weekly_sol_earnings() INTO weekly_earnings;
  pot_amount := weekly_earnings * 0.20; -- 20% of weekly earnings
  
  RETURN pot_amount;
END;
$$;
