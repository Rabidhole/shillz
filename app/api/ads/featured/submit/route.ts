import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'
import { TelegramNotifications } from '@/app/lib/telegram-notifications'

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

export async function POST(request: Request) {
  try {
    const { 
      projectName, 
      projectUrl, 
      projectLogoUrl,
      description,
      spotNumber,
      startDate,
      endDate,
      transactionHash,
      walletAddress
    } = await request.json()

    // Validate required fields
    if (!projectName || !projectUrl || !spotNumber || !startDate || !endDate || !transactionHash || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate spot number (1 or 2)
    if (spotNumber !== 1 && spotNumber !== 2) {
      return NextResponse.json(
        { error: 'Spot number must be 1 or 2' },
        { status: 400 }
      )
    }

    // Check if spot is available for the date range
    const { data: isAvailable, error: availabilityError } = await supabaseAdmin
      .rpc('is_featured_spot_available', {
        p_spot_number: spotNumber,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (availabilityError) {
      console.error('Error checking spot availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to check spot availability' },
        { status: 400 }
      )
    }

    if (!isAvailable) {
      return NextResponse.json(
        { error: `Spot ${spotNumber} is not available for the selected dates` },
        { status: 400 }
      )
    }

    // Calculate duration and total price
    const start = new Date(startDate)
    const end = new Date(endDate)
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const pricePerDay = 0.1 // 0.1 SOL per day
    const totalPriceSol = durationDays * pricePerDay

    // Get current SOL price for tracking
    const solUsdPrice = await fetchSolUsdPrice()
    const totalPriceUsd = totalPriceSol * solUsdPrice

    // Check if transaction hash is unique
    const { data: existingTransaction, error: transactionError } = await supabaseAdmin
      .from('featured_ads')
      .select('id')
      .eq('transaction_hash', transactionHash)
      .single()

    if (transactionError && transactionError.code !== 'PGRST116') {
      console.error('Error checking transaction uniqueness:', transactionError)
      return NextResponse.json(
        { error: 'Failed to verify transaction uniqueness' },
        { status: 500 }
      )
    }

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'This transaction has already been used' },
        { status: 400 }
      )
    }

    // Create featured ad
    const { data: featuredAd, error: createError } = await supabaseAdmin
      .from('featured_ads')
      .insert({
        project_name: projectName,
        project_url: projectUrl,
        project_logo_url: projectLogoUrl,
        description: description,
        spot_number: spotNumber,
        start_date: startDate,
        end_date: endDate,
        price_sol: pricePerDay,
        total_paid_sol: totalPriceSol,
        transaction_hash: transactionHash,
        wallet_address: walletAddress,
        is_active: true,
        is_approved: false // Requires admin approval
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating featured ad:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    // Track SOL payment for community pot calculation
    try {
      await supabaseAdmin
        .from('sol_payments')
        .insert({
          transaction_hash: transactionHash,
          amount_sol: totalPriceSol,
          amount_usd: totalPriceUsd,
          sol_usd_price: solUsdPrice,
          recipient_address: process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || '',
          sender_address: walletAddress,
          payment_type: 'featured_ad',
          reference_id: featuredAd.id
        })
      
      console.log('Featured ad SOL payment tracked for community pot:', {
        transactionHash,
        amountSol: totalPriceSol,
        amountUsd: totalPriceUsd
      })
    } catch (trackingError) {
      console.error('Failed to track featured ad payment:', trackingError)
      // Don't fail the ad creation if tracking fails
    }

    // Send Telegram notification
    try {
      await TelegramNotifications.notifyAdBooking({
        project: projectName,
        adType: 'featured',
        dates: `${startDate} - ${endDate}`,
        amount: totalPriceSol,
        transactionHash: transactionHash
      })
    } catch (notificationError) {
      console.error('Failed to send Telegram notification:', notificationError)
      // Don't fail the ad creation if notification fails
    }

    return NextResponse.json({
      success: true,
      ad: featuredAd,
      pricing: {
        durationDays,
        pricePerDay,
        totalPriceSol,
        totalPriceUsd
      }
    })

  } catch (error) {
    console.error('Error in featured ad submission:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
