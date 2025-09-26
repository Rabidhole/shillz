import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentWeekPeriod } from '@/lib/weekly-period'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
    
    console.log('Testing pot logic with week:', {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    })
    
    // Test featured ads
    const { data: featuredAds } = await supabaseAdmin
      .from('featured_ads')
      .select('total_paid_sol, start_date, end_date, is_approved')
      .eq('is_approved', true)
      .or(`and(start_date.lte.${weekEnd.toISOString().split('T')[0]},end_date.gte.${weekStart.toISOString().split('T')[0]})`)
    
    // Test banner ads
    const { data: bannerAds } = await supabaseAdmin
      .from('ad_slots')
      .select('price_sol, start_date, end_date, is_approved')
      .eq('is_approved', true)
      .or(`and(start_date.lte.${weekEnd.toISOString().split('T')[0]},end_date.gte.${weekStart.toISOString().split('T')[0]})`)
    
    // Test boosters
    const { data: userBoosters } = await supabaseAdmin
      .from('user_boosters')
      .select('purchased_at, booster_pack_id')
      .gte('purchased_at', weekStart.toISOString())
      .lte('purchased_at', weekEnd.toISOString())
    
    const { data: boosterPacks } = await supabaseAdmin
      .from('booster_packs')
      .select('id, price_sol')
    
    const featuredEarnings = featuredAds?.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0) || 0
    const bannerEarnings = bannerAds?.reduce((sum, ad) => sum + (parseFloat(ad.price_sol) || 0), 0) || 0
    const boosterEarnings = userBoosters?.reduce((sum, ub) => {
      const pack = boosterPacks?.find(bp => bp.id === ub.booster_pack_id)
      return sum + (parseFloat(pack?.price_sol) || 0)
    }, 0) || 0
    
    const totalEarnings = featuredEarnings + bannerEarnings + boosterEarnings
    const potAmount = totalEarnings * 0.4
    
    return NextResponse.json({
      success: true,
      weekPeriod: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      },
      featuredAds: featuredAds || [],
      bannerAds: bannerAds || [],
      userBoosters: userBoosters || [],
      calculations: {
        featuredEarnings,
        bannerEarnings,
        boosterEarnings,
        totalEarnings,
        potAmount
      }
    })
    
  } catch (error) {
    console.error('Error testing pot logic:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
