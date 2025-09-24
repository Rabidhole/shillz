import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get weekly SOL earnings and calculate community pot (20% of weekly earnings)
    const { data: weeklyEarnings, error: earningsError } = await supabaseAdmin
      .rpc('get_weekly_sol_earnings')

    if (earningsError) {
      console.error('Error getting weekly earnings:', earningsError)
      return NextResponse.json(
        { error: 'Failed to calculate weekly earnings' },
        { status: 500 }
      )
    }

    const { data: potAmount, error: potError } = await supabaseAdmin
      .rpc('get_community_pot_amount')

    if (potError) {
      console.error('Error getting community pot amount:', potError)
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

    return NextResponse.json({
      pot: {
        usd: potAmount,
        goalUsd,
        progress,
        weeklyEarnings: weeklyEarnings || 0,
        percentage: 20 // 20% of weekly earnings
      },
      meta: {
        solUsdPrice: currentSolPrice,
        updatedAt: new Date().toISOString(),
        recentPayments: recentPayments || []
      }
    })
  } catch (error) {
    console.error('Error in SOL pot calculation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
