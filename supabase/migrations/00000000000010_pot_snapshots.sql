-- Pot snapshots for manual payouts
create table if not exists pot_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pot_usd numeric(12,2) not null,
  goal_usd numeric(12,2) not null,
  wallet_address text not null,
  wallet_balance_ton numeric(18,9) not null,
  wallet_balance_usd numeric(14,2) not null,
  ton_usd numeric(10,4) not null
);

create table if not exists pot_snapshot_winners (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references pot_snapshots(id) on delete cascade,
  username text not null,
  rank int not null,
  total_shills bigint not null,
  projected_prize_usd numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_pot_snapshot_winners_snapshot on pot_snapshot_winners(snapshot_id);

-- RLS disabled for simplicity for now (service role writes)
alter table pot_snapshots enable row level security;
alter table pot_snapshot_winners enable row level security;

drop policy if exists pot_snapshots_read on pot_snapshots;
create policy pot_snapshots_read on pot_snapshots for select using (true);

drop policy if exists pot_snapshot_winners_read on pot_snapshot_winners;
create policy pot_snapshot_winners_read on pot_snapshot_winners for select using (true);


