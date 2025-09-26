import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentWeekPeriod } from '@/lib/weekly-period'
import { Database } from '@/app/types/database'

export const dynamic = 'force-dynamic'

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

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron or internal
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete shills older than 7 days
    const { error: deleteError } = await supabaseAdmin
      .from('shills_new')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (deleteError) {
      console.error('Error deleting old shills:', deleteError)
      return NextResponse.json(
        { error: deleteError.message }, 
        { status: 400 }
      )
    }

    // Update all tokens with their 24-hour shill counts
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('tokens_new')
      .select('id')

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError)
      return NextResponse.json(
        { error: tokensError.message }, 
        { status: 400 }
      )
    }

    // Update each token's total_shills with weekly count (for hot tokens)
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    
    for (const token of tokens) {
      // Get weekly shills for hot tokens ranking (using fixed weekly period)
      const { count: hotShills } = await supabaseAdmin
        .from('shills_new')
        .select('*', { count: 'exact', head: true })
        .eq('token_id', token.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())

      // Get total shills for the token
      const { count: totalShills } = await supabaseAdmin
        .from('shills_new')
        .select('*', { count: 'exact', head: true })
        .eq('token_id', token.id)

      await supabaseAdmin
        .from('tokens_new')
        .update({ 
          total_shills: totalShills || 0,
          hot_shills: hotShills || 0  // Store weekly shills as hot_shills
        })
        .eq('id', token.id)
    }

    // Update all users with their 24-hour shill counts and tiers
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: usersError.message }, 
        { status: 400 }
      )
    }

    // Update each user's daily_shills and weekly_shills
    for (const user of users) {
      // Get daily shills (last 24 hours)
      const { count: dailyShills } = await supabaseAdmin
        .from('shills_new')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      // Get weekly shills (using fixed weekly period)
      const { count: weeklyShills } = await supabaseAdmin
        .from('shills_new')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())

      // Get total shills (all time)
      const { count: totalShills } = await supabaseAdmin
        .from('shills_new')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const tier = getTier(totalShills || 0)

      await supabaseAdmin
        .from('users')
        .update({ 
          total_shills: totalShills || 0,
          daily_shills: dailyShills || 0,
          weekly_shills: weeklyShills || 0,
          tier
        })
        .eq('id', user.id)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Cleanup completed successfully'
    })
  } catch (error) {
    console.error('Error in cleanup route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}

function getTier(recentShills: number): 'degen' | 'chad' | 'mofo' | 'legend' {
  if (recentShills >= 100) return 'legend'
  if (recentShills >= 50) return 'mofo'
  if (recentShills >= 10) return 'chad'
  return 'degen'
}
