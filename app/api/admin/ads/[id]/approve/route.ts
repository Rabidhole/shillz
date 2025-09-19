import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '@/app/types/database'

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

const ADMIN_WALLET = '0x18521c6f092B2261f7E2771A4D02c3cC7010DDE3'

type AdSlotUpdate = Database['public']['Tables']['ad_slots']['Update']

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await context.params
    const { walletAddress } = await request.json()

    // Verify admin wallet
    console.log('Attempting admin verification:')
    console.log('Provided wallet:', walletAddress)
    console.log('Admin wallet:', ADMIN_WALLET)
    console.log('Lowercase comparison:', {
      provided: walletAddress?.toLowerCase(),
      admin: ADMIN_WALLET.toLowerCase()
    })

    if (!walletAddress || walletAddress.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return NextResponse.json(
        { error: `Unauthorized: Admin access required. Connected: ${walletAddress}` },
        { status: 403 }
      )
    }

    const updateData: AdSlotUpdate = {
      is_approved: true,
      updated_at: new Date().toISOString()
    }

    // Approve the ad
    type DbResult<T> = T extends PromiseLike<infer U> ? U : never
    type AdSlotResponse = DbResult<ReturnType<typeof supabaseAdmin.from<'ad_slots'>>>
    
    const query = supabaseAdmin.from('ad_slots')
    const { data: approvedAd, error } = await (query as AdSlotResponse)
      .update(updateData)
      .eq('id', adId)
      .select()
      .single()

    if (error) {
      console.error('Error approving ad:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      ad: approvedAd
    })

  } catch (error) {
    console.error('Error in approve ad route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}