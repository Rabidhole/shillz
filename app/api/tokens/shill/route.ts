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

function normalizeWalletAddress(input: string | null | undefined): string {
  const raw = (input || '').trim()
  if (!raw) {
    return 'anonymous'
  }
  // Remove @ prefix if present
  return raw.startsWith('@') ? raw.substring(1) : raw
}

export async function POST(request: Request) {
  try {
    const { tokenId, userId, multiplier = 1 } = await request.json()
    console.log('Received shill request:', { tokenId, userId, multiplier })

    // Get or create user based on wallet address
    let user
    if (userId && userId !== 'anonymous') {
      const normalizedWallet = normalizeWalletAddress(userId)
      
      // Try to find existing user first
      const { data: existingUser, error: findError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('wallet_address', normalizedWallet)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        console.error('Error finding user by wallet:', findError)
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
          .from('users')
          .insert({
            wallet_address: normalizedWallet,
            tier: 'degen',
            total_shills: 0,
            daily_shills: 0,
            weekly_shills: 0
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
      // For anonymous requests, we don't create a user record
      // Anonymous shills don't count towards user stats
      user = null
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

    // Update user shills only if user exists (not anonymous)
    if (user) {
      // Get current user shills
      const { data: currentUser, error: getUserError } = await supabaseAdmin
        .from('users')
        .select('total_shills, daily_shills, weekly_shills')
        .eq('id', user.id)
        .single()

      if (getUserError) {
        console.error('Error getting user:', getUserError)
        return NextResponse.json(
          { error: getUserError.message }, 
          { status: 400 }
        )
      }

      // Update user shills with the effective shills
      const newUserTotal = (currentUser?.total_shills || 0) + effectiveShills
      const { data: updatedUser, error: updateUserError } = await supabaseAdmin
        .from('users')
        .update({ 
          total_shills: newUserTotal,
          daily_shills: (currentUser?.daily_shills || 0) + effectiveShills,
          weekly_shills: (currentUser?.weekly_shills || 0) + effectiveShills,
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