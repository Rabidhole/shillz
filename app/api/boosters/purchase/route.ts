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
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function getOrCreateAnonymousUser() {
  const anonymousId = crypto.randomUUID()

  const { error } = await supabaseAdmin
    .from('users_new')
    .insert({
      id: anonymousId,
      telegram_username: 'anonymous',
      tier: 'degen',
      total_shills: 0,
      hot_shills: 0
    })
    .select()
    .single()

  if (error && error.code !== '23505') {
    throw error
  }

  return anonymousId
}

export async function POST(request: Request) {
  try {
    console.log('Received booster purchase request')
    const requestData = await request.json() as BoosterPurchaseRequest
    console.log('Request data:', requestData)
    const { id: boosterId, walletAddress, testMode } = requestData
    console.log('Parsed request:', { boosterId, walletAddress, testMode })

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

    // Handle anonymous user
    const actualUserId = userId === 'anonymous' 
      ? await getOrCreateAnonymousUser()
      : userId

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
    console.log('Looking up booster pack with ID:', boosterId)
    const { data: boosterPack, error: boosterError } = await supabaseAdmin
      .from('booster_packs')
      .select('*')
      .eq('id', boosterId)
      .single()
    
    if (boosterError) {
      console.error('Booster lookup error:', boosterError)
    } else {
      console.log('Found booster pack:', boosterPack)
    }

    if (boosterError || !boosterPack) {
      return NextResponse.json(
        { error: 'Booster pack not found' },
        { status: 404 }
      )
    }

    // Skip payment verification in test mode
    const paidAmount = testMode ? 0.15 : tonPayload!.amount / 1000000000 // Convert from nanoTON to TON
    if (!testMode && paidAmount !== boosterPack.price_ton) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + boosterPack.duration_hours)

    // Create user booster
    console.log('Creating user booster:', {
      user_id: actualUserId,
      booster_pack_id: boosterPack.id,
      expires_at: expiresAt.toISOString(),
      is_active: true,
      uses_remaining: boosterPack.max_uses,
      payment_id: tonPayload!.transaction_id,
      amount: paidAmount
    })

    const { data: userBooster, error: createError } = await supabaseAdmin
      .from('user_boosters')
      .insert({
        user_id: actualUserId,
        booster_pack_id: boosterPack.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        uses_remaining: boosterPack.max_uses,
        payment_id: tonPayload!.transaction_id,
        ton_amount: paidAmount
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user booster:', {
        error: createError,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      })
      return NextResponse.json(
        { 
          error: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        },
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
