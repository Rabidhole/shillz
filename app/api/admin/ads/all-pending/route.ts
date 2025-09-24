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
    console.log('Fetching all pending ads from database...')
    
    // Fetch pending banner ads
    const { data: bannerAds, error: bannerError } = await supabaseAdmin
      .from('ad_slots')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })

    if (bannerError) {
      console.error('Error fetching pending banner ads:', bannerError)
    }

    // Fetch pending featured ads
    const { data: featuredAds, error: featuredError } = await supabaseAdmin
      .from('featured_ads')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })

    if (featuredError) {
      console.error('Error fetching pending featured ads:', featuredError)
    }

    // Combine and format the ads
    const allAds = [
      ...(bannerAds || []).map(ad => ({
        ...ad,
        type: 'banner',
        display_name: ad.title,
        display_url: ad.link_url,
        display_image: ad.image_url,
        display_handle: ad.telegram_handle,
        price_display: `${ad.ton_amount} SOL`,
        start_date: ad.start_date,
        end_date: ad.end_date
      })),
      ...(featuredAds || []).map(ad => ({
        ...ad,
        type: 'featured',
        display_name: ad.project_name,
        display_url: ad.project_url,
        display_image: ad.project_logo_url,
        display_handle: ad.wallet_address,
        price_display: `${ad.total_paid_sol} SOL`,
        start_date: ad.start_date,
        end_date: ad.end_date
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('Found pending ads:', {
      banner: bannerAds?.length || 0,
      featured: featuredAds?.length || 0,
      total: allAds.length
    })

    return NextResponse.json(allAds)

  } catch (error) {
    console.error('Error in all pending ads route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}
