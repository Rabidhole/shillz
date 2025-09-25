import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'
import { BoosterPurchaseRequest } from '@/app/types/boosters'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'
import { TelegramNotifications } from '@/app/lib/telegram-notifications'

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

function normalizeWalletAddress(input: string | null | undefined): string {
  const raw = (input || '').trim()
  if (!raw) {
    return 'anonymous'
  }
  // Remove @ prefix if present
  return raw.startsWith('@') ? raw.substring(1) : raw
}

async function getOrCreateUserByWallet(walletAddress: string) {
  const normalizedWallet = normalizeWalletAddress(walletAddress)
  
  const { data: existingUser, error: findError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('wallet_address', normalizedWallet)
    .single()

  if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error finding user by wallet:', findError)
  }

  if (existingUser) {
    console.log('Found existing user by wallet:', existingUser.id)
    return existingUser.id
  }

  // Create new user with wallet address
  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({
      wallet_address: normalizedWallet,
      tier: 'degen',
      total_shills: 0,
      daily_shills: 0,
      weekly_shills: 0
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating user by wallet:', createError)
    throw createError
  }

  console.log('Created new user by wallet:', newUser.id)
  return newUser.id
}

export async function POST(request: Request) {
  try {
    console.log('=== BOOSTER PURCHASE DEBUG START ===')
    const requestData = await request.json() as BoosterPurchaseRequest
    console.log('Request data:', JSON.stringify(requestData, null, 2))
    const { id: boosterId, walletAddress, testMode, paymentMethod, transactionHash } = requestData
    const normalizedWallet = normalizeWalletAddress(walletAddress)
    console.log('Parsed values:', { boosterId, walletAddress, normalizedWallet, testMode, paymentMethod, transactionHash })

    // Handle different payment methods
    let transactionId: string
    
    if (testMode) {
      // Test mode - create fake transaction
      transactionId = `test-${Date.now()}`
    } else if (paymentMethod === 'sol' && transactionHash) {
      // SOL payment - use the transaction hash
      transactionId = transactionHash
    } else {
      // Legacy TON payment logic (for backward compatibility)
      const tonPayload = requestData.tonPayload
      if (!tonPayload || !tonPayload.payload || !tonPayload.transaction_id) {
        return NextResponse.json(
          { error: 'Invalid payment data' },
          { status: 400 }
        )
      }
      transactionId = tonPayload.transaction_id
    }

    // Handle user creation/lookup by wallet address
    console.log('Processing user by wallet address:', normalizedWallet)
    const actualUserId = await getOrCreateUserByWallet(normalizedWallet)
    console.log('Actual user ID to use:', actualUserId)

    if (!actualUserId) {
      return NextResponse.json(
        { error: 'Failed to create or identify user' },
        { status: 400 }
      )
    }

    // CRITICAL SECURITY: Check if this transaction hash has already been used
    console.log('Checking transaction hash uniqueness:', transactionId)
    const { data: existingTransaction, error: transactionError } = await supabaseAdmin
      .from('user_boosters')
      .select('id, user_id, transaction_hash')
      .eq('transaction_hash', transactionId)
      .single()

    if (transactionError && transactionError.code !== 'PGRST116') {
      console.error('Error checking transaction uniqueness:', transactionError)
      return NextResponse.json(
        { error: 'Failed to verify transaction uniqueness' },
        { status: 500 }
      )
    }

    if (existingTransaction) {
      console.error('Transaction hash already used:', {
        transactionId,
        existingUserId: existingTransaction.user_id,
        currentUserId: actualUserId
      })
      return NextResponse.json(
        { error: 'This transaction has already been used to purchase a booster. Each transaction can only be used once.' },
        { status: 400 }
      )
    }

    console.log('Transaction hash is unique - proceeding with purchase')

    // Use a more robust approach to check and clean up expired boosters
    const currentTime = new Date().toISOString()
    
    // First, deactivate any expired boosters for this user
    const { error: deactivateError } = await supabaseAdmin
      .from('user_boosters')
      .update({ is_active: false })
      .eq('user_id', actualUserId)
      .eq('is_active', true)
      .lt('expires_at', currentTime)

    if (deactivateError) {
      console.error('Error deactivating expired boosters:', deactivateError)
    }

    // Check if user already has an active booster (using the same timestamp)
    const { data: activeBoosters, error: activeError } = await supabaseAdmin
      .from('user_boosters')
      .select('*')
      .eq('user_id', actualUserId)
      .eq('is_active', true)
      .gt('expires_at', currentTime)

    if (activeError) {
      console.error('Error checking active boosters:', activeError)
      return NextResponse.json(
        { error: activeError.message },
        { status: 400 }
      )
    }

    if (activeBoosters && activeBoosters.length > 0) {
      console.log('Found active boosters:', activeBoosters)
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

    // Send notification about the purchase
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/booster-purchased`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boosterId: boosterPack.id,
          userId: actualUserId,
          transactionHash: transactionId,
          amount: boosterPack.priceSol || 0.01
        })
      })
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError)
      // Don't fail the purchase if notification fails
    }

    // Payment verification is handled by the payment verification API
    // For SOL payments, the amount was already verified in the SOL verification step

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + boosterPack.duration_hours)

    // Before creating the booster, do one final check with a more explicit query
    // This helps prevent race conditions
    const { data: finalCheck, error: finalCheckError } = await supabaseAdmin
      .from('user_boosters')
      .select('id, expires_at')
      .eq('user_id', actualUserId)
      .eq('is_active', true)
      .limit(1)

    if (finalCheckError) {
      console.error('Error in final active booster check:', finalCheckError)
    }

    if (finalCheck && finalCheck.length > 0) {
      console.log('Final check found active booster:', finalCheck[0])
      // Check if it's actually expired
      const expiredTime = new Date(finalCheck[0].expires_at)
      if (expiredTime > new Date()) {
        return NextResponse.json(
          { error: 'You already have an active booster. Please wait for it to expire before purchasing another one.' },
          { status: 400 }
        )
      } else {
        // It's expired, deactivate it
        console.log('Deactivating expired booster found in final check')
        await supabaseAdmin
          .from('user_boosters')
          .update({ is_active: false })
          .eq('id', finalCheck[0].id)
      }
    }

    // Create user booster
    const { data: userBooster, error: createError } = await supabaseAdmin
      .from('user_boosters')
      .insert({
        user_id: actualUserId,
        booster_pack_id: boosterPack.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        transaction_hash: transactionId
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating user booster:', createError)
      
      // Handle specific constraint violations with more detailed logging
      if (createError.code === '23505') {
        if (createError.message.includes('idx_one_active_booster_per_user')) {
          console.error('Constraint violation: User already has active booster despite checks')
          // Try to find what active booster exists
          const { data: debugBoosters } = await supabaseAdmin
            .from('user_boosters')
            .select('*')
            .eq('user_id', actualUserId)
            .eq('is_active', true)
          console.error('Debug - Active boosters found:', debugBoosters)
          
          return NextResponse.json(
            { error: 'You already have an active booster. Please wait for it to expire before purchasing another one.' },
            { status: 400 }
          )
        }
      }
      
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    // Track SOL payment for community pot calculation
    if (paymentMethod === 'sol' && boosterPack.priceSol) {
      try {
        // Get current SOL price from live API
        const solUsdPrice = await fetchSolUsdPrice()
        const amountUsd = boosterPack.priceSol * solUsdPrice
        
        await supabaseAdmin
          .from('sol_payments')
          .insert({
            transaction_hash: transactionId,
            amount_sol: boosterPack.priceSol,
            amount_usd: amountUsd,
            sol_usd_price: solUsdPrice,
            recipient_address: process.env.NEXT_PUBLIC_SOL_RECIPIENT_ADDRESS || process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || '',
            sender_address: normalizedWallet,
            payment_type: 'booster',
            reference_id: actualUserId
          })
        
        console.log('SOL payment tracked for community pot:', {
          transactionHash: transactionId,
          amountSol: boosterPack.priceSol,
          amountUsd: amountUsd
        })
      } catch (trackingError) {
        console.error('Failed to track SOL payment:', trackingError)
        // Don't fail the purchase if tracking fails
      }
    }

    // Send Telegram notification
    try {
      await TelegramNotifications.notifyBoosterPurchase({
        user: normalizedWallet,
        boosterType: boosterPack.id,
        amount: boosterPack.priceSol || 0,
        transactionHash: transactionId
      })
    } catch (notificationError) {
      console.error('Failed to send Telegram notification:', notificationError)
      // Don't fail the purchase if notification fails
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        booster: userBooster,
        payment_response: {
          transaction_id: transactionId,
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