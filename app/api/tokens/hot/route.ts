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
    // Get hot tokens with 24-hour shill counts
    const { data: hotTokens, error } = await supabaseAdmin
      .from('tokens_new')
      .select(`
        *,
        recent_shills:shills_new!inner(count)
      `)
      .gte('shills_new.created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('recent_shills.count', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching hot tokens:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }

    return NextResponse.json({ hotTokens })
  } catch (error) {
    console.error('Error in hot tokens route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
