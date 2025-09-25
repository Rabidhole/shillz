import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function POST() {
  try {
    console.log('=== TESTING WEEKLY SNAPSHOT SYSTEM ===')
    
    // First, populate sol_payments from existing data
    try {
      await supabaseAdmin.rpc('populate_sol_payments_from_existing')
      console.log('Populated sol_payments from existing data')
    } catch (error) {
      console.log('Error populating payments (may already exist):', error)
    }
    
    // Check current users and their weekly shills
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('wallet_address, weekly_shills, daily_shills, total_shills')
      .order('weekly_shills', { ascending: false })
      .limit(15)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }

    console.log('Current users (top 15 by weekly shills):', users)

    // Check if we have any users with weekly shills
    const usersWithWeeklyShills = users?.filter(u => u.weekly_shills > 0) || []
    console.log('Users with weekly shills:', usersWithWeeklyShills.length)

    if (usersWithWeeklyShills.length === 0) {
      // Create some test weekly shills for testing
      console.log('No users with weekly shills found. Creating test data...')
      
      if (users && users.length > 0) {
        // Update first few users with some weekly shills for testing
        for (let i = 0; i < Math.min(5, users.length); i++) {
          const testWeeklyShills = 10 - (i * 2) + Math.floor(Math.random() * 5)
          await supabaseAdmin
            .from('users')
            .update({ 
              weekly_shills: testWeeklyShills,
              daily_shills: Math.floor(testWeeklyShills / 2)
            })
            .eq('wallet_address', users[i].wallet_address)
          
          console.log(`Updated ${users[i].wallet_address} with ${testWeeklyShills} weekly shills`)
        }
      }
    }

    // Now test the weekly snapshot function
    console.log('Calling take_weekly_snapshot() function...')
    const { data: snapshotId, error: snapshotError } = await supabaseAdmin
      .rpc('take_weekly_snapshot')

    if (snapshotError) {
      console.error('Error creating snapshot:', snapshotError)
      return NextResponse.json({ 
        error: snapshotError.message,
        testData: {
          usersFound: users?.length || 0,
          usersWithWeeklyShills: usersWithWeeklyShills.length
        }
      }, { status: 500 })
    }

    console.log('Snapshot created with ID:', snapshotId)

    // Fetch the created snapshot
    const { data: snapshot, error: fetchError } = await supabaseAdmin
      .from('pot_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    if (fetchError) {
      console.error('Error fetching snapshot:', fetchError)
    }

    // Fetch the winners
    const { data: winners, error: winnersError } = await supabaseAdmin
      .from('pot_snapshot_winners')
      .select(`
        *,
        users!inner(wallet_address)
      `)
      .eq('snapshot_id', snapshotId)
      .order('position', { ascending: true })

    if (winnersError) {
      console.error('Error fetching winners:', winnersError)
    }

    console.log('Snapshot winners:', winners)

    return NextResponse.json({
      success: true,
      message: 'Weekly snapshot test completed',
      results: {
        snapshotId,
        snapshot,
        winners: winners || [],
        testData: {
          totalUsers: users?.length || 0,
          usersWithWeeklyShills: usersWithWeeklyShills.length,
          topUsers: users?.slice(0, 5) || []
        }
      }
    })

  } catch (error) {
    console.error('Error in weekly snapshot test:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}
