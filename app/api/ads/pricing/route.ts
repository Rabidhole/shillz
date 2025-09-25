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
    // Return simplified flat rate pricing
    const pricing = [
      {
        id: 'banner-ad',
        ad_type: 'banner',
        price_sol: 0.2,
        price_usd: 0.2 * 200, // Assuming $200 SOL price
        duration_days: 1,
        description: 'Top banner ad - 0.2 SOL per day'
      },
      {
        id: 'featured-ad',
        ad_type: 'featured', 
        price_sol: 0.1,
        price_usd: 0.1 * 200, // Assuming $200 SOL price
        duration_days: 1,
        description: 'Featured badge - 0.1 SOL per day'
      }
    ]

    return NextResponse.json(pricing)

  } catch (error) {
    console.error('Error in ad pricing route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
