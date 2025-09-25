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
    console.log('Starting weekly reset process...')
    
    // Call the database function to reset weekly shills
    const { data, error } = await supabaseAdmin.rpc('reset_weekly_shills')
    
    if (error) {
      console.error('Error resetting weekly shills:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }
    
    console.log('Weekly reset completed successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Weekly shills reset completed',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in weekly reset cron:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
