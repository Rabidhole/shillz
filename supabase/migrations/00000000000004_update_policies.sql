-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON users_new;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users_new;
DROP POLICY IF EXISTS "Enable update for user themselves" ON users_new;
DROP POLICY IF EXISTS "Enable read access for all users" ON tokens_new;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tokens_new;
DROP POLICY IF EXISTS "Enable read access for all users" ON shills_new;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shills_new;

-- Create new policies that allow anonymous access
CREATE POLICY "Enable read access for all" ON users_new
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Enable insert for all" ON users_new
    FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON users_new
    FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "Enable read access for all" ON tokens_new
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Enable insert for service role" ON tokens_new
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON tokens_new
    FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "Enable read access for all" ON shills_new
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Enable insert for service role" ON shills_new
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Enable RLS on all tables
ALTER TABLE users_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE shills_new ENABLE ROW LEVEL SECURITY;
