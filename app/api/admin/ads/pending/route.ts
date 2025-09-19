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
    console.log('Fetching pending ads from database...')
    const { data: pendingAds, error } = await supabaseAdmin
      .from('ad_slots')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending ads:', error)
      return new NextResponse(
        JSON.stringify({ error: error.message }), 
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
    }

    console.log('Found pending ads:', pendingAds?.length || 0)
    return new NextResponse(
      JSON.stringify(pendingAds || []),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )

  } catch (error) {
    console.error('Error in pending ads route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
