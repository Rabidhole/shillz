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

function normalizeUsername(input: string | null | undefined): string {
  const raw = (input || '').trim()
  const isDev = process.env.NODE_ENV === 'development'
  if (!raw) return isDev ? '@dev-anonymous' : 'anonymous'
  if (raw.startsWith('@')) return raw
  return isDev ? `@dev-${raw}` : raw
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provided = searchParams.get('user')
    const username = normalizeUsername(provided)

    // Top 10 shillers by total_shills
    const { data: topUsers, error: topErr } = await supabaseAdmin
      .from('users_new')
      .select('telegram_username, total_shills')
      .order('total_shills', { ascending: false })
      .limit(10)

    if (topErr) {
      return NextResponse.json({ error: topErr.message }, { status: 400 })
    }

    // Current user's row
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users_new')
      .select('telegram_username, total_shills')
      .eq('telegram_username', username)
      .single()

    if (userErr && userErr.code !== 'PGRST116') {
      return NextResponse.json({ error: userErr.message }, { status: 400 })
    }

    const currentUser = userRow || null
    let currentRank: number | null = null

    if (currentUser) {
      // Count users with strictly greater total_shills
      const { count, error: countErr } = await supabaseAdmin
        .from('users_new')
        .select('*', { count: 'exact', head: true })
        .gt('total_shills', currentUser.total_shills)

      if (countErr) {
        return NextResponse.json({ error: countErr.message }, { status: 400 })
      }

      currentRank = (count || 0) + 1
    }

    return NextResponse.json({
      top: topUsers || [],
      currentUser: currentUser ? { username: currentUser.telegram_username, total_shills: currentUser.total_shills } : null,
      currentRank
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}


