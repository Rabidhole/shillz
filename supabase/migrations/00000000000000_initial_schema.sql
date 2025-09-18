-- Drop existing tables and functions if they exist
DROP TABLE IF EXISTS shills CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_token_total_shills() CASCADE;
DROP FUNCTION IF EXISTS update_user_tier() CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_username TEXT UNIQUE NOT NULL,
    wallet_address TEXT UNIQUE,
    tier TEXT DEFAULT 'degen' CHECK (tier IN ('degen', 'chad', 'mofo', 'legend')),
    total_shills INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create tokens table
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contract_address TEXT NOT NULL,
    chain TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    total_shills INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(contract_address, chain)
);

-- Create shills table
CREATE TABLE shills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX idx_tokens_total_shills ON tokens(total_shills DESC);
CREATE INDEX idx_users_total_shills ON users(total_shills DESC);
CREATE INDEX idx_shills_created_at ON shills(created_at DESC);

-- Create function to update token total_shills
CREATE OR REPLACE FUNCTION update_token_total_shills()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tokens SET total_shills = total_shills + 1 WHERE id = NEW.token_id;
        UPDATE users SET total_shills = total_shills + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tokens SET total_shills = total_shills - 1 WHERE id = OLD.token_id;
        UPDATE users SET total_shills = total_shills - 1 WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating token total_shills
CREATE TRIGGER update_total_shills
AFTER INSERT OR DELETE ON shills
FOR EACH ROW
EXECUTE FUNCTION update_token_total_shills();

-- Create function to update user tier based on total_shills
CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_shills >= 1000 THEN
        NEW.tier = 'legend';
    ELSIF NEW.total_shills >= 500 THEN
        NEW.tier = 'mofo';
    ELSIF NEW.total_shills >= 100 THEN
        NEW.tier = 'chad';
    ELSE
        NEW.tier = 'degen';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating user tier
CREATE TRIGGER update_tier
BEFORE UPDATE OF total_shills ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_tier();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE shills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all users" ON tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read access for all users" ON shills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Enable update for user themselves" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users" ON tokens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users" ON shills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);