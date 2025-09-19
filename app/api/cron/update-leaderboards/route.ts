import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/types/database'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function createHotSnapshot(timeWindow: 'hour' | 'day') {
  const windowStart = timeWindow === 'hour' 
    ? new Date(Date.now() - 60 * 60 * 1000) 
    : new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Get tokens with their shill counts for the time window
  const { data: tokens, error } = await supabaseAdmin
    .from('tokens_new')
    .select('id, name')

  if (error) throw error

  const tokenStats = await Promise.all(
    tokens.map(async (token) => {
      const { count } = await supabaseAdmin
        .from('shills_new')
        .select('*', { count: 'exact', head: true })
        .eq('token_id', token.id)
        .gte('created_at', windowStart.toISOString())

      return {
        token_id: token.id,
        shill_count: count || 0
      }
    })
  )

  // Sort by shill count and assign positions
  const rankedTokens = tokenStats
    .sort((a, b) => b.shill_count - a.shill_count)
    .map((token, index) => ({
      ...token,
      position: index + 1,
      time_window: timeWindow,
      shill_change: 0 // We'll calculate this later if needed
    }))

  // Insert snapshots
  const { error: insertError } = await supabaseAdmin
    .from('leaderboard_snapshots_new')
    .insert(rankedTokens)

  if (insertError) throw insertError
}

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentHour = new Date().getUTCHours()

    // Always update hourly hot tokens
    await createHotSnapshot('hour')

    // Update daily hot tokens at midnight UTC
    if (currentHour === 0) {
      await createHotSnapshot('day')
    }

    // Run cleanup every 6 hours
    if (currentHour % 6 === 0) {
      // Delete shills older than 7 days
      await supabaseAdmin
        .from('shills_new')
        .delete()
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Update token counts
      const { data: tokens } = await supabaseAdmin
        .from('tokens_new')
        .select('id')

      for (const token of tokens || []) {
        const { count: hotShills } = await supabaseAdmin
          .from('shills_new')
          .select('*', { count: 'exact', head: true })
          .eq('token_id', token.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        await supabaseAdmin
          .from('tokens_new')
          .update({ total_shills: hotShills || 0 })
          .eq('id', token.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating leaderboards:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}