import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('Testing pot calculation...')
    
    // Test 1: Check if sol_payments table exists
    const { data: tableCheck, error: tableError } = await supabaseAdmin
      .from('sol_payments')
      .select('count')
      .limit(1)
    
    console.log('Table check:', { tableCheck, tableError })
    
    // Test 2: Check if functions exist
    const { data: weeklyEarnings, error: earningsError } = await supabaseAdmin
      .rpc('get_weekly_sol_earnings')
    
    console.log('Weekly earnings:', { weeklyEarnings, earningsError })
    
    const { data: potAmount, error: potError } = await supabaseAdmin
      .rpc('get_community_pot_amount')
    
    console.log('Pot amount:', { potAmount, potError })
    
    // Test 3: Check SOL pricing
    const solPrice = await fetchSolUsdPrice()
    console.log('SOL price:', solPrice)
    
    return NextResponse.json({
      success: true,
      tests: {
        tableExists: !tableError,
        tableError: tableError?.message,
        weeklyEarnings: weeklyEarnings,
        earningsError: earningsError?.message,
        potAmount: potAmount,
        potError: potError?.message,
        solPrice: solPrice
      }
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
