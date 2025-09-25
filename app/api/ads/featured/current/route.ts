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
    console.log('Fetching current featured ads...')
    console.log('Current date:', new Date().toISOString().split('T')[0])
    
    // Get current active featured ads
    const { data: ads, error } = await supabaseAdmin
      .rpc('get_current_featured_ads')

    if (error) {
      console.error('Error fetching current featured ads:', error)
      return NextResponse.json([])
    }

    console.log('Current featured ads found:', ads?.length || 0)
    if (ads && ads.length > 0) {
      console.log('Featured ads data:', ads)
    }

    return NextResponse.json(ads || [])

  } catch (error) {
    console.error('Error in current featured ads route:', error)
    return NextResponse.json([])
  }
}
