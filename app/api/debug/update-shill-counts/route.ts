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
    
    console.log('Updating shill counts with weekly period:', { 
      weekStart: weekStart.toISOString(), 
      weekEnd: weekEnd.toISOString() 
    })
    
    // Update all users with their weekly shills
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
    
    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }
    
    console.log(`Updating ${users?.length || 0} users...`)
    
    for (const user of users || []) {
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
      
      await supabaseAdmin
        .from('users')
        .update({ 
          total_shills: totalShills || 0,
          weekly_shills: weeklyShills || 0
        })
        .eq('id', user.id)
    }
    
    // Update all tokens with their hot shills
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('tokens_new')
      .select('id')
    
    if (tokensError) {
      return NextResponse.json({ error: tokensError.message }, { status: 500 })
    }
    
    console.log(`Updating ${tokens?.length || 0} tokens...`)
    
    for (const token of tokens || []) {
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
          hot_shills: hotShills || 0
        })
        .eq('id', token.id)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Shill counts updated successfully',
      weeklyPeriod: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString()
      },
      updatedUsers: users?.length || 0,
      updatedTokens: tokens?.length || 0
    })
    
  } catch (error) {
    console.error('Error updating shill counts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
