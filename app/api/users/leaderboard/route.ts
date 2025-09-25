import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

function normalizeWalletAddress(input: string | null | undefined): string {
  const raw = (input || '').trim()
  if (!raw) {
    return 'anonymous'
  }
  // Remove @ prefix if present
  return raw.startsWith('@') ? raw.substring(1) : raw
}

function getWalletDisplayName(walletAddress: string): string {
  if (walletAddress === 'anonymous') {
    return 'Anonymous'
  }
  if (walletAddress.length > 10) {
    return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
  }
  return walletAddress
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provided = searchParams.get('user')
    const walletAddress = normalizeWalletAddress(provided)

    // Top 10 shillers by weekly_shills
    const { data: topUsers, error: topErr } = await supabaseAdmin
      .from('users')
      .select('wallet_address, total_shills, daily_shills, weekly_shills')
      .order('weekly_shills', { ascending: false })
      .limit(10)

    if (topErr) {
      return NextResponse.json({ error: topErr.message }, { status: 400 })
    }

    // Current user's row
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('wallet_address, total_shills, daily_shills, weekly_shills')
      .eq('wallet_address', walletAddress)
      .single()

    if (userErr && userErr.code !== 'PGRST116') {
      return NextResponse.json({ error: userErr.message }, { status: 400 })
    }

    // If user doesn't exist yet, create a placeholder with 0 shills so they see their rank
    let currentUser = userRow || null
    if (!currentUser) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('users')
        .insert({ 
          wallet_address: walletAddress, 
          tier: 'degen', 
          total_shills: 0,
          daily_shills: 0,
          weekly_shills: 0
        })
        .select('wallet_address, total_shills, daily_shills, weekly_shills')
        .single()

      if (createErr && createErr.code !== '23505') { // ignore conflict if created concurrently
        return NextResponse.json({ error: createErr.message }, { status: 400 })
      }

      currentUser = created || { wallet_address: walletAddress, total_shills: 0, daily_shills: 0, weekly_shills: 0 }
    }
    let currentRank: number | null = null

    if (currentUser) {
      // Count users with strictly greater weekly_shills
      const { count, error: countErr } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('weekly_shills', currentUser.weekly_shills)

      if (countErr) {
        return NextResponse.json({ error: countErr.message }, { status: 400 })
      }

      currentRank = (count || 0) + 1
    }

    return NextResponse.json({
      top: (topUsers || []).map(user => ({
        username: getWalletDisplayName(user.wallet_address),
        total_shills: user.total_shills,
        daily_shills: user.daily_shills,
        weekly_shills: user.weekly_shills
      })),
      currentUser: currentUser ? {
        username: getWalletDisplayName(currentUser.wallet_address),
        total_shills: currentUser.total_shills,
        daily_shills: currentUser.daily_shills,
        weekly_shills: currentUser.weekly_shills
      } : null,
      currentRank
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}


