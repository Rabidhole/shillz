# Shillz Database Tables Documentation

This document provides a comprehensive overview of all database tables in the Shillz platform, their purpose, usage patterns, and relationships.

## 📊 Database Overview

The Shillz platform uses **12 core tables** to manage users, tokens, shills, boosters, advertisements, and community rewards. The database is designed around wallet-based user identification with real-time shill tracking and weekly community pot distributions.

---

## 🔥 Core Tables

### 1. `users` - Main User Management
**Purpose**: Primary user table storing wallet addresses and shill statistics  
**Status**: ✅ **Heavily Used** - Core table  
**Key Features**: 
- Wallet-based user identification (no more Telegram usernames)
- Daily, weekly, and lifetime shill tracking
- Automatic tier calculation based on activity

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  tier text DEFAULT 'degen',
  total_shills bigint DEFAULT 0,
  daily_shills bigint DEFAULT 0,    -- Resets daily
  weekly_shills bigint DEFAULT 0,   -- Resets every Monday
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Usage Patterns**:
- **API Routes**: 15+ endpoints reference this table
- **Real-time Updates**: `useRealtimeUser.ts` hook
- **Leaderboard**: Ranked by `weekly_shills` for competitions
- **Reset Schedule**: 
  - `daily_shills` → Reset daily via `/api/cron/daily-reset`
  - `weekly_shills` → Reset Monday 00:00:01 via `/api/cron/weekly-reset`

### 2. `tokens_new` - Token Registry
**Purpose**: Master registry of all tokens that can be shilled  
**Status**: ✅ **Core Table** - Essential for platform operation  

```sql
CREATE TABLE tokens_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  contract_address text NOT NULL,
  chain text NOT NULL,
  description text,
  image_url text,
  total_shills bigint DEFAULT 0,     -- All-time shills
  hot_shills bigint DEFAULT 0,       -- Weekly shills (for ranking)
  created_at timestamptz DEFAULT now(),
  UNIQUE(contract_address, chain)
);
```

**Usage Patterns**:
- **Token Submission**: Users can add new tokens via `/api/tokens/submit`
- **Hot Ranking**: Ranked by `hot_shills` (weekly) for "Hot Tokens (7d)" leaderboard
- **Multi-chain Support**: Supports 15+ blockchains (Solana, Ethereum, Base, etc.)
- **Real-time Updates**: `useRealtimeToken.ts` hook

### 3. `shills_new` - Shill Activity Log
**Purpose**: Immutable log of every shill action performed  
**Status**: ✅ **Core Table** - 23+ code references  

```sql
CREATE TABLE shills_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),    -- NULL for anonymous shills
  token_id uuid REFERENCES tokens_new(id),
  created_at timestamptz DEFAULT now()
);
```

**Usage Patterns**:
- **Shill Recording**: Every shill action creates a record
- **Anonymous Support**: `user_id` can be NULL for non-connected users
- **Statistics Source**: Used to calculate daily/weekly/total shill counts
- **Real-time Updates**: Powers live leaderboard updates

---

## 🚀 Booster System Tables

### 4. `booster_packs` - Booster Definitions
**Purpose**: Defines available booster types and their properties  
**Status**: ✅ **Heavily Used** - 14+ code references  

