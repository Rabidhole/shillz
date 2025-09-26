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
    
    console.log('Current week period:', {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    })
    
    // Get all featured ads
    const { data: allFeaturedAds } = await supabaseAdmin
      .from('featured_ads')
      .select('id, project_name, start_date, end_date, total_paid_sol, is_approved, created_at')
      .order('created_at', { ascending: false })
    
    // Get all banner ads
    const { data: allBannerAds } = await supabaseAdmin
      .from('ad_slots')
      .select('id, title, start_date, end_date, price_sol, is_approved, created_at')
      .order('created_at', { ascending: false })
    
    // Check which ads would be counted with current logic
    const currentWeekStart = weekStart.toISOString().split('T')[0]
    const currentWeekEnd = weekEnd.toISOString().split('T')[0]
    
    const featuredAdsInCurrentWeek = allFeaturedAds?.filter(ad => {
      const startDate = ad.start_date
      const endDate = ad.end_date
      return ad.is_approved && 
             startDate <= currentWeekEnd && 
             endDate >= currentWeekStart
    }) || []
    
    const bannerAdsInCurrentWeek = allBannerAds?.filter(ad => {
      const startDate = ad.start_date
      const endDate = ad.end_date
      return ad.is_approved && 
             startDate <= currentWeekEnd && 
             endDate >= currentWeekStart
    }) || []
    
    return NextResponse.json({
      success: true,
      currentWeek: {
        start: currentWeekStart,
        end: currentWeekEnd
      },
      allFeaturedAds: allFeaturedAds || [],
      allBannerAds: allBannerAds || [],
      featuredAdsInCurrentWeek,
      bannerAdsInCurrentWeek,
      totalFeaturedEarnings: featuredAdsInCurrentWeek.reduce((sum, ad) => sum + (parseFloat(ad.total_paid_sol) || 0), 0),
      totalBannerEarnings: bannerAdsInCurrentWeek.reduce((sum, ad) => sum + (parseFloat(ad.price_sol) || 0), 0)
    })
    
  } catch (error) {
    console.error('Error checking ad dates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
