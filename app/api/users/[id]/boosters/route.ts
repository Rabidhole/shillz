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

interface BoosterPack {
  id: string
  name: string
  description: string | null
  price_usd: number
  multiplier: number
  duration_hours: number
  max_uses: number | null
  is_active: boolean | null
  created_at: string | null
}

interface UserBooster {
  id: string
  user_id: string | null
  booster_pack_id: string | null
  purchased_at: string | null
  expires_at: string
  is_active: boolean | null
  transaction_hash: string | null
  booster_pack?: BoosterPack
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: walletAddress } = await context.params
    console.log('Boosters API called with wallet address:', walletAddress)

    // For anonymous users, still check the database since they might have boosters
    // Don't shortcut here - let the normal flow handle it

    // Find the user by wallet address (telegram_username)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users_new')
      .select('id')
      .eq('telegram_username', walletAddress)
      .single()

    console.log('User lookup result:', { user, userError })

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error finding user:', userError)
      return NextResponse.json(
        { error: 'User not found' }, 
        { status: 404 }
      )
    }

    // If user doesn't exist, return empty boosters
    if (!user) {
      console.log('User not found - returning empty boosters')
      return NextResponse.json({ 
        boosters: [],
        totalMultiplier: 1
      })
    }

    console.log('Found user with ID:', user.id)

    // First, deactivate any expired boosters
    await supabaseAdmin
      .from('user_boosters')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString())

    // Get active boosters with booster pack details
    const { data: boosters, error } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    console.log('Boosters query result:', { boosters, error })

    if (error) {
      console.error('Error fetching user boosters:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }

    // Calculate total multiplier - use the highest multiplier (since only one booster can be active)
    let totalMultiplier = 1
    if (boosters && boosters.length > 0) {
      // Since only one booster can be active at a time, just use the multiplier from the first booster
      totalMultiplier = boosters[0].booster_pack?.multiplier || 1
      console.log('Active booster multiplier:', totalMultiplier)
    }

    console.log('Final result:', { boosters: boosters || [], totalMultiplier })

    return NextResponse.json({ 
      boosters: boosters || [],
      totalMultiplier
    })

  } catch (error) {
    console.error('Error in user boosters route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}