import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Public TON price source fallback
async function fetchTonUsdPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=TON', { cache: 'no-store' })
    if (!res.ok) throw new Error('price fetch failed')
    const json = await res.json()
    const usd = parseFloat(json?.data?.rates?.USD)
    if (!isFinite(usd)) throw new Error('invalid price')
    return usd
  } catch {
    // Fallback static value (avoid breaking UI)
    return 6.0
  }
}

// Simple TON balance fetch via tonapi.io (no key). Balance in nanotons.
async function fetchTonBalanceNano(address: string): Promise<bigint> {
  const url = `https://tonapi.io/v2/accounts/${address}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch TON balance')
  const json = await res.json()
  const balance = BigInt(json?.balance ?? 0)
  return balance
}

export async function GET() {
  try {
    let weeklyEarnings = 0
    let potAmount = 0

    // Try to get weekly earnings from database function, fall back to manual calculation
    try {
      const { data: weeklyData, error: earningsError } = await supabaseAdmin
        .rpc('get_weekly_sol_earnings')

      if (earningsError) {
        console.log('Database function not available, calculating manually:', earningsError.message)
        throw earningsError
      }
      
      weeklyEarnings = weeklyData || 0
    } catch (error) {
      console.log('Falling back to manual weekly earnings calculation')
      
      // Manual calculation: try sol_payments first, then fallback to individual tables
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Try sol_payments table
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from('sol_payments')
        .select('amount_sol')
        .gte('created_at', oneWeekAgo)

      if (paymentsError) {
        console.log('sol_payments table not available, calculating from individual tables')
        
        // Calculate from featured_ads
        const { data: featuredAds } = await supabaseAdmin
          .from('featured_ads')
          .select('total_paid_sol, created_at')
          .gte('created_at', oneWeekAgo)
        
        // Calculate from user_boosters + booster_packs
        const { data: userBoosters } = await supabaseAdmin
          .from('user_boosters')
          .select('purchased_at, booster_pack_id')
          .gte('purchased_at', oneWeekAgo)
        
        const { data: boosterPacks } = await supabaseAdmin
          .from('booster_packs')
          .select('id, price_sol')
        
        const featuredEarnings = featuredAds?.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0) || 0
        const boosterEarnings = userBoosters?.reduce((sum, ub) => {
          const pack = boosterPacks?.find(bp => bp.id === ub.booster_pack_id)
          return sum + (parseFloat(pack?.price_sol) || 0)
        }, 0) || 0
        
        weeklyEarnings = featuredEarnings + boosterEarnings
        
        console.log('Manual calculation from tables:', {
          featuredEarnings,
          boosterEarnings,
          totalEarnings: weeklyEarnings
        })
      } else {
        weeklyEarnings = payments?.reduce((sum, payment) => {
          return sum + (parseFloat(payment.amount_sol) || 0)
        }, 0) || 0
        
        console.log('Earnings from sol_payments table:', weeklyEarnings)
      }
    }

    // Calculate pot amount (40% of weekly earnings)
    potAmount = weeklyEarnings * 0.4

    console.log('Pot calculation:', {
      weeklyEarnings,
      potAmount,
      percentage: 40
    })

    // Try to get pot amount from database function, but we already calculated it manually
    try {
      const { data: dbPotAmount, error: potError } = await supabaseAdmin
        .rpc('get_community_pot_amount')
      
      if (!potError && dbPotAmount !== null) {
        potAmount = dbPotAmount
        console.log('Using database pot amount:', potAmount)
      }
    } catch (error) {
      console.log('Database pot function not available, using manual calculation')
    }

    // Get recent SOL payments for additional context
    const { data: recentPayments, error: paymentsError } = await supabaseAdmin
      .from('sol_payments')
      .select('amount_sol, amount_usd, created_at, sol_usd_price')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (paymentsError) {
      console.error('Error getting recent payments:', paymentsError)
    }

    // Get current SOL price from live API
    const currentSolPrice = await fetchSolUsdPrice()
    
    // Calculate USD values
    const potAmountUsd = potAmount * currentSolPrice
    const goalUsd = potAmountUsd // Dynamic goal = pot amount
    const progress = 1.0 // Always 100% since pot is exactly 40% of earnings

    console.log('Final pot calculation:', {
      potAmountSol: potAmount,
      potAmountUsd,
      currentSolPrice,
      weeklyEarnings
    })

    // Return in the same format as before for backward compatibility
    return NextResponse.json({
      pot: {
        usd: potAmountUsd,
        goalUsd,
        progress,
      },
      meta: {
        solUsdPrice: currentSolPrice,
        weeklyEarnings: weeklyEarnings || 0,
        percentage: 40, // 40% of weekly earnings
        updatedAt: new Date().toISOString(),
        recentPayments: recentPayments || []
      }
    })
  } catch (error) {
    console.error('Error fetching pot data:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}


