-- Create new users table with proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  tier text NOT NULL DEFAULT 'degen'::text,
  total_shills bigint NOT NULL DEFAULT 0,
  daily_shills bigint NOT NULL DEFAULT 0,
  weekly_shills bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_wallet_address_key UNIQUE (wallet_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON public.users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_total_shills ON public.users(total_shills DESC);
CREATE INDEX IF NOT EXISTS idx_users_weekly_shills ON public.users(weekly_shills DESC);
CREATE INDEX IF NOT EXISTS idx_users_daily_shills ON public.users(daily_shills DESC);

-- Create function to reset weekly shills (called every Monday)
CREATE OR REPLACE FUNCTION reset_weekly_shills()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET weekly_shills = 0, updated_at = now();
  
  -- Log the reset
  INSERT INTO public.system_logs (action, details, created_at)
  VALUES ('weekly_reset', 'Reset all weekly_shills to 0', now());
END;
$$ LANGUAGE plpgsql;

-- Create function to reset daily shills (called every day)
CREATE OR REPLACE FUNCTION reset_daily_shills()
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET daily_shills = 0, updated_at = now();
  
  -- Log the reset
  INSERT INTO public.system_logs (action, details, created_at)
  VALUES ('daily_reset', 'Reset all daily_shills to 0', now());
END;
$$ LANGUAGE plpgsql;

-- Create system_logs table for tracking resets and snapshots
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_logs_pkey PRIMARY KEY (id)
);

-- Create function to take weekly snapshot (called every Sunday at 11:59:59 PM)
CREATE OR REPLACE FUNCTION take_weekly_snapshot()
RETURNS uuid AS $$
DECLARE
  snapshot_id uuid;
  pot_amount numeric;
  weekly_earnings numeric;
BEGIN
  -- Get weekly earnings from SOL payments
  SELECT COALESCE(SUM(amount_sol), 0) INTO weekly_earnings
  FROM public.sol_payments 
  WHERE created_at >= date_trunc('week', now() - interval '1 week')
    AND created_at < date_trunc('week', now());
  
  -- Calculate 40% of weekly earnings
  pot_amount := weekly_earnings * 0.4;
  
  -- Create snapshot
  INSERT INTO public.pot_snapshots (total_amount_sol, weekly_earnings_sol, snapshot_date)
  VALUES (pot_amount, weekly_earnings, now())
  RETURNING id INTO snapshot_id;
  
  -- Get top 10 users by weekly shills and add them as winners
  INSERT INTO public.pot_snapshot_winners (snapshot_id, user_id, weekly_shills, position)
  SELECT 
    snapshot_id,
    u.id,
    u.weekly_shills,
    ROW_NUMBER() OVER (ORDER BY u.weekly_shills DESC) as position
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

-- Create RLS policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view all user data (for leaderboard)
CREATE POLICY "Users can view all user data" ON public.users
  FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Service role can do everything
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
