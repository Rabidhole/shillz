import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    // Generate next 60 days
    const slots = []
    const today = new Date()
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Check availability for both spots using database functions
      const [spot1Result, spot2Result] = await Promise.all([
        supabaseAdmin.rpc('is_featured_spot_available', {
          p_spot_number: 1,
          p_start_date: dateStr,
          p_end_date: dateStr
        }),
        supabaseAdmin.rpc('is_featured_spot_available', {
          p_spot_number: 2,
          p_start_date: dateStr,
          p_end_date: dateStr
        })
      ])

      slots.push({
        date: dateStr,
        spot1Available: spot1Result.error ? true : spot1Result.data, // Default to available if error
        spot2Available: spot2Result.error ? true : spot2Result.data, // Default to available if error
      })
    }

    return NextResponse.json(slots)

  } catch (error) {
    console.error('Error in featured ad availability route:', error)
    return NextResponse.json([])
  }
}
