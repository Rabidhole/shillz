import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function fetchTonUsdPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=TON', { cache: 'no-store' })
    const json = await res.json()
    const usd = parseFloat(json?.data?.rates?.USD)
    if (!isFinite(usd)) throw new Error('invalid price')
    return usd
  } catch {
    return 6.0
  }
}

async function fetchTonBalanceTon(address: string): Promise<number> {
  const url = `https://tonapi.io/v2/accounts/${address}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch TON balance')
  const json = await res.json()
  const nano = Number(json?.balance ?? 0)
  return nano / 1_000_000_000
}

export async function POST() {
  try {
    const trackWallet = process.env.TON_TRACK_WALLET
    const goalUsd = parseFloat(process.env.POT_GOAL_USD || '5000')
    if (!trackWallet) return NextResponse.json({ error: 'Missing TON_TRACK_WALLET' }, { status: 400 })

    const [tonUsd, balTon] = await Promise.all([
      fetchTonUsdPrice(),
      fetchTonBalanceTon(trackWallet)
    ])

    const walletUsd = balTon * tonUsd
    const potUsd = walletUsd * 0.10

    if (potUsd < goalUsd) {
      return NextResponse.json({ ok: false, reason: 'pot_below_goal', potUsd, goalUsd })
    }

    // Guard: check if a snapshot for this approximate state already exists (within 1% tolerance)
    const { data: existing } = await supabaseAdmin
      .from('pot_snapshots')
      .select('id, created_at, pot_usd')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      const last = existing[0]
      const diff = Math.abs((Number(last.pot_usd) - potUsd) / potUsd)
      if (diff < 0.01) {
        return NextResponse.json({ ok: true, snapshotId: last.id, skipped: 'already_snapshotted_recently' })
      }
    }

    // Build winners from total shills
    const { data: topUsers, error: topErr } = await supabaseAdmin
      .from('users_new')
      .select('telegram_username, total_shills')
      .order('total_shills', { ascending: false })
      .limit(100)

    if (topErr) return NextResponse.json({ error: topErr.message }, { status: 400 })

    // Example prize model: generate projected prizes but do not pay.
    // Keep it simple: top 10 fixed shares, others 0.
    const shares = [0.12, 0.08, 0.06, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03]

    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('pot_snapshots')
      .insert({
        pot_usd: potUsd.toFixed(2),
        goal_usd: goalUsd.toFixed(2),
        wallet_address: trackWallet,
        wallet_balance_ton: balTon.toFixed(9),
        wallet_balance_usd: walletUsd.toFixed(2),
        ton_usd: tonUsd.toFixed(4)
      })
      .select('id')
      .single()

    if (snapErr || !snapshot) return NextResponse.json({ error: snapErr?.message || 'snapshot_failed' }, { status: 400 })

    const winners = (topUsers || []).slice(0, 10).map((u, idx) => ({
      snapshot_id: snapshot.id,
      username: u.telegram_username,
      rank: idx + 1,
      total_shills: Number(u.total_shills || 0),
      projected_prize_usd: (potUsd * shares[idx]).toFixed(2)
    }))

    const { error: winErr } = await supabaseAdmin
      .from('pot_snapshot_winners')
      .insert(winners)

    if (winErr) return NextResponse.json({ error: winErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, snapshotId: snapshot.id, winners })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}


