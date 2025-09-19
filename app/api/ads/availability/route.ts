import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'

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
      
      // Check if date is available using our database function
      const { data: isAvailable, error } = await supabaseAdmin
        .rpc('is_date_range_available', {
          p_start_date: dateStr,
          p_end_date: dateStr
        })

      slots.push({
        date: dateStr,
        isAvailable: error ? true : isAvailable, // Default to available if error
        price: 49.99 // Base daily price
      })
    }

    return NextResponse.json(slots)

  } catch (error) {
    console.error('Error in ad availability route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
