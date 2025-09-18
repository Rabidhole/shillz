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

// Verify Telegram payment signature
async function verifyTelegramPayment(payload: any) {
  try {
    // Get the bot token from environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      throw new Error('Bot token not configured')
    }

    // Construct the data check string
    const fields = [
      'payload',
      'ton_transaction_id',
      'ton_amount',
      'ton_receiver_address'
    ].sort()

    const checkString = fields
      .map(field => `${field}=${payload[field]}`)
      .join('\n')

    // Verify the hash using the bot token
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(botToken + checkString)
    )
    const calculatedHash = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return calculatedHash === payload.hash
  } catch (error) {
    console.error('Error verifying payment:', error)
    return false
  }
}

export async function POST(request: Request) {
  try {
    const paymentData = await request.json()

    // Verify the payment signature
    const isValid = await verifyTelegramPayment(paymentData)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Parse the custom payload
    const customData = JSON.parse(paymentData.payload)
    const { pack_id, user_id, usd_amount } = customData

    // Get booster pack details
    const { data: boosterPack, error: boosterError } = await supabaseAdmin
      .from('booster_packs')
      .select('*')
      .eq('id', pack_id)
      .single()

    if (boosterError || !boosterPack) {
      return NextResponse.json(
        { error: 'Booster pack not found' },
        { status: 404 }
      )
    }

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + boosterPack.duration_hours)

    // Create user booster
    const { data: userBooster, error: createError } = await supabaseAdmin
      .from('user_boosters')
      .insert({
        user_id: user_id,
        booster_pack_id: boosterPack.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        uses_remaining: boosterPack.max_uses,
        payment_id: paymentData.ton_transaction_id,
        ton_amount: Number(paymentData.ton_amount) / 1000000000 // Convert from nanoTON to TON
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

    return NextResponse.json({
      success: true,
      booster: userBooster
    })

  } catch (error) {
    console.error('Error in payment verification:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
