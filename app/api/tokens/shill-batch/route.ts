import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'

export const dynamic = 'force-dynamic'

// Create a Supabase client with the service role key
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

export async function POST(request: Request) {
  try {
    const { tokenId, count } = await request.json()
    console.log(`Received batch: ${count} shills for token ${tokenId}`)

    if (!tokenId || !count || count <= 0) {
      return NextResponse.json(
        { error: 'Invalid tokenId or count' }, 
        { status: 400 }
      )
    }

    // Create anonymous user for this batch
    const { data: user, error: userError } = await supabaseAdmin
      .from('users_new')
      .upsert({
        telegram_username: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tier: 'degen',
        total_shills: 0
      }, {
        onConflict: 'telegram_username',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { error: userError.message }, 
        { status: 400 }
      )
    }

    // Create multiple shill records
    const shillInserts = Array(count).fill(null).map(() => ({
      user_id: user.id,
      token_id: tokenId,
    }))

    const { data: shills, error: shillError } = await supabaseAdmin
      .from('shills_new')
      .insert(shillInserts)
      .select()

    if (shillError) {
      console.error('Error creating shills:', shillError)
      return NextResponse.json(
        { error: shillError.message }, 
        { status: 400 }
      )
    }

    // Get 24-hour shill count for token
    const { count: hot24hShills } = await supabaseAdmin
      .from('shills_new')
      .select('*', { count: 'exact', head: true })
      .eq('token_id', tokenId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Update token with 24-hour count
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens_new')
      .update({ 
        total_shills: hot24hShills || 0
      })
      .eq('id', tokenId)
      .select()
      .single()

    if (tokenError) {
      console.error('Error updating token:', tokenError)
      return NextResponse.json(
        { error: tokenError.message }, 
        { status: 400 }
      )
    }

    // Get 24-hour shill count for user
    const { count: user24hShills } = await supabaseAdmin
      .from('shills_new')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Update user with 24-hour count and current tier
    const newTier = getTier(user24hShills || 0)
    const { data: updatedUser, error: updateUserError } = await supabaseAdmin
      .from('users_new')
      .update({ 
        total_shills: user24hShills || 0,
        tier: newTier
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateUserError) {
      console.error('Error updating user:', updateUserError)
      return NextResponse.json(
        { error: updateUserError.message }, 
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      count,
      shills,
      token,
      user: updatedUser,
      hot24hShills
    })

  } catch (error) {
    console.error('Detailed error in shill-batch route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}

function getTier(recentShills: number): 'degen' | 'chad' | 'mofo' | 'legend' {
  if (recentShills >= 100) return 'legend'
  if (recentShills >= 50) return 'mofo'
  if (recentShills >= 10) return 'chad'
  return 'degen'
}