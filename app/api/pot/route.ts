import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'
import { getCurrentWeekPeriod } from '@/lib/weekly-period'

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

    // Always use manual calculation (database function uses old logic)
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    console.log('Current week period:', {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString()
    })
    
    // Final correct approach: 
    // - Boosters: Only count from sol_payments with payment_type='booster' (by creation date)
    // - Banner ads: Count from ad_slots table by start_date (ignore sol_payments banner_ad entries)
    // - Featured ads: Count from featured_ads table by start_date (ignore sol_payments featured_ad entries)
    
    // 1. Calculate booster earnings from sol_payments (ONLY boosters, by creation date)
    const { data: boosterPayments } = await supabaseAdmin
      .from('sol_payments')
      .select('amount_sol')
      .eq('payment_type', 'booster')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    
    const boosterEarnings = boosterPayments?.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount_sol) || 0)
    }, 0) || 0
    
    // 2. Calculate banner ad earnings from ad_slots table (by start_date only, ignore sol_payments)
    const { data: bannerAds } = await supabaseAdmin
      .from('ad_slots')
      .select('total_paid_sol, price_sol, start_date')
      .eq('is_approved', true) // Only count approved ads
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    // 3. Calculate featured ad earnings from featured_ads table (by start_date only, ignore sol_payments)
    const { data: featuredAds } = await supabaseAdmin
      .from('featured_ads')
      .select('total_paid_sol, start_date')
      .eq('is_approved', true) // Only count approved ads
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    const bannerEarnings = bannerAds?.reduce((sum, ad) => {
      return sum + (parseFloat(ad.total_paid_sol) || parseFloat(ad.price_sol) || 0)
    }, 0) || 0
    const featuredEarnings = featuredAds?.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0) || 0
    
    weeklyEarnings = boosterEarnings + bannerEarnings + featuredEarnings
    
    console.log('Correct calculation by start_date:', {
      boosterEarnings: boosterEarnings,
      bannerEarnings,
      featuredEarnings,
      totalEarnings: weeklyEarnings,
      weekPeriod: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      }
    })

    // Calculate pot amount (40% of weekly earnings)
    potAmount = weeklyEarnings * 0.4

    console.log('Pot calculation:', {
      weeklyEarnings,
      potAmount,
      percentage: 40
    })

    // Use manual calculation only (database function uses old logic)
    console.log('Using manual calculation only')

    // Get recent SOL payments for additional context (current week only)
    const { data: recentPayments, error: paymentsError } = await supabaseAdmin
      .from('sol_payments')
      .select('amount_sol, amount_usd, created_at, sol_usd_price')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (paymentsError) {
      console.error('Error getting recent payments:', paymentsError)
    }

    // Get current SOL price from live API (for display purposes only)
    const currentSolPrice = await fetchSolUsdPrice()
    
    // Calculate USD values for display
    const potAmountUsd = potAmount * currentSolPrice
    const goalUsd = potAmountUsd // Dynamic goal = pot amount
    const progress = 1.0 // Always 100% since pot is exactly 40% of earnings

    console.log('Final pot calculation:', {
      potAmountSol: potAmount,
      potAmountUsd,
      currentSolPrice,
      weeklyEarnings
    })

    // Return pot amount in SOL as the primary value
    return NextResponse.json({
      pot: {
        sol: potAmount, // Primary value: SOL amount
        usd: potAmountUsd, // Secondary value: USD equivalent
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


