import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient<Database>(
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
    // Get current active ad
    const { data: ad, error } = await supabaseAdmin
      .rpc('get_current_ad')

    if (error) {
      console.error('Error fetching current ad:', error)
      return NextResponse.json(null)
    }

    if (!ad || ad.length === 0) {
      return NextResponse.json(null)
    }

    return NextResponse.json(ad[0])

  } catch (error) {
    console.error('Error in current ad route:', error)
    return NextResponse.json(null)
  }
}