```sql
CREATE TABLE booster_packs (
  id text PRIMARY KEY,              -- e.g., '2x-1h', '4x-4h'
  name text NOT NULL,
  description text,
  price_usd numeric(10,2),
  multiplier numeric(4,2),          -- e.g., 2.0, 4.0
  duration_hours integer,
  max_uses integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**Current Boosters**:
- **Quick Boost**: 2x multiplier, 1 hour, ~$1 (0.01 SOL)
- **Power Boost**: 4x multiplier, 4 hours, ~$3 (0.03 SOL)

### 5. `user_boosters` - User Booster Purchases
**Purpose**: Tracks individual booster purchases and their status  
**Status**: ✅ **Actively Used** - User purchase tracking  

```sql
CREATE TABLE user_boosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  booster_pack_id text REFERENCES booster_packs(id),
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  transaction_hash text UNIQUE       -- Prevents double-spending
);
```

**Business Logic**:
- **One Active Booster**: Users can only have one active booster at a time
- **Automatic Expiry**: Boosters auto-deactivate when `expires_at` is reached
- **SOL Payments**: Integrated with Solana blockchain verification

---

## 💰 Payment & Tracking Tables

### 6. `sol_payments` - SOL Payment Records
**Purpose**: Tracks all SOL payments for boosters and ads  
**Status**: ✅ **Core for Revenue** - Powers community pot  

```sql
CREATE TABLE sol_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash text UNIQUE NOT NULL,
  amount_sol numeric(18,9) NOT NULL,
  amount_usd numeric(10,2),
  sol_usd_price numeric(10,2),
  recipient_address text NOT NULL,
  sender_address text,
  payment_type text,                 -- 'booster', 'banner_ad', 'featured_ad'
  created_at timestamptz DEFAULT now()
);
```

**Revenue Tracking**:
- **Community Pot**: 40% of weekly earnings go to top shillers
- **Live Pricing**: Integrates with CoinGecko API for SOL/USD rates
- **Payment Types**: Boosters, banner ads, featured ads

---

## 📺 Advertisement System Tables

### 7. `ad_slots` - Banner Advertisement Slots
**Purpose**: Manages the main banner ad at the top of the platform  
**Status**: ✅ **Used** - Banner ad system  

```sql
CREATE TABLE ad_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text NOT NULL,
  telegram_handle text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_ton numeric(10,9),          -- Legacy TON pricing
  payment_id text,                  -- Transaction hash
  ton_amount numeric(10,9),         -- Amount paid
  is_active boolean DEFAULT true,
  is_approved boolean DEFAULT false, -- Requires admin approval
  created_at timestamptz DEFAULT now()
);
```

**Pricing Tiers**:
- **1 Day**: 0.2 SOL (~$20-30)
- **3 Days**: 0.56 SOL (~$56-84) - 7% discount
- **7 Days**: 1.26 SOL (~$126-189) - 10% discount

### 8. `ad_pricing` - Advertisement Pricing Tiers
**Purpose**: Stores dynamic pricing for different ad durations  
**Status**: ✅ **Used** - Referenced in `/api/ads/pricing`  

```sql
CREATE TABLE ad_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_days integer NOT NULL,
  base_price_usd numeric(10,2) NOT NULL,
  multiplier numeric(4,2) DEFAULT 1.0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### 9. `featured_ads` - Featured Advertisement Spots
**Purpose**: Manages the two small featured ad spots below "Hot Tokens"  
**Status**: ✅ **Actively Used** - Featured ads system  

```sql
CREATE TABLE featured_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  project_url text NOT NULL,
  project_logo_url text,
  description text,
  spot_number integer NOT NULL,      -- 1 or 2
  start_date date NOT NULL,
  end_date date NOT NULL,
  price_sol numeric(18,9) NOT NULL,
  total_paid_sol numeric(18,9) NOT NULL,
  transaction_hash text UNIQUE NOT NULL,
  wallet_address text NOT NULL,
  is_active boolean DEFAULT true,
  is_approved boolean DEFAULT false, -- Requires admin approval
  created_at timestamptz DEFAULT now()
);
```

**Pricing**: **0.1 SOL per day** (~$10-15) for each spot

---

## 🏆 Community Pot & Rewards Tables

### 10. `pot_snapshots` - Weekly Community Pot Snapshots
**Purpose**: Records weekly community pot amounts for distribution  
**Status**: ✅ **Will Be Populated** - Sunday midnight cron job  

```sql
CREATE TABLE pot_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount_sol numeric(18,9) NOT NULL,
  weekly_earnings_sol numeric(18,9) NOT NULL,
  snapshot_date timestamptz NOT NULL DEFAULT now()
);
```

**Automation**: 
- **Schedule**: Every Sunday at midnight
- **Calculation**: 40% of weekly SOL earnings
- **Distribution**: Manual process using snapshot data

### 11. `pot_snapshot_winners` - Weekly Top Shillers
**Purpose**: Records top 10 shillers for each weekly snapshot  
**Status**: ✅ **Will Be Populated** - Sunday midnight cron job  

```sql
CREATE TABLE pot_snapshot_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES pot_snapshots(id),
  user_id uuid REFERENCES users(id),
  weekly_shills bigint NOT NULL,
  position integer NOT NULL,        -- 1-10 ranking
  created_at timestamptz DEFAULT now()
);
```

**Prize Distribution**:
- **Top 10 Users**: Based on `weekly_shills` count
- **Prize Shares**: Fixed percentages (12%, 8%, 6%, 3%, 3%, 3%, 3%, 3%, 3%, 3%)

