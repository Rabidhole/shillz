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
    console.log('Starting Sunday 11:59 PM snapshot process...')
    
    // Call the database function to take weekly snapshot
    const { data: snapshotId, error } = await supabaseAdmin.rpc('take_weekly_snapshot')
    
    if (error) {
      console.error('Error taking weekly snapshot:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }
    
    console.log('Sunday snapshot completed successfully, snapshot ID:', snapshotId)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Weekly snapshot taken successfully',
      snapshotId,
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
