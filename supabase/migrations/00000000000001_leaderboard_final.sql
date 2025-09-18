-- Create leaderboard_snapshots table to store historical data
CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
    time_window TEXT NOT NULL CHECK (time_window IN ('hour', 'day', 'week', 'month', 'all_time')),
    position INTEGER NOT NULL,
    shill_count INTEGER NOT NULL,
    shill_change INTEGER NOT NULL, -- Change in shills since last snapshot
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(token_id, time_window, snapshot_time)
);

-- Create index for efficient querying
CREATE INDEX idx_leaderboard_snapshots_window_time 
ON leaderboard_snapshots(time_window, snapshot_time DESC);

-- Function to calculate shill changes and create snapshots
CREATE OR REPLACE FUNCTION create_leaderboard_snapshot(window_type TEXT)
RETURNS void AS $$
DECLARE
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate window_type
    IF window_type NOT IN ('hour', 'day', 'week', 'month', 'all_time') THEN
        RAISE EXCEPTION 'Invalid window_type. Must be one of: hour, day, week, month, all_time';
    END IF;

    -- Set window start based on time_window
    window_start := CASE window_type
        WHEN 'hour' THEN NOW() - INTERVAL '1 hour'
        WHEN 'day' THEN NOW() - INTERVAL '1 day'
        WHEN 'week' THEN NOW() - INTERVAL '1 week'
        WHEN 'month' THEN NOW() - INTERVAL '1 month'
        ELSE '1970-01-01'::TIMESTAMP -- all_time
    END;

    -- Insert new snapshots
    WITH ranked_tokens AS (
        SELECT 
            t.id as token_id,
            COUNT(s.id) as period_shills,
            ROW_NUMBER() OVER (ORDER BY COUNT(s.id) DESC) as position
        FROM tokens t
        LEFT JOIN shills s ON s.token_id = t.id 
            AND s.created_at >= window_start
        GROUP BY t.id
    ),
    previous_snapshot AS (
        SELECT 
            token_id,
            shill_count
        FROM leaderboard_snapshots
        WHERE time_window = window_type
        AND snapshot_time = (
            SELECT MAX(snapshot_time) 
            FROM leaderboard_snapshots 
            WHERE time_window = window_type
        )
    )
    INSERT INTO leaderboard_snapshots (
        token_id,
        time_window,
        position,
        shill_count,
        shill_change
    )
    SELECT 
        rt.token_id,
        window_type,
        rt.position,
        rt.period_shills,
        COALESCE(rt.period_shills - ps.shill_count, 0)
    FROM ranked_tokens rt
    LEFT JOIN previous_snapshot ps ON rt.token_id = ps.token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old snapshots (will be called via API)
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

-- Enable RLS for leaderboard_snapshots
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Enable read access for all users" 
ON leaderboard_snapshots FOR SELECT TO authenticated 
USING (true);

-- Create policy for admin functions
CREATE POLICY "Enable admin functions" 
ON leaderboard_snapshots 
FOR ALL 
TO service_role
USING (true);