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

const BOOSTER_IDS = {
  'quick-boost': '2x-1h',
  'power-boost': '4x-4h'
}

async function getOrCreateAnonymousUser() {
  // Generate a UUID for anonymous user
  const anonymousId = crypto.randomUUID()

  // Create anonymous user
  const { data: user, error } = await supabaseAdmin
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

  if (error && error.code !== '23505') { // Ignore unique constraint violations
    throw error
  }

  return anonymousId
}

export async function POST(request: Request) {
  try {
    const { packId, userId, tonPayload } = await request.json()

    // Verify TON payment data
    if (!tonPayload || !tonPayload.payload || !tonPayload.transaction_id) {
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

    if (activeError && activeError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
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

    // Get booster pack details
    const { data: boosterPack, error: boosterError } = await supabaseAdmin
      .from('booster_packs')
      .select('*')
      .eq('id', BOOSTER_IDS[packId as keyof typeof BOOSTER_IDS])
      .single()

    if (boosterError || !boosterPack) {
      return NextResponse.json(
        { error: 'Booster pack not found' },
        { status: 404 }
      )
    }

    // Verify payment amount matches booster price
    const paidAmount = tonPayload.amount / 1000000000 // Convert from nanoTON to TON
    if (paidAmount !== boosterPack.price_ton) {
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
        uses_remaining: boosterPack.max_uses,
        payment_id: tonPayload.transaction_id,
        ton_amount: paidAmount
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user booster:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    // Return success with TON-specific data
    return NextResponse.json({
      success: true,
      booster: userBooster,
      ton_response: {
        transaction_id: tonPayload.transaction_id,
        ok: true
      }
    })

  } catch (error) {
    console.error('Error in booster purchase:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}