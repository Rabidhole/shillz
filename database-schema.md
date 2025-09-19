# Shillz Database Schema

This document describes the actual database schema structure for the Shillz application as it exists in Supabase.

## Core Tables

### users_new
```sql
CREATE TABLE public.users_new (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  telegram_username text NOT NULL DEFAULT ''::text,
  tier text NOT NULL DEFAULT 'degen'::text,
  total_shills bigint NOT NULL DEFAULT '0'::bigint,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_new_pkey PRIMARY KEY (id),
  CONSTRAINT users_new_telegram_username_key UNIQUE (telegram_username)
);
```

**Key Points:**
- `id`: UUID primary key, auto-generated
- `telegram_username`: Unique text field, defaults to empty string
- `tier`: Text field with default 'degen' (values: 'degen', 'chad', 'mofo', 'legend')
- `total_shills`: BigInt counter, defaults to 0
- `created_at`: Timestamp, auto-generated

### tokens_new
```sql
CREATE TABLE public.tokens_new (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  contract_address text NOT NULL,
  chain text NOT NULL,
  description text NULL,
  image_url text NULL,
  total_shills bigint NULL DEFAULT '0'::bigint,
  name text NULL,
  CONSTRAINT tokens_new_pkey PRIMARY KEY (id),
  CONSTRAINT tokens_contract_chain_unique UNIQUE (contract_address, chain),
  CONSTRAINT tokens_new_contract_address_key UNIQUE (contract_address)
);
```

**Key Points:**
- `id`: UUID primary key, auto-generated
- `contract_address`: Required text, unique
- `chain`: Required text
- `name`: Nullable text
- `description`: Nullable text
- `image_url`: Nullable text
- `total_shills`: BigInt counter, nullable, defaults to 0
- Unique constraint on (contract_address, chain) combination

## Advertisement System

### ad_slots
```sql
CREATE TABLE public.ad_slots (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL,
  telegram_handle text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_ton numeric(10,9) NOT NULL,
  payment_id text NOT NULL,
  ton_amount numeric(10,9) NOT NULL,
  is_active boolean NULL DEFAULT true,
  is_approved boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT ad_slots_pkey PRIMARY KEY (id)
);
```

### ad_pricing
```sql
CREATE TABLE public.ad_pricing (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  duration_days integer NOT NULL,
  base_price_usd numeric(10,2) NOT NULL,
  multiplier numeric(4,2) NULL DEFAULT 1.0,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT ad_pricing_pkey PRIMARY KEY (id)
);
```

## Booster System

### booster_packs
```sql
CREATE TABLE public.booster_packs (
  id text NOT NULL,
  name text NOT NULL,
  description text NULL,
  price_usd numeric(10,2) NOT NULL,
  multiplier numeric(4,2) NOT NULL,
  duration_hours integer NOT NULL,
  max_uses integer NULL,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT booster_packs_pkey PRIMARY KEY (id)
);
```

**Key Points:**
- `id`: Text primary key (not UUID) - uses values like '2x-1h', '4x-4h'
- `price_usd`: Numeric price in USD (not TON)
- `multiplier`: Numeric multiplier (e.g., 2.0, 4.0)
- `duration_hours`: Integer duration

### user_boosters
```sql
CREATE TABLE public.user_boosters (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NULL,
  booster_pack_id text NULL,
  purchased_at timestamp with time zone NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean NULL DEFAULT true,
  transaction_hash text NULL,
  CONSTRAINT user_boosters_pkey PRIMARY KEY (id),
  CONSTRAINT user_boosters_booster_pack_id_fkey FOREIGN KEY (booster_pack_id) REFERENCES booster_packs(id),
  CONSTRAINT user_boosters_user_id_fkey FOREIGN KEY (user_id) REFERENCES users_new(id) ON DELETE CASCADE
);
```

**Key Points:**
- `user_id`: References `users_new.id`, nullable
- `booster_pack_id`: References `booster_packs.id` (text), nullable
- `purchased_at`: Auto-generated timestamp
- `expires_at`: Required timestamp
- `transaction_hash`: Nullable text (not `payment_id`)
- Unique constraint: Only one active booster per user

## Important Notes

1. **Table Naming**: The application uses `_new` suffixed tables (`users_new`, `tokens_new`, etc.)

2. **ID Types**: 
   - Most tables use UUID primary keys
   - `booster_packs` uses text IDs for easier reference

3. **Foreign Key Relationships**:
   - `user_boosters.user_id` → `users_new.id`
   - `user_boosters.booster_pack_id` → `booster_packs.id`

4. **TypeScript Integration**:
   - Remove generic `<Database>` typing from Supabase clients
   - Use `createClient()` without generics to avoid type conflicts
   - Field names and nullability must match exactly

5. **Common Pitfalls**:
   - Don't assume field names (e.g., `payment_id` vs `transaction_hash`)
   - Check nullable vs required fields
   - Verify foreign key relationships exist before inserting

## Usage in TypeScript

```typescript
// Correct way to create Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Example insert that works
await supabaseAdmin
  .from('users_new')
  .insert({
    telegram_username: 'user123'
    // tier and total_shills have defaults
    // id and created_at are auto-generated
  })
```
