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
    console.log('Starting daily reset process...')
    
    // Call the database function to reset daily shills
    const { data, error } = await supabaseAdmin.rpc('reset_daily_shills')
    
    if (error) {
      console.error('Error resetting daily shills:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }
    
    console.log('Daily reset completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily shills reset completed',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in daily reset cron:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
