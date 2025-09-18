-- Create time window type for leaderboard periods
CREATE TYPE time_window AS ENUM ('hour', 'day', 'week', 'month', 'all_time');

-- Create leaderboard_snapshots table to store historical data
CREATE TABLE leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
    time_window time_window NOT NULL,
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
CREATE OR REPLACE FUNCTION create_leaderboard_snapshot(window_type time_window)
RETURNS void AS $$
DECLARE
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
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

-- Enable RLS for leaderboard_snapshots
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Enable read access for all users" 
ON leaderboard_snapshots FOR SELECT TO authenticated 
USING (true);
