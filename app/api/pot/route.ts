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
    // Get weekly SOL earnings and calculate community pot (20% of weekly earnings)
    const { data: weeklyEarnings, error: earningsError } = await supabaseAdmin
      .rpc('get_weekly_sol_earnings')

    if (earningsError) {
      console.error('Error getting weekly earnings:', earningsError)
      // If the function doesn't exist, return 0 for now
      if (earningsError.message?.includes('function') || earningsError.message?.includes('does not exist')) {
        console.log('Database functions not yet created, using fallback values')
        const fallbackEarnings = 0
        const fallbackPot = 0
        const currentSolPrice = await fetchSolUsdPrice()
        
        return NextResponse.json({
          pot: {
            usd: fallbackPot,
            goalUsd: fallbackPot, // Dynamic goal = pot amount
            progress: 1.0, // Always 100% since pot is exactly 20% of earnings
          },
          meta: {
            solUsdPrice: currentSolPrice,
            weeklyEarnings: fallbackEarnings,
            percentage: 20,
            updatedAt: new Date().toISOString(),
            recentPayments: []
          }
        })
      }
      return NextResponse.json(
        { error: 'Failed to calculate weekly earnings' },
        { status: 500 }
      )
    }

    const { data: potAmount, error: potError } = await supabaseAdmin
      .rpc('get_community_pot_amount')

    if (potError) {
      console.error('Error getting community pot amount:', potError)
      // If the function doesn't exist, return 0 for now
      if (potError.message?.includes('function') || potError.message?.includes('does not exist')) {
        console.log('Database functions not yet created, using fallback values')
        const fallbackEarnings = weeklyEarnings || 0
        const fallbackPot = 0
        const currentSolPrice = await fetchSolUsdPrice()
        
        return NextResponse.json({
          pot: {
            usd: fallbackPot,
            goalUsd: fallbackPot, // Dynamic goal = pot amount
            progress: 1.0, // Always 100% since pot is exactly 20% of earnings
          },
          meta: {
            solUsdPrice: currentSolPrice,
            weeklyEarnings: fallbackEarnings,
            percentage: 20,
            updatedAt: new Date().toISOString(),
            recentPayments: []
          }
        })
      }
      return NextResponse.json(
        { error: 'Failed to calculate community pot' },
        { status: 500 }
      )
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
    
    // Dynamic goal: 20% of weekly earnings (the pot amount itself)
    const goalUsd = potAmount || 0
    const progress = 1.0 // Always 100% since pot is exactly 20% of earnings

    // Return in the same format as before for backward compatibility
    return NextResponse.json({
      pot: {
        usd: potAmount || 0,
        goalUsd,
        progress,
      },
      meta: {
        solUsdPrice: currentSolPrice,
        weeklyEarnings: weeklyEarnings || 0,
        percentage: 20, // 20% of weekly earnings
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


