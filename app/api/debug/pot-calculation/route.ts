import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentWeekPeriod, getWeekInfo } from '@/lib/weekly-period'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('🔍 Debugging pot calculation...')
    
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    const weekInfo = getWeekInfo()
    console.log('Current week period:', {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      weekInfo
    })
    
    // Check sol_payments table
    const { data: solPayments, error: solError } = await supabaseAdmin
      .from('sol_payments')
      .select('*')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: false })
    
    console.log('SOL payments found:', solPayments?.length || 0)
    console.log('SOL payments error:', solError)
    
    // Check user_boosters table
    const { data: userBoosters, error: boostersError } = await supabaseAdmin
      .from('user_boosters')
      .select('purchased_at, booster_pack_id, transaction_hash')
      .gte('purchased_at', weekStart.toISOString())
      .lte('purchased_at', weekEnd.toISOString())
      .order('purchased_at', { ascending: false })
    
    console.log('User boosters found:', userBoosters?.length || 0)
    console.log('User boosters error:', boostersError)
    
    // Check booster_packs for prices
    const { data: boosterPacks, error: packsError } = await supabaseAdmin
      .from('booster_packs')
      .select('id, price_sol, name')
    
    console.log('Booster packs found:', boosterPacks?.length || 0)
    console.log('Booster packs error:', packsError)
    
    // Final correct logic: Only boosters from sol_payments, ads from individual tables by start_date
    
    // 1. Calculate booster earnings from sol_payments (ONLY boosters, by creation date)
    const { data: boosterPayments } = await supabaseAdmin
      .from('sol_payments')
      .select('amount_sol')
      .eq('payment_type', 'booster')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    
    const boosterEarnings = boosterPayments?.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount_sol) || 0)
    }, 0) || 0
    
    // 2. Calculate banner ad earnings from ad_slots table (by start_date, ignore sol_payments banner_ad entries)
    const { data: bannerAds } = await supabaseAdmin
      .from('ad_slots')
      .select('total_paid_sol, price_sol, start_date, title')
      .eq('is_approved', true)
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
    
    // 3. Calculate featured ad earnings from featured_ads table (by start_date, ignore sol_payments featured_ad entries)
    const { data: featuredAds, error: adsError } = await supabaseAdmin
      .from('featured_ads')
      .select('total_paid_sol, start_date, project_name')
      .eq('is_approved', true)
      .gte('start_date', weekStart.toISOString().split('T')[0])
      .lte('start_date', weekEnd.toISOString().split('T')[0])
      .order('start_date', { ascending: false })
    
    console.log('Featured ads found (by start_date):', featuredAds?.length || 0)
    console.log('Banner ads found (by start_date):', bannerAds?.length || 0)
    console.log('Booster payments found (by creation date):', boosterPayments?.length || 0)
    
    const bannerEarnings = bannerAds?.reduce((sum, ad) => {
      return sum + (parseFloat(ad.total_paid_sol) || parseFloat(ad.price_sol) || 0)
    }, 0) || 0
    const featuredEarnings = featuredAds?.reduce((sum, ad) => {
      return sum + (parseFloat(ad.total_paid_sol) || 0)
    }, 0) || 0
    
    const totalEarnings = boosterEarnings + bannerEarnings + featuredEarnings
    const potAmount = totalEarnings * 0.4
    
    console.log('Correct calculations by timing:', {
      boosterEarnings,
      bannerEarnings,
      featuredEarnings,
      totalEarnings,
      potAmount
    })
    
    return NextResponse.json({
      success: true,
      debug: {
        timeRange: {
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          now: new Date().toISOString(),
          weekInfo
        },
        boosterPayments: {
          count: boosterPayments?.length || 0,
          total: boosterEarnings,
          data: boosterPayments || []
        },
        bannerAds: {
          count: bannerAds?.length || 0,
          total: bannerEarnings,
          data: bannerAds || []
        },
        featuredAds: {
          count: featuredAds?.length || 0,
          total: featuredEarnings,
          data: featuredAds || []
        },
        calculations: {
          boosterEarnings,
          bannerEarnings,
          featuredEarnings,
          totalEarnings,
          potAmount,
          potPercentage: 40
        }
      }
    })
    
  } catch (error) {
    console.error('Error in pot calculation debug:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}
