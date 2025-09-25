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

export async function GET() {
  try {
    console.log('=== DEBUGGING TESTNET BOOSTERS & ADS ===')
    
    const testWalletAddress = process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || 'test-wallet'
    console.log('Test wallet address:', testWalletAddress)

    // Check for test user
    const { data: testUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .single()

    console.log('Test user found:', testUser)

    // Check for user boosters
    const { data: userBoosters, error: boostersError } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_packs(*)
      `)
      .eq('user_id', testUser?.id)
      .order('created_at', { ascending: false })

    console.log('User boosters:', userBoosters)

    // Check for active boosters
    const activeBoostersCount = userBoosters?.filter(b => 
      b.is_active && new Date(b.expires_at) > new Date()
    ).length || 0

    console.log('Active boosters count:', activeBoostersCount)

    // Check for banner ads
    const { data: bannerAds, error: bannerError } = await supabaseAdmin
      .from('ad_slots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Recent banner ads:', bannerAds)

    // Check for featured ads
    const { data: featuredAds, error: featuredError } = await supabaseAdmin
      .from('featured_ads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Recent featured ads:', featuredAds)

    // Check current date and active ads
    const today = new Date().toISOString().split('T')[0]
    console.log('Today:', today)

    // Check what get_current_ad function returns
    const { data: currentAdFunction, error: currentAdError } = await supabaseAdmin
      .rpc('get_current_ad')

    console.log('get_current_ad() result:', currentAdFunction)

    // Check featured ads current function
    const { data: currentFeaturedAds, error: featuredCurrentError } = await supabaseAdmin
      .rpc('get_current_featured_ads')

    console.log('get_current_featured_ads() result:', currentFeaturedAds)

    // Check SOL payments
    const { data: solPayments, error: paymentsError } = await supabaseAdmin
      .from('sol_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Recent SOL payments:', solPayments)

    return NextResponse.json({
      testWalletAddress,
      testUser,
      userBoosters: userBoosters || [],
      activeBoostersCount,
      bannerAds: bannerAds || [],
      featuredAds: featuredAds || [],
      currentAdFunction,
      currentFeaturedAds,
      solPayments: solPayments || [],
      today,
      debug: {
        userError: userError?.message,
        boostersError: boostersError?.message,
        bannerError: bannerError?.message,
        featuredError: featuredError?.message,
        currentAdError: currentAdError?.message,
        featuredCurrentError: featuredCurrentError?.message,
        paymentsError: paymentsError?.message
      }
    })

  } catch (error) {
    console.error('Error in testnet status debug:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}
