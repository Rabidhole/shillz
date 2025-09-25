-- Targeted cleanup based on actual database state and usage
-- Remove only the tables that are confirmed unused

-- Drop the compatibility view (not used)
DROP VIEW IF EXISTS public.users_new_compat CASCADE;

-- Drop the hot_tokens table if it exists (not used based on code analysis)
DROP TABLE IF EXISTS public.hot_tokens CASCADE;

-- Clean up any orphaned functions or triggers
DROP FUNCTION IF EXISTS update_token_total_shills() CASCADE;
DROP FUNCTION IF EXISTS update_user_tier() CASCADE;

-- Add comments to clarify which tables are kept and why:
COMMENT ON TABLE public.ad_pricing IS 'Used for ad pricing tiers - referenced in /api/ads/pricing';
COMMENT ON TABLE public.ad_slots IS 'Used for banner ads - actively used';
COMMENT ON TABLE public.booster_packs IS 'Used for booster definitions - heavily referenced';
COMMENT ON TABLE public.featured_ads IS 'Used for featured ad spots - actively used';
COMMENT ON TABLE public.leaderboard_snapshots_new IS 'Used in hooks - keep for now (empty but referenced)';
COMMENT ON TABLE public.pot_snapshot_winners IS 'Used for community pot winners - will be populated by cron jobs';
COMMENT ON TABLE public.pot_snapshots IS 'Used for community pot snapshots - will be populated by cron jobs';
COMMENT ON TABLE public.shills_new IS 'Core table - stores all shill records (user_id, token_id)';
COMMENT ON TABLE public.system_logs IS 'Used for system operation logging - will be populated by cron jobs';
COMMENT ON TABLE public.tokens_new IS 'Core table - all token data';
COMMENT ON TABLE public.user_boosters IS 'Used for user booster purchases - actively used';
COMMENT ON TABLE public.users IS 'Main users table with wallet addresses and shill tracking';

-- Summary of kept tables:
-- ✅ ad_pricing (used in pricing API)
-- ✅ ad_slots (banner ads)
-- ✅ booster_packs (booster definitions - heavily used)
-- ✅ featured_ads (featured ads)
-- ✅ leaderboard_snapshots_new (referenced in hooks)
-- ✅ pot_snapshot_winners (will be populated by Sunday cron)
-- ✅ pot_snapshots (will be populated by Sunday cron)
-- ✅ shills_new (core shill tracking)
-- ✅ system_logs (will be populated by cron jobs)
-- ✅ tokens_new (core token data)
-- ✅ user_boosters (user purchases)
-- ✅ users (main user table)

-- ❌ Removed:
-- - users_new_compat (compatibility view - not used)
-- - hot_tokens (if exists - not used in current code)
