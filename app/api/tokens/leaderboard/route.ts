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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get all tokens
    let query = supabaseAdmin
      .from('tokens_new')
      .select('*')

    // Add search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,contract_address.ilike.%${search}%`)
    }

    const { data: tokens, error } = await query

    if (error) {
      console.error('Error fetching tokens:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }

    if (!tokens) {
      return NextResponse.json({
        tokens: [],
        total: 0,
        hasMore: false
      })
    }

    // Calculate 24-hour shill counts for all tokens
    const tokenStats = await Promise.all(
      tokens.map(async (token) => {
        const { count } = await supabaseAdmin
          .from('shills_new')
          .select('*', { count: 'exact', head: true })
          .eq('token_id', token.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        return {
          ...token,
          hot_shills: count || 0
        }
      })
    )

    // Sort by 24-hour shill count and add ranks
    const rankedTokens = tokenStats
      .sort((a, b) => b.hot_shills - a.hot_shills)
      .map((token, index) => ({
        ...token,
        rank: index + 1,
        total_shills: token.hot_shills // Use 24h count as display count
      }))

    // Apply pagination
    const paginatedTokens = rankedTokens.slice(offset, offset + limit)

    return NextResponse.json({
      tokens: paginatedTokens,
      total: rankedTokens.length,
      hasMore: offset + limit < rankedTokens.length
    })

  } catch (error) {
    console.error('Error in leaderboard route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
