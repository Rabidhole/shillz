export type UserTier = 'degen' | 'chad' | 'mofo' | 'legend';
export type TimeWindow = 'hour' | 'day';

export interface User {
    id: string;
    telegram_username: string;
    wallet_address: string;
    tier: UserTier;
    total_shills: number;
    created_at: string | null;
}

export interface Token {
    id: string;
    name: string | null;
    contract_address: string;
    chain: string;
    description: string | null;
    image_url: string | null;
    total_shills: number | null;
    created_at: string;
}

export interface Shill {
    id: string;
    user_id: string;
    token_id: string;
    created_at: string;
}

export interface LeaderboardSnapshot {
    id: string;
    token_id: string;
    time_window: TimeWindow;
    position: number;
    shill_count: number;
    shill_change: number;
    snapshot_time: string;
}

export interface HotToken extends Token {
    hot_shills: number;
    hot_rank: number;
}

export interface AdSlot {
    id: string;
    title: string;
    image_url: string;
    link_url: string;
    telegram_handle: string;
    start_date: string;
    end_date: string;
    price_ton: number;
    payment_id: string;
    ton_amount: number;
    is_active: boolean | null;
    is_approved: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface AdPricing {
    id: string;
    duration_days: number;
    base_price_usd: number;
    multiplier: number | null;
    is_active: boolean | null;
    created_at: string | null;
}

export interface BoosterPack {
    id: string;
    name: string;
    description: string | null;
    price_usd: number;
    multiplier: number;
    duration_hours: number;
    max_uses: number | null;
    is_active: boolean | null;
    created_at: string | null;
}

export interface UserBooster {
    id: string;
    user_id: string | null;
    booster_pack_id: string | null;
    purchased_at: string | null;
    expires_at: string;
    is_active: boolean | null;
    transaction_hash: string | null;
}

export interface Database {
    public: {
        Tables: {
            users_new: {
                Row: User;
                Insert: Omit<User, 'id' | 'created_at' | 'total_shills' | 'tier'>;
                Update: Partial<Omit<User, 'id' | 'created_at'>>;
            };
            tokens_new: {
                Row: Token;
                Insert: Omit<Token, 'id' | 'created_at' | 'total_shills'>;
                Update: Partial<Omit<Token, 'id' | 'created_at'>>;
            };
            shills_new: {
                Row: Shill;
                Insert: Omit<Shill, 'id' | 'created_at'>;
                Update: Partial<Omit<Shill, 'id' | 'created_at'>>;
            };
            leaderboard_snapshots_new: {
                Row: LeaderboardSnapshot;
                Insert: Omit<LeaderboardSnapshot, 'id' | 'snapshot_time'>;
                Update: Partial<Omit<LeaderboardSnapshot, 'id' | 'snapshot_time'>>;
            };
            ad_slots: {
                Row: AdSlot;
                Insert: Omit<AdSlot, 'id' | 'created_at' | 'updated_at' | 'is_approved' | 'is_active'>;
                Update: Partial<Omit<AdSlot, 'id' | 'created_at'>>;
            };
            ad_pricing: {
                Row: AdPricing;
                Insert: Omit<AdPricing, 'id' | 'created_at' | 'is_active'>;
                Update: Partial<Omit<AdPricing, 'id' | 'created_at'>>;
            };
            booster_packs: {
                Row: BoosterPack;
                Insert: Omit<BoosterPack, 'id' | 'created_at' | 'is_active'>;
                Update: Partial<Omit<BoosterPack, 'id' | 'created_at'>>;
            };
            user_boosters: {
                Row: UserBooster;
                Insert: Omit<UserBooster, 'id' | 'purchased_at'>;
                Update: Partial<Omit<UserBooster, 'id' | 'purchased_at'>>;
            };
        };
    };
}