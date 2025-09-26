-- Add missing sol_usd_price column to pot_snapshots table
ALTER TABLE public.pot_snapshots 
ADD COLUMN IF NOT EXISTS sol_usd_price numeric(10,2) DEFAULT 200;

-- Add comment for the column
COMMENT ON COLUMN public.pot_snapshots.sol_usd_price IS 'SOL price in USD at the time of snapshot';
