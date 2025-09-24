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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { walletAddress } = await request.json()
    const adId = params.id

    console.log('Approving featured ad:', { adId, walletAddress })

    // Update the featured ad to approved
    const { data, error } = await supabaseAdmin
      .from('featured_ads')
      .update({ is_approved: true })
      .eq('id', adId)
      .select()

    if (error) {
      console.error('Error approving featured ad:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Featured ad not found' },
        { status: 404 }
      )
    }

    console.log('Featured ad approved successfully:', data[0])
    return NextResponse.json({ success: true, ad: data[0] })

  } catch (error) {
    console.error('Error in featured ad approval:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
