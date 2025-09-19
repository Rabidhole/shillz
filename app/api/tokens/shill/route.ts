import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'

export const dynamic = 'force-dynamic'

// Create a Supabase client with the service role key
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

export async function POST(request: Request) {
  try {
    const { tokenId, userId, multiplier = 1 } = await request.json()
    console.log('Received shill request:', { tokenId, userId, multiplier })

    // Get or create user based on userId
    let user
    if (userId && userId !== 'anonymous') {
      // Try to find existing user first
      const { data: existingUser, error: findError } = await supabaseAdmin
        .from('users_new')
        .select('*')
        .eq('telegram_username', userId)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding user:', findError)
        return NextResponse.json(
          { error: findError.message }, 
          { status: 400 }
        )
      }

      if (existingUser) {
        user = existingUser
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users_new')
          .insert({
            telegram_username: userId,
            tier: 'degen',
            total_shills: 0
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
          return NextResponse.json(
            { error: createError.message }, 
            { status: 400 }
          )
        }
        user = newUser
      }
    } else {
      // Create anonymous user for anonymous requests
      const { data: anonUser, error: userError } = await supabaseAdmin
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
      user = anonUser
    }

    // Calculate effective shills based on multiplier
    const effectiveShills = Math.floor(multiplier)
    console.log('Applying multiplier:', { multiplier, effectiveShills })

    // Create multiple shill records based on the multiplier
    const shillRecords = Array.from({ length: effectiveShills }, () => ({
      user_id: user.id,
      token_id: tokenId,
    }))

    const { data: shills, error: shillError } = await supabaseAdmin
      .from('shills_new')
      .insert(shillRecords)
      .select()

    if (shillError) {
      console.error('Error creating shills:', shillError)
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

    // Update token total_shills with the effective shills
    const { data: token, error: tokenError } = await supabaseAdmin
      .from('tokens_new')
      .update({ 
        total_shills: (currentToken?.total_shills || 0) + effectiveShills
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

    // Update user total_shills with the effective shills
    const newUserTotal = (currentUser?.total_shills || 0) + effectiveShills
    const { data: updatedUser, error: updateUserError } = await supabaseAdmin
      .from('users_new')
      .update({ 
        total_shills: newUserTotal,
        tier: getTier(newUserTotal)
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
      shills,
      effectiveShills,
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