---

## 📋 System Management Tables

### 12. `system_logs` - System Operation Logs
**Purpose**: Logs automated system operations and cron job executions  
**Status**: ✅ **Will Be Populated** - Cron job logging  

```sql
CREATE TABLE system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,             -- 'weekly_reset', 'daily_reset', 'weekly_snapshot'
  details text,
  created_at timestamptz DEFAULT now()
);
```

**Logged Operations**:
- **Daily Reset**: Reset all `daily_shills` to 0
- **Weekly Reset**: Reset all `weekly_shills` to 0 (Monday 00:00:01)  
- **Weekly Snapshot**: Create pot snapshot and record winners (Sunday 11:59:59 PM)

### 13. `leaderboard_snapshots_new` - Leaderboard History
**Purpose**: Historical leaderboard data (legacy system)  
**Status**: ✅ **Referenced** - Used in hooks but may be deprecated  

**Note**: This table is referenced in `useRealtimeLeaderboard.ts` but may be phased out in favor of the new weekly snapshot system.

---

## 🔄 Automated Processes

### Cron Jobs Schedule
| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| **Daily Reset** | Daily 00:00 | `/api/cron/daily-reset` | Reset `users.daily_shills` |
| **Weekly Reset** | Monday 00:00:01 | `/api/cron/weekly-reset` | Reset `users.weekly_shills` |
| **Weekly Snapshot** | Sunday 23:59:59 | `/api/cron/sunday-snapshot` | Create pot snapshot & winners |
| **Cleanup** | Hourly | `/api/cron/cleanup` | Update hot tokens & user stats |

### Database Functions
- **`reset_daily_shills()`**: Resets all daily shill counts
- **`reset_weekly_shills()`**: Resets all weekly shill counts  
- **`take_weekly_snapshot()`**: Creates pot snapshot with top 10 winners
- **`get_weekly_sol_earnings()`**: Calculates weekly SOL revenue
- **`get_community_pot_amount()`**: Calculates 40% of weekly earnings

---

## 🔗 Table Relationships

```
users (1) ←→ (∞) user_boosters ←→ (1) booster_packs
users (1) ←→ (∞) shills_new ←→ (1) tokens_new
users (1) ←→ (∞) pot_snapshot_winners ←→ (1) pot_snapshots

sol_payments (transaction_hash) ←→ user_boosters (transaction_hash)
sol_payments (transaction_hash) ←→ ad_slots (payment_id)
sol_payments (transaction_hash) ←→ featured_ads (transaction_hash)
```

---

## 📈 Performance Considerations

### Key Indexes
- **`users.weekly_shills DESC`** - Leaderboard ranking
- **`users.wallet_address`** - User lookups
- **`tokens_new.hot_shills DESC`** - Hot tokens ranking
- **`shills_new.created_at DESC`** - Recent activity queries
- **`sol_payments.created_at`** - Revenue calculations

### Query Patterns
- **Real-time Leaderboards**: Query `users` by `weekly_shills DESC`
- **Hot Tokens**: Query `tokens_new` by `hot_shills DESC`
- **User Stats**: Aggregate `shills_new` by time periods
- **Revenue Tracking**: Sum `sol_payments.amount_sol` by date ranges

---

## 🗑️ Deprecated/Removed Tables

The following tables have been cleaned up:
- **`users_new`** → Replaced by `users`
- **`users_new_compat`** → Compatibility view (removed)
- **`tokens`** → Replaced by `tokens_new`
- **`shills`** → Replaced by `shills_new`
- **`leaderboard_snapshots`** → Replaced by `leaderboard_snapshots_new`
- **`hot_tokens`** → Functionality moved to `tokens_new.hot_shills`

---

## 🔧 Development Notes

### Environment Variables
- **`NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS`** - SOL payment recipient
- **`SUPABASE_SERVICE_ROLE_KEY`** - Database admin access
- **`NEXT_PUBLIC_SUPABASE_URL`** - Database connection

### Key Features
- **Wallet-Based Users**: No more Telegram dependency
- **Multi-chain Support**: 15+ blockchains supported
- **Real-time Updates**: Supabase real-time subscriptions
- **SOL Payments**: Solana blockchain integration
- **Admin Approval**: All ads require manual approval
- **Weekly Competitions**: Automatic pot distribution system

---

*Last Updated: December 2024*  
*Database Schema Version: v1.22*
