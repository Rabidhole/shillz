import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'
import { TelegramNotifications } from '../../lib/telegram-notifications'

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
      title, 
      imageUrl, 
      linkUrl, 
      telegramHandle, 
      selectedDates, 
      totalPrice,
      paymentId = 'test-payment-' + Date.now(), // For test mode
      transactionHash,
      walletAddress
    } = await request.json()

    // Validate required fields
    if (!title || !imageUrl || !linkUrl || !telegramHandle || !selectedDates?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate dates are consecutive for proper campaign
    const sortedDates = [...selectedDates].sort()
    const startDate = sortedDates[0]
    const endDate = sortedDates[sortedDates.length - 1]

    // Check if date range is available
    const { data: isAvailable, error: availabilityError } = await supabaseAdmin
      .rpc('is_date_range_available', {
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (availabilityError) {
      console.error('Error checking availability:', availabilityError)
      return NextResponse.json(
        { error: 'Failed to check date availability' },
        { status: 400 }
      )
    }

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Selected dates are no longer available' },
        { status: 400 }
      )
    }

    // Calculate SOL price and USD equivalent using flat rate
    const solUsdPrice = await fetchSolUsdPrice()
    const days = selectedDates.length
    const totalPriceSol = 0.2 * days // 0.2 SOL per day
    const totalPriceUsd = totalPriceSol * solUsdPrice

    // Create ad slot
    const { data: adSlot, error: createError } = await supabaseAdmin
      .from('ad_slots')
      .insert({
        title: title.trim(),
        image_url: imageUrl.trim(),
        link_url: linkUrl.trim(),
        telegram_handle: telegramHandle.trim(),
        start_date: startDate,
        end_date: endDate,
        price_ton: totalPriceSol, // Legacy field - Store SOL amount
        payment_id: transactionHash || paymentId,
        ton_amount: totalPriceSol, // Legacy field
        price_sol: totalPriceSol, // New SOL price field
        total_paid_sol: totalPriceSol, // New total paid field
        sol_transaction_hash: transactionHash,
        is_active: true,
        is_approved: false // Requires admin approval
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating ad slot:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    // Track SOL payment for community pot calculation
    if (transactionHash && walletAddress) {
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
            payment_type: 'banner_ad',
            reference_id: adSlot.id
          })
        
        console.log('Banner ad SOL payment tracked for community pot:', {
          transactionHash,
          amountSol: totalPriceSol,
          amountUsd: totalPriceUsd
        })
      } catch (trackingError) {
        console.error('Failed to track banner ad payment:', trackingError)
        // Don't fail the ad creation if tracking fails
      }
    }

    // Send Telegram notification
    try {
      await TelegramNotifications.notifyAdBooking({
        project: title,
        adType: 'banner',
        dates: `${startDate} - ${endDate}`,
        amount: totalPriceSol,
        transactionHash: transactionHash || 'test-payment'
      })
    } catch (notificationError) {
      console.error('Failed to send Telegram notification:', notificationError)
      // Don't fail the ad creation if notification fails
    }

    return NextResponse.json({
      success: true,
      adSlot,
      pricing: {
        totalPriceSol: totalPriceSol.toFixed(4),
        totalPriceUsd: totalPriceUsd.toFixed(2),
        solUsdPrice: solUsdPrice.toFixed(4)
      },
      message: 'Ad booking submitted successfully! It will be reviewed and approved within 24 hours.'
    })

  } catch (error) {
    console.error('Error in ad submission:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
