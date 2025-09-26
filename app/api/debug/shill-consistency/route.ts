import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentWeekPeriod } from '@/lib/weekly-period'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    
    console.log('Weekly period:', { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() })
    
    // Get all shills in the current week
    const { data: allShills, error: shillsError } = await supabaseAdmin
      .from('shills_new')
      .select('id, user_id, token_id, created_at')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    
    if (shillsError) {
      return NextResponse.json({ error: shillsError.message }, { status: 500 })
    }
    
    console.log('Total shills in week:', allShills?.length || 0)
    
    // Count shills per user
    const userShillCounts: { [userId: string]: number } = {}
    const tokenShillCounts: { [tokenId: string]: number } = {}
    
    allShills?.forEach(shill => {
      if (shill.user_id) {
        userShillCounts[shill.user_id] = (userShillCounts[shill.user_id] || 0) + 1
      }
      tokenShillCounts[shill.token_id] = (tokenShillCounts[shill.token_id] || 0) + 1
    })
    
    // Get user details
    const userIds = Object.keys(userShillCounts)
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address, weekly_shills')
      .in('id', userIds)
    
    // Get token details
    const tokenIds = Object.keys(tokenShillCounts)
    const { data: tokens } = await supabaseAdmin
      .from('tokens_new')
      .select('id, name, hot_shills')
      .in('id', tokenIds)
    
    // Sort by shill count
    const topUsers = Object.entries(userShillCounts)
      .map(([userId, count]) => {
        const user = users?.find(u => u.id === userId)
        return {
          userId,
          wallet_address: user?.wallet_address || 'unknown',
          calculated_shills: count,
          db_weekly_shills: user?.weekly_shills || 0
        }
      })
      .sort((a, b) => b.calculated_shills - a.calculated_shills)
      .slice(0, 5)
    
    const topTokens = Object.entries(tokenShillCounts)
      .map(([tokenId, count]) => {
        const token = tokens?.find(t => t.id === tokenId)
        return {
          tokenId,
          name: token?.name || 'unknown',
          calculated_shills: count,
          db_hot_shills: token?.hot_shills || 0
        }
      })
      .sort((a, b) => b.calculated_shills - a.calculated_shills)
      .slice(0, 5)
    
    return NextResponse.json({
      success: true,
      weeklyPeriod: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString()
      },
      totalShills: allShills?.length || 0,
      topUsers,
      topTokens,
      summary: {
        totalUserShills: Object.values(userShillCounts).reduce((sum, count) => sum + count, 0),
        totalTokenShills: Object.values(tokenShillCounts).reduce((sum, count) => sum + count, 0),
        uniqueUsers: Object.keys(userShillCounts).length,
        uniqueTokens: Object.keys(tokenShillCounts).length
      }
    })
    
  } catch (error) {
    console.error('Error in shill consistency check:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
