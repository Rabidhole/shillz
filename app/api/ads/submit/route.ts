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

export async function POST(request: Request) {
  try {
    const { 
      title, 
      imageUrl, 
      linkUrl, 
      telegramHandle, 
      selectedDates, 
      totalPrice,
      paymentId = 'test-payment-' + Date.now() // For test mode
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
        price_ton: totalPrice / 100, // Convert cents to dollars for now
        payment_id: paymentId,
        ton_amount: totalPrice / 100,
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

    return NextResponse.json({
      success: true,
      adSlot,
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
