-- Create indexes for better query performance
CREATE INDEX idx_tokens_total_shills ON tokens_new(total_shills DESC);
CREATE INDEX idx_users_total_shills ON users_new(total_shills DESC);
CREATE INDEX idx_shills_created_at ON shills_new(created_at DESC);
CREATE INDEX idx_leaderboard_snapshots_window_time ON leaderboard_snapshots_new(time_window, snapshot_time DESC);

-- Create unique constraint for contract address and chain
ALTER TABLE tokens_new ADD CONSTRAINT tokens_contract_chain_unique UNIQUE(contract_address, chain);

-- Create foreign key constraints
ALTER TABLE shills_new 
    ADD CONSTRAINT fk_shills_user 
    FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE;

ALTER TABLE shills_new 
    ADD CONSTRAINT fk_shills_token 
    FOREIGN KEY (token_id) REFERENCES tokens_new(id) ON DELETE CASCADE;

ALTER TABLE leaderboard_snapshots_new 
    ADD CONSTRAINT fk_leaderboard_token 
    FOREIGN KEY (token_id) REFERENCES tokens_new(id) ON DELETE CASCADE;
