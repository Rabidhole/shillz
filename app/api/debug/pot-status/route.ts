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

export async function GET() {
  try {
    console.log('=== DEBUGGING POT STATUS ===')
    
    // Check if database functions exist
    const { data: functions, error: functionsError } = await supabaseAdmin
      .from('pg_proc')
      .select('proname')
      .in('proname', ['get_weekly_sol_earnings', 'get_community_pot_amount'])

    console.log('Available functions:', functions)

    // First, try to populate sol_payments from existing data
    try {
      await supabaseAdmin.rpc('populate_sol_payments_from_existing')
      console.log('Populated sol_payments from existing data')
    } catch (error) {
      console.log('Error populating payments (may already exist):', error)
    }

    // Check SOL payments table
    const { data: allPayments, error: allPaymentsError } = await supabaseAdmin
      .from('sol_payments')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('All SOL payments:', allPayments?.length || 0)
    console.log('Recent payments:', allPayments?.slice(0, 5))

    // Check payments from last week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: weeklyPayments, error: weeklyError } = await supabaseAdmin
      .from('sol_payments')
      .select('*')
      .gte('created_at', oneWeekAgo)

    console.log('Weekly payments:', weeklyPayments?.length || 0)

    // Calculate manual weekly earnings from sol_payments
    const solPaymentsEarnings = weeklyPayments?.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount_sol) || 0)
    }, 0) || 0

    // Also check individual tables for comparison
    const { data: featuredAds } = await supabaseAdmin
      .from('featured_ads')
      .select('total_paid_sol, created_at')
      .gte('created_at', oneWeekAgo)

    const { data: userBoosters } = await supabaseAdmin
      .from('user_boosters')
      .select('purchased_at, booster_pack_id')
      .gte('purchased_at', oneWeekAgo)

    const { data: boosterPacks } = await supabaseAdmin
      .from('booster_packs')
      .select('id, price_sol')

    // Calculate earnings from individual tables
    const featuredEarnings = featuredAds?.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0) || 0
    
    const boosterEarnings = userBoosters?.reduce((sum, ub) => {
      const pack = boosterPacks?.find(bp => bp.id === ub.booster_pack_id)
      return sum + (parseFloat(pack?.price_sol) || 0)
    }, 0) || 0

    const totalManualEarnings = featuredEarnings + boosterEarnings

    console.log('Earnings breakdown:', {
      solPaymentsEarnings,
      featuredEarnings,
      boosterEarnings,
      totalManualEarnings
    })

    // Try calling the database functions
    let weeklyEarningsResult = null
    let potAmountResult = null
    
    try {
      const { data: weeklyData, error: weeklyErr } = await supabaseAdmin
        .rpc('get_weekly_sol_earnings')
      weeklyEarningsResult = { data: weeklyData, error: weeklyErr }
    } catch (err) {
      weeklyEarningsResult = { error: err }
    }

    try {
      const { data: potData, error: potErr } = await supabaseAdmin
        .rpc('get_community_pot_amount')
      potAmountResult = { data: potData, error: potErr }
    } catch (err) {
      potAmountResult = { error: err }
    }

    // Get current SOL price
    const currentSolPrice = await fetchSolUsdPrice()

    // Calculate pot amounts using the best available earnings
    const bestEarnings = Math.max(solPaymentsEarnings, totalManualEarnings)
    const potAmountSol = bestEarnings * 0.4 // 40% of weekly earnings
    const potAmountUsd = potAmountSol * currentSolPrice

    console.log('Calculated pot:', {
      solPaymentsEarnings,
      totalManualEarnings,
      bestEarnings,
      potAmountSol,
      potAmountUsd,
      solPrice: currentSolPrice
    })

    return NextResponse.json({
      debug: {
        functions: functions || [],
        functionsError: functionsError?.message,
        allPaymentsCount: allPayments?.length || 0,
        weeklyPaymentsCount: weeklyPayments?.length || 0,
        oneWeekAgo,
        manualWeeklyEarnings,
        currentSolPrice,
        potAmountSol,
        potAmountUsd
      },
      databaseFunctions: {
        weeklyEarnings: weeklyEarningsResult,
        potAmount: potAmountResult
      },
      payments: {
        all: allPayments || [],
        weekly: weeklyPayments || []
      },
      calculations: {
        solPaymentsEarnings,
        featuredEarnings,
        boosterEarnings,
        totalManualEarnings,
        bestEarnings,
        potPercentage: 40,
        potAmountSol,
        potAmountUsd,
        solUsdPrice: currentSolPrice
      },
      tables: {
        featuredAds: featuredAds || [],
        userBoosters: userBoosters || [],
        boosterPacks: boosterPacks || []
      }
    })

  } catch (error) {
    console.error('Error in pot status debug:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}
