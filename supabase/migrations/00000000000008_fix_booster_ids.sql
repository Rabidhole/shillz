-- First drop the foreign key constraint
ALTER TABLE user_boosters DROP CONSTRAINT IF EXISTS user_boosters_booster_pack_id_fkey;

-- Delete existing data since we're changing ID types
DELETE FROM user_boosters;
DELETE FROM booster_packs;

-- Now modify the column types
ALTER TABLE booster_packs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE booster_packs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE user_boosters ALTER COLUMN booster_pack_id TYPE TEXT USING booster_pack_id::text;

-- Insert boosters with fixed IDs
INSERT INTO booster_packs (id, name, description, price_usd, multiplier, duration_hours, max_uses)
VALUES 
  (
    '2x-1h',
    'Quick Boost',
    'Double your shill power for 1 hour! Perfect for quick pumps.',
    0.99, -- $0.99
    2.0,
    1,
    NULL
  ),
  (
    '4x-4h',
    'Power Boost',
    'Quadruple your shill power for 4 hours! Best value for serious shillers.',
    2.99, -- $2.99
    4.0,
    4,
    NULL
  );

-- Re-add the foreign key constraint
ALTER TABLE user_boosters 
  ADD CONSTRAINT user_boosters_booster_pack_id_fkey 
  FOREIGN KEY (booster_pack_id) 
  REFERENCES booster_packs(id);