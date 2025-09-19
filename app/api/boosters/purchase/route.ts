import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'
import { BoosterPurchaseRequest } from '@/app/types/boosters'

export const dynamic = 'force-dynamic'

// Add CORS and security headers
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  })
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getOrCreateUser(walletAddress: string) {
  // First try to find existing user by wallet address (if users_new has wallet_address field)
  // For now, just create a new user with the wallet as telegram_username
  const { data: existingUser, error: findError } = await supabaseAdmin
    .from('users_new')
    .select('id')
    .eq('telegram_username', walletAddress)
    .single()

  if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error finding user:', findError)
  }

  if (existingUser) {
    console.log('Found existing user:', existingUser.id)
    return existingUser.id
  }

  // Create new user
  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users_new')
    .insert({
      telegram_username: walletAddress
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating user:', createError)
    throw createError
  }

  console.log('Created new user:', newUser.id)
  return newUser.id
}

export async function POST(request: Request) {
  try {
    console.log('=== BOOSTER PURCHASE DEBUG START ===')
    const requestData = await request.json() as BoosterPurchaseRequest
    console.log('Request data:', JSON.stringify(requestData, null, 2))
    const { id: boosterId, walletAddress, testMode } = requestData
    console.log('Parsed values:', { boosterId, walletAddress, testMode })

    // In test mode, create a fake transaction
    const tonPayload = testMode ? {
      transaction_id: `test-${Date.now()}`,
      amount: 1000000000, // 1 TON in nano
      payload: JSON.stringify({
        type: 'test_purchase',
        pack_id: boosterId
      })
    } : null

    const userId = walletAddress

    // Skip TON verification in test mode
    if (!testMode && (!tonPayload || !tonPayload.payload || !tonPayload.transaction_id)) {
      return NextResponse.json(
        { error: 'Invalid TON payment data' },
        { status: 400 }
      )
    }

    // Handle user creation/lookup
    console.log('Processing user ID:', userId)
    const actualUserId = await getOrCreateUser(userId || 'anonymous')
    console.log('Actual user ID to use:', actualUserId)

    if (!actualUserId) {
      return NextResponse.json(
        { error: 'Failed to create or identify user' },
        { status: 400 }
      )
    }

    // First, deactivate any expired boosters for this user
    await supabaseAdmin
      .from('user_boosters')
      .update({ is_active: false })
      .eq('user_id', actualUserId)
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())

    // Check if user already has an active booster
    const { data: activeBooster, error: activeError } = await supabaseAdmin
      .from('user_boosters')
      .select('*')
      .eq('user_id', actualUserId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (activeError && activeError.code !== 'PGRST116') {
      console.error('Error checking active boosters:', activeError)
      return NextResponse.json(
        { error: activeError.message },
        { status: 400 }
      )
    }

    if (activeBooster) {
      return NextResponse.json(
        { error: 'You already have an active booster. Wait for it to expire before purchasing another one.' },
        { status: 400 }
      )
    }

    console.log('Looking up booster pack:', boosterId)

    // Get booster pack details
    const { data: boosterPack, error: boosterError } = await supabaseAdmin
      .from('booster_packs')
      .select('*')
      .eq('id', boosterId)
      .single()

    console.log('Booster pack query result:', { boosterPack, boosterError })

    if (boosterError || !boosterPack) {
      console.error('Booster pack not found:', { boosterId, boosterError })
      return NextResponse.json(
        { error: 'Booster pack not found' },
        { status: 404 }
      )
    }

    // Skip payment verification in test mode
    const paidAmount = testMode ? 0.99 : tonPayload!.amount / 1000000000 // Convert from nanoTON to TON
    if (!testMode && paidAmount !== boosterPack.price_usd) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + boosterPack.duration_hours)

    // Create user booster
    const { data: userBooster, error: createError } = await supabaseAdmin
      .from('user_boosters')
      .insert({
        user_id: actualUserId,
        booster_pack_id: boosterPack.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        purchased_at: new Date().toISOString(),
        transaction_hash: tonPayload!.transaction_id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user booster:', createError)
      
      // Handle specific constraint violations
      if (createError.code === '23505' && createError.message.includes('idx_one_active_booster_per_user')) {
        return NextResponse.json(
          { error: 'You already have an active booster. Please wait for it to expire before purchasing another one.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        booster: userBooster,
        ton_response: {
          transaction_id: tonPayload!.transaction_id,
          ok: true
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cross-Origin-Opener-Policy': 'same-origin'
        }
      }
    )

  } catch (error) {
    console.error('Error in booster purchase:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}