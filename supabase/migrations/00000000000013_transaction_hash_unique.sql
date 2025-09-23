-- Add unique constraint on transaction_hash to prevent double-spending
-- This is a critical security fix to prevent the same transaction from being used multiple times

-- First, clean up duplicate transaction hashes by keeping only the first occurrence
-- and deactivating the duplicates
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY transaction_hash ORDER BY created_at ASC) as rn
  FROM user_boosters 
  WHERE transaction_hash IS NOT NULL
)
UPDATE user_boosters 
SET is_active = false,
    updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE user_boosters 
ADD CONSTRAINT unique_transaction_hash UNIQUE (transaction_hash);

-- Add an index for better performance on transaction lookups
CREATE INDEX IF NOT EXISTS idx_user_boosters_transaction_hash ON user_boosters(transaction_hash);
