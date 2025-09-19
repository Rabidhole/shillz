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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tokenId } = await context.params

    // Get all tokens with their 24-hour shill counts
    const { data: tokens, error } = await supabaseAdmin
      .from('tokens_new')
      .select('id')
      .returns<{ id: string }[]>()

    if (error) {
      console.error('Error fetching tokens:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
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
          id: token.id,
          hot_shills: count || 0
        }
      })
    )

    // Sort by shill count and find rank
    const sortedTokens = tokenStats
      .sort((a, b) => b.hot_shills - a.hot_shills)
      .map((token, index) => ({
        ...token,
        rank: index + 1
      }))

    const targetToken = sortedTokens.find(t => t.id === tokenId)
    
    if (!targetToken) {
      return NextResponse.json(
        { error: 'Token not found' }, 
        { status: 404 }
      )
    }

    return NextResponse.json({
      rank: targetToken.rank,
      hot_shills: targetToken.hot_shills,
      total_tokens: sortedTokens.length
    })

  } catch (error) {
    console.error('Error getting token rank:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}