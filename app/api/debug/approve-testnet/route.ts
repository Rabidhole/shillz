import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

export async function POST() {
  try {
    console.log('=== AUTO-APPROVING TESTNET TRANSACTIONS ===')
    
    // Only run in development/testnet mode
    if (!process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS) {
      return NextResponse.json({ 
        error: 'This endpoint only works with testnet configuration' 
      }, { status: 400 })
    }

    let approvedCount = 0

    // Auto-approve all unapproved banner ads
    const { data: bannerAds, error: bannerError } = await supabaseAdmin
      .from('ad_slots')
      .update({ is_approved: true })
      .eq('is_approved', false)
      .select()

    if (bannerError) {
      console.error('Error approving banner ads:', bannerError)
    } else {
      console.log('Approved banner ads:', bannerAds?.length || 0)
      approvedCount += bannerAds?.length || 0
    }

    // Auto-approve all unapproved featured ads
    const { data: featuredAds, error: featuredError } = await supabaseAdmin
      .from('featured_ads')
      .update({ is_approved: true })
      .eq('is_approved', false)
      .select()

    if (featuredError) {
      console.error('Error approving featured ads:', featuredError)
    } else {
      console.log('Approved featured ads:', featuredAds?.length || 0)
      approvedCount += featuredAds?.length || 0
    }

    // Get current status after approval
    const { data: currentBannerAd } = await supabaseAdmin
      .rpc('get_current_ad')

    const { data: currentFeaturedAds } = await supabaseAdmin
      .rpc('get_current_featured_ads')

    return NextResponse.json({
      success: true,
      message: `Auto-approved ${approvedCount} testnet ads`,
      results: {
        approvedBannerAds: bannerAds?.length || 0,
        approvedFeaturedAds: featuredAds?.length || 0,
        currentBannerAd,
        currentFeaturedAds,
        totalApproved: approvedCount
      }
    })

  } catch (error) {
    console.error('Error in approve testnet route:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}
