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
    const { tokenId } = await request.json()
    console.log('Received tokenId:', tokenId)

    // First, create anonymous user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users_new')
      .upsert({
        telegram_username: `anon_${Date.now()}`,
        tier: 'degen',
        total_shills: 0
      }, {
        onConflict: 'telegram_username',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating/getting user:', userError)
      return NextResponse.json(
        { error: userError.message }, 
        { status: 400 }
      )
    }

    // Create the shill with the user ID
    const { data: shill, error: shillError } = await supabaseAdmin
      .from('shills_new')
      .insert({
        user_id: user.id,
        token_id: tokenId,
      })
      .select()
      .single()

    if (shillError) {
      console.error('Error creating shill:', shillError)
      return NextResponse.json(
        { error: shillError.message }, 
        { status: 400 }
      )
    }

    // Get current token shills
    const { data: currentToken, error: getTokenError } = await supabaseAdmin
      .from('tokens_new')
      .select('total_shills')
      .eq('id', tokenId)
      .single()

    if (getTokenError) {
      console.error('Error getting token:', getTokenError)
      return NextResponse.json(
        { error: getTokenError.message }, 
        { status: 400 }
      )
    }

    // Update token total_shills
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens_new')
      .update({ 
        total_shills: (currentToken?.total_shills || 0) + 1
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

    // Get current user shills
    const { data: currentUser, error: getUserError } = await supabaseAdmin
      .from('users_new')
      .select('total_shills')
      .eq('id', user.id)
      .single()

    if (getUserError) {
      console.error('Error getting user:', getUserError)
      return NextResponse.json(
        { error: getUserError.message }, 
        { status: 400 }
      )
    }

    // Update user total_shills
    const { data: updatedUser, error: updateUserError } = await supabaseAdmin
      .from('users_new')
      .update({ 
        total_shills: (currentUser?.total_shills || 0) + 1,
        tier: getTier((currentUser?.total_shills || 0) + 1)
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
      shill,
      token,
      user: updatedUser
    })

  } catch (error) {
    console.error('Detailed error in shill route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}

function getTier(totalShills: number): 'degen' | 'chad' | 'mofo' | 'legend' {
  if (totalShills >= 1000) return 'legend'
  if (totalShills >= 500) return 'mofo'
  if (totalShills >= 100) return 'chad'
  return 'degen'
}