import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Test the database function directly
    const { data: weeklyEarnings, error: earningsError } = await supabaseAdmin
      .rpc('get_weekly_sol_earnings')

    if (earningsError) {
      return NextResponse.json({ 
        error: 'Database function error: ' + earningsError.message 
      }, { status: 500 })
    }

    const { data: potAmount, error: potError } = await supabaseAdmin
      .rpc('get_community_pot_amount')

    if (potError) {
      return NextResponse.json({ 
        error: 'Pot function error: ' + potError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      databaseFunctions: {
        weeklyEarnings,
        potAmount,
        note: "These values come directly from database functions"
      }
    })

  } catch (error) {
    console.error('Error testing database functions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
