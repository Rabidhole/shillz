-- Clean up unused tables after migration to new structure
-- This migration removes old tables that are no longer used

-- Drop old user tables (replaced by new 'users' table)
DROP TABLE IF EXISTS public.users_new CASCADE;

-- Drop old token tables (replaced by 'tokens_new')
DROP TABLE IF EXISTS public.tokens CASCADE;

-- Drop old shill tables (replaced by 'shills_new')
DROP TABLE IF EXISTS public.shills CASCADE;

-- Drop old leaderboard tables (replaced by 'leaderboard_snapshots_new')
DROP TABLE IF EXISTS public.leaderboard_snapshots CASCADE;

-- Note: leaderboard_snapshots_new is still used in some hooks, so we keep it

-- Drop any old functions that reference deleted tables
DROP FUNCTION IF EXISTS update_token_total_shills() CASCADE;
DROP FUNCTION IF EXISTS update_user_tier() CASCADE;

-- Clean up any orphaned indexes
DROP INDEX IF EXISTS idx_tokens_total_shills;
DROP INDEX IF EXISTS idx_users_total_shills;
DROP INDEX IF EXISTS idx_shills_created_at;

-- Note: We keep the following tables as they are still in use:
-- - users (new table with wallet_address, daily_shills, weekly_shills)
-- - tokens_new (with hot_shills column)
-- - shills_new
-- - booster_packs
-- - user_boosters
-- - sol_payments
-- - invoices
-- - ad_slots
-- - ad_pricing
-- - featured_ads
-- - pot_snapshots
-- - pot_snapshot_winners
-- - system_logs
