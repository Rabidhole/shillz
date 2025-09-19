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
  description: string
  price_ton: number
  multiplier: number
  duration_hours: number
  max_uses: number | null
  created_at: string
  updated_at: string
}

interface UserBooster {
  id: string
  user_id: string
  booster_pack_id: string
  is_active: boolean
  uses_remaining: number | null
  expires_at: string
  payment_id: string
  ton_amount: number
  created_at: string
  updated_at: string
  booster_pack?: BoosterPack
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await context.params

    // For anonymous users, return empty boosters array
    if (userId === 'anonymous') {
      return NextResponse.json({ 
        boosters: [],
        totalMultiplier: 1
      })
    }

    // First, deactivate any expired boosters
    await supabaseAdmin
      .from('user_boosters')
      .update({ is_active: false })
      .eq('user_id', userId)
      .lt('expires_at', new Date().toISOString())

    // Get active boosters with booster pack details
    const { data: boosters, error } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    if (error) {
      console.error('Error fetching user boosters:', error)
      return NextResponse.json(
        { error: error.message }, 
        { status: 400 }
      )
    }

    // Calculate total multiplier
    const totalMultiplier = (boosters || []).reduce((total, booster: UserBooster) => {
      return total + (booster.booster_pack?.multiplier || 1) - 1
    }, 1)

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