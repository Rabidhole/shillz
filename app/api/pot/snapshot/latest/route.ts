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

export async function GET() {
  try {
    // Get the latest snapshot
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from('pot_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    if (snapshotError) {
      return NextResponse.json({ 
        success: false, 
        error: 'No snapshot found' 
      })
    }

    // Get the winners for this snapshot
    const { data: winners, error: winnersError } = await supabaseAdmin
      .from('pot_snapshot_winners')
      .select(`
        *,
        users!inner(wallet_address)
      `)
      .eq('snapshot_id', snapshot.id)
      .order('position', { ascending: true })

    if (winnersError) {
      return NextResponse.json({ 
        success: false, 
        error: winnersError.message 
      })
    }

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        total_amount_sol: snapshot.total_amount_sol,
        sol_usd_price: snapshot.sol_usd_price,
        pot_usd: snapshot.pot_usd,
        snapshot_date: snapshot.snapshot_date
      },
      winners: winners || []
    })

  } catch (error) {
    console.error('Error fetching latest snapshot:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
