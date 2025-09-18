export type TimeWindow = 'hour' | 'day' | 'week' | 'month' | 'all_time';

export interface LeaderboardSnapshot {
    id: string;
    token_id: string;
    time_window: TimeWindow;
    position: number;
    shill_count: number;
    shill_change: number;
    snapshot_time: string;
}

export interface LeaderboardEntry extends LeaderboardSnapshot {
    token_name: string;
    token_image: string;
    chain: string;
}
