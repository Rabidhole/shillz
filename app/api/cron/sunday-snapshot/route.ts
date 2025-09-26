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
    console.log('Starting Sunday 11:59 PM snapshot process...')
    
    // Get current SOL price for accurate USD calculation
    const solUsdPrice = await fetchSolUsdPrice()
    console.log('Current SOL price:', solUsdPrice)
    
    // Call the database function to take weekly snapshot
    const { data: snapshotId, error } = await supabaseAdmin.rpc('take_weekly_snapshot')
    
    if (error) {
      console.error('Error taking weekly snapshot:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }
    
    // Update the snapshot with current SOL price (if column exists)
    try {
      const { error: updateError } = await supabaseAdmin
        .from('pot_snapshots')
        .update({ 
          sol_usd_price: solUsdPrice,
          pot_usd: await getPotAmountUsd(solUsdPrice)
        })
        .eq('id', snapshotId)
      
      if (updateError) {
        console.error('Error updating snapshot with SOL price:', updateError)
        console.log('This might be because sol_usd_price column doesn\'t exist yet')
      }
    } catch (error) {
      console.error('Error updating snapshot (column might not exist):', error)
    }
    
    // Get snapshot details for response
    const { data: snapshot, error: fetchError } = await supabaseAdmin
      .from('pot_snapshots')
      .select('total_amount_sol, pot_usd')
      .eq('id', snapshotId)
      .single()
    
    // Add sol_usd_price to snapshot if it exists
    if (snapshot) {
      snapshot.sol_usd_price = solUsdPrice
    }
    
    console.log('Sunday snapshot completed successfully, snapshot ID:', snapshotId)
    console.log('Snapshot details:', snapshot)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Weekly snapshot taken successfully',
      snapshotId,
      snapshot: snapshot,
      solUsdPrice,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in Sunday snapshot cron:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}

async function getPotAmountUsd(solUsdPrice: number): Promise<number> {
  try {
    const { data } = await supabaseAdmin.rpc('get_community_pot_amount')
    const potAmountSol = data || 0
    return potAmountSol * solUsdPrice
  } catch (error) {
    console.error('Error calculating pot amount USD:', error)
    return 0
  }
}
