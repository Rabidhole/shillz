-- Add a function to calculate 24-hour shill counts
CREATE OR REPLACE FUNCTION get_24h_shill_count(target_token_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM shills_new
        WHERE token_id = target_token_id
        AND created_at >= NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- Add a function to calculate user 24-hour shill counts
CREATE OR REPLACE FUNCTION get_user_24h_shill_count(target_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM shills_new
        WHERE user_id = target_user_id
        AND created_at >= NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql;

-- Create a view for hot tokens (24-hour activity)
CREATE OR REPLACE VIEW hot_tokens AS
SELECT 
    t.*,
    get_24h_shill_count(t.id) as hot_shills,
    RANK() OVER (ORDER BY get_24h_shill_count(t.id) DESC) as hot_rank
FROM tokens_new t
WHERE get_24h_shill_count(t.id) > 0
ORDER BY hot_shills DESC;

-- Create a view for active users (24-hour activity)
CREATE OR REPLACE VIEW active_users AS
SELECT 
    u.*,
    get_user_24h_shill_count(u.id) as recent_shills,
    CASE 
        WHEN get_user_24h_shill_count(u.id) >= 100 THEN 'legend'
        WHEN get_user_24h_shill_count(u.id) >= 50 THEN 'mofo'
        WHEN get_user_24h_shill_count(u.id) >= 10 THEN 'chad'
        ELSE 'degen'
    END as current_tier
FROM users_new u
WHERE get_user_24h_shill_count(u.id) > 0
ORDER BY recent_shills DESC;

-- Create cleanup function for old shills
CREATE OR REPLACE FUNCTION cleanup_old_shills()
RETURNS void AS $$
BEGIN
    DELETE FROM shills_new 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    -- Update token total_shills to reflect 24h counts
    UPDATE tokens_new 
    SET total_shills = get_24h_shill_count(id);
    
    -- Update user total_shills to reflect 24h counts
    UPDATE users_new 
    SET total_shills = get_user_24h_shill_count(id),
        tier = CASE 
            WHEN get_user_24h_shill_count(id) >= 100 THEN 'legend'
            WHEN get_user_24h_shill_count(id) >= 50 THEN 'mofo'
            WHEN get_user_24h_shill_count(id) >= 10 THEN 'chad'
            ELSE 'degen'
        END;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for the views
CREATE POLICY "Enable read access for hot tokens view" 
ON tokens_new FOR SELECT TO public 
USING (true);

CREATE POLICY "Enable read access for active users view" 
ON users_new FOR SELECT TO public 
USING (true);
