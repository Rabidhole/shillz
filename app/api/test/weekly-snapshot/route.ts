import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'

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

    // Get current SOL price for accurate calculation
    const solUsdPrice = await fetchSolUsdPrice()
    console.log('Current SOL price for snapshot:', solUsdPrice)

    // Calculate weekly earnings manually (bypass database function with old logic)
    const { getCurrentWeekPeriod } = await import('@/lib/weekly-period')
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    
    // Final correct logic: Only boosters from sol_payments, ads from individual tables by start_date
    const { data: boosterPayments } = await supabaseAdmin
      .from('sol_payments')
      .select('amount_sol')
      .eq('payment_type', 'booster')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    
    const { data: bannerAds } = await supabaseAdmin
      .from('ad_slots')
      .select('total_paid_sol, price_sol')
      .eq('is_approved', true)
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    const { data: featuredAds } = await supabaseAdmin
      .from('featured_ads')
      .select('total_paid_sol')
      .eq('is_approved', true)
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    const boosterEarnings = boosterPayments?.reduce((sum, payment) => sum + (parseFloat(payment.amount_sol) || 0), 0) || 0
    const bannerEarnings = bannerAds?.reduce((sum, ad) => {
      return sum + (parseFloat(ad.total_paid_sol) || parseFloat(ad.price_sol) || 0)
    }, 0) || 0
    const featuredEarnings = featuredAds?.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0) || 0
    
    const manualWeeklyEarnings = boosterEarnings + bannerEarnings + featuredEarnings
    const manualPotAmount = manualWeeklyEarnings * 0.4
    
    console.log('Manual weekly earnings calculation:', {
      boosterEarnings,
      bannerEarnings,
      featuredEarnings,
      manualWeeklyEarnings,
      manualPotAmount
    })

    // Now test the weekly snapshot function (but it will use the old database logic)
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

    // Update snapshot with correct manual calculations
    try {
      const { error: updateError } = await supabaseAdmin
        .from('pot_snapshots')
        .update({ 
          sol_usd_price: solUsdPrice,
          pot_usd: manualPotAmount * solUsdPrice,
          total_amount_sol: manualPotAmount,
          weekly_earnings_sol: manualWeeklyEarnings
        })
        .eq('id', snapshotId)
      
      if (updateError) {
        console.error('Error updating snapshot with correct values:', updateError)
      } else {
        console.log('Updated snapshot with correct manual calculations')
      }
    } catch (error) {
      console.error('Error updating snapshot:', error)
    }

    // Fetch the created snapshot
    const { data: snapshot, error: fetchError } = await supabaseAdmin
      .from('pot_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    if (fetchError) {
      console.error('Error fetching snapshot:', fetchError)
    }

    // Update winners with correct prize amounts based on manual pot calculation
    try {
      const { data: winnersToUpdate, error: fetchWinnersError } = await supabaseAdmin
        .from('pot_snapshot_winners')
        .select('id, position')
        .eq('snapshot_id', snapshotId)

      if (!fetchWinnersError && winnersToUpdate) {
        for (const winner of winnersToUpdate) {
          const position = winner.position
          let percentage = 0
          
          // Calculate correct percentage based on position
          switch (position) {
            case 1: percentage = 0.30; break  // 30%
            case 2: percentage = 0.20; break  // 20%
            case 3: percentage = 0.15; break  // 15%
            case 4: percentage = 0.10; break  // 10%
            case 5: percentage = 0.08; break  // 8%
            case 6: percentage = 0.06; break  // 6%
            case 7: percentage = 0.04; break  // 4%
            case 8: percentage = 0.03; break  // 3%
            case 9: percentage = 0.02; break  // 2%
            case 10: percentage = 0.02; break // 2%
            default: percentage = 0
          }
          
          const correctPrizeSol = manualPotAmount * percentage
          const correctPrizeUsd = correctPrizeSol * solUsdPrice
          
          await supabaseAdmin
            .from('pot_snapshot_winners')
            .update({
              projected_prize_sol: correctPrizeSol,
              projected_prize_usd: correctPrizeUsd,
              prize_percentage: percentage * 100
            })
            .eq('id', winner.id)
        }
        console.log('Updated winners with correct prize amounts')
      }
    } catch (error) {
      console.error('Error updating winners:', error)
    }

    // Fetch the updated winners
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

    console.log('Updated snapshot winners:', winners)

    return NextResponse.json({
      success: true,
      message: 'Weekly snapshot test completed',
      results: {
        snapshotId,
        snapshot,
        winners: winners || [],
        solUsdPrice,
        manualCalculation: {
          boosterEarnings,
          bannerEarnings,
          featuredEarnings,
          weeklyEarnings: manualWeeklyEarnings,
          potAmount: manualPotAmount,
          note: "This is the correct calculation using proper timing logic"
        },
        databaseCalculation: {
          weeklyEarnings: snapshot?.weekly_earnings_sol || 0,
          potAmount: snapshot?.total_amount_sol || 0,
          note: "This is from the database function (may use old logic)"
        },
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

async function getPotAmountUsd(solUsdPrice: number): Promise<number> {
  try {
    // Use the same correct timing logic as the main pot API
    const { getCurrentWeekPeriod } = await import('@/lib/weekly-period')
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    
    // 1. Calculate booster earnings from sol_payments (by creation date)
    const { data: boosterPayments } = await supabaseAdmin
      .from('sol_payments')
      .select('amount_sol')
      .eq('payment_type', 'booster')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    
    const boosterEarnings = boosterPayments?.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount_sol) || 0)
    }, 0) || 0
    
    // 2. Calculate banner ad earnings from ad_slots table (by start_date, ignore sol_payments)
    const { data: bannerAds } = await supabaseAdmin
      .from('ad_slots')
      .select('total_paid_sol, price_sol')
      .eq('is_approved', true)
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    // 3. Calculate featured ad earnings from featured_ads table (by start_date, ignore sol_payments)
    const { data: featuredAds } = await supabaseAdmin
      .from('featured_ads')
      .select('total_paid_sol')
      .eq('is_approved', true)
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    const bannerEarnings = bannerAds?.reduce((sum, ad) => {
      return sum + (parseFloat(ad.total_paid_sol) || parseFloat(ad.price_sol) || 0)
    }, 0) || 0
    const featuredEarnings = featuredAds?.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0) || 0
    
    const weeklyEarnings = boosterEarnings + bannerEarnings + featuredEarnings
    const potAmountSol = weeklyEarnings * 0.4 // 40% of weekly earnings
    
    console.log('Weekly snapshot pot calculation:', {
      boosterEarnings,
      bannerEarnings, 
      featuredEarnings,
      weeklyEarnings,
      potAmountSol,
      potAmountUsd: potAmountSol * solUsdPrice
    })
    
    return potAmountSol * solUsdPrice
  } catch (error) {
    console.error('Error calculating pot amount USD:', error)
    return 0
  }
}
