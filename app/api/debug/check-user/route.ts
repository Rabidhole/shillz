import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    console.log('=== CHECKING USER BOOSTERS ===')
    console.log('Wallet address:', walletAddress)

    // Find user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    console.log('User lookup:', { user, userError })

    if (!user) {
      return NextResponse.json({ 
        found: false,
        message: 'User not found',
        walletAddress
      })
    }

    // Check ALL user boosters (active and inactive)
    const { data: allBoosters, error: allError } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('All boosters:', { allBoosters, allError })

    // Check only active boosters
    const { data: activeBoosters, error: activeError } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())

    console.log('Active boosters:', { activeBoosters, activeError })

    // Check expired boosters
    const { data: expiredBoosters, error: expiredError } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())

    console.log('Expired boosters:', { expiredBoosters, expiredError })

    return NextResponse.json({
      found: true,
      user,
      allBoosters: allBoosters || [],
      activeBoosters: activeBoosters || [],
      expiredBoosters: expiredBoosters || [],
      walletAddress
    })

  } catch (error) {
    console.error('Check user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
