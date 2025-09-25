-- Add unique constraint on contract_address only (not combined with chain)
-- This ensures each contract address can only exist once across all chains

-- First, remove the existing composite unique constraint
ALTER TABLE public.tokens_new 
DROP CONSTRAINT IF EXISTS tokens_contract_chain_unique;

-- Add unique constraint on contract_address only
ALTER TABLE public.tokens_new 
ADD CONSTRAINT tokens_contract_address_unique UNIQUE(contract_address);

-- Create index for better performance on contract_address lookups
CREATE INDEX IF NOT EXISTS idx_tokens_contract_address ON public.tokens_new(contract_address);
