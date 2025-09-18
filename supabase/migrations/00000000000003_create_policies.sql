-- Enable Row Level Security
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE shills_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots_new ENABLE ROW LEVEL SECURITY;

-- Create policies for users_new
CREATE POLICY "Enable read access for all users" ON users_new 
    FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON users_new 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for user themselves" ON users_new 
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id);

-- Create policies for tokens_new
CREATE POLICY "Enable read access for all users" ON tokens_new 
    FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON tokens_new 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

-- Create policies for shills_new
CREATE POLICY "Enable read access for all users" ON shills_new 
    FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON shills_new 
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Create policies for leaderboard_snapshots_new
CREATE POLICY "Enable read access for all users" ON leaderboard_snapshots_new 
    FOR SELECT TO authenticated 
    USING (true);

-- Create policy for admin functions on leaderboard
CREATE POLICY "Enable admin functions" ON leaderboard_snapshots_new 
    FOR ALL TO service_role 
    USING (true);
