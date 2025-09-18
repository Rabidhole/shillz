-- This migration requires manual review and execution
-- Please review each section carefully before running

-- Step 1: Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS void AS $$
BEGIN
    -- Keep hourly data for 2 days
    DELETE FROM leaderboard_snapshots 
    WHERE time_window = 'hour' 
    AND snapshot_time < NOW() - INTERVAL '2 days';
    
    -- Keep daily data for 2 weeks
    DELETE FROM leaderboard_snapshots 
    WHERE time_window = 'day' 
    AND snapshot_time < NOW() - INTERVAL '2 weeks';
    
    -- Keep weekly data for 2 months
    DELETE FROM leaderboard_snapshots 
    WHERE time_window = 'week' 
    AND snapshot_time < NOW() - INTERVAL '2 months';
    
    -- Keep monthly data for 1 year
    DELETE FROM leaderboard_snapshots 
    WHERE time_window = 'month' 
    AND snapshot_time < NOW() - INTERVAL '1 year';
    
    -- all_time data is never deleted
END;
$$ LANGUAGE plpgsql;

-- Step 2: Enable pg_cron (requires superuser privileges)
-- Uncomment and run separately after reviewing:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 3: Schedule the jobs (run after enabling pg_cron)
/*
-- Leaderboard updates
SELECT cron.schedule('update_hourly_leaderboard', '0 * * * *', $$SELECT create_leaderboard_snapshot('hour')$$);
SELECT cron.schedule('update_daily_leaderboard', '0 0 * * *', $$SELECT create_leaderboard_snapshot('day')$$);
SELECT cron.schedule('update_weekly_leaderboard', '0 0 * * 0', $$SELECT create_leaderboard_snapshot('week')$$);
SELECT cron.schedule('update_monthly_leaderboard', '0 0 1 * *', $$SELECT create_leaderboard_snapshot('month')$$);
SELECT cron.schedule('update_alltime_leaderboard', '0 */6 * * *', $$SELECT create_leaderboard_snapshot('all_time')$$);

-- Cleanup job
SELECT cron.schedule('cleanup_old_snapshots', '0 1 * * *', $$SELECT cleanup_old_snapshots()$$);
*/

-- Step 4: Initial population (run after all above steps are complete)
/*
SELECT create_leaderboard_snapshot('hour');
SELECT create_leaderboard_snapshot('day');
SELECT create_leaderboard_snapshot('week');
SELECT create_leaderboard_snapshot('month');
SELECT create_leaderboard_snapshot('all_time');
*/
