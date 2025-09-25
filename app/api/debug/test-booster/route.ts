import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const testWalletAddress = process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || '0x18521c6f092B2261f7E2771A4D02c3cC7010DDE3' // Use admin wallet for testing
    
    console.log('=== TESTING BOOSTER SYSTEM ===')
    console.log('Test wallet address:', testWalletAddress)

    // Step 1: Find or create user
    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', testWalletAddress)
      .single()
    let user = userRow

    if (userError && userError.code === 'PGRST116') {
      console.log('User not found, creating...')
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: testWalletAddress,
          tier: 'degen',
          total_shills: 0,
          daily_shills: 0,
          weekly_shills: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
      user = newUser
    } else if (userError) {
      console.error('Error finding user:', userError)
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 })
    }

    console.log('User:', user)

    // Step 2: Check for booster packs
    const { data: packs, error: packsError } = await supabaseAdmin
      .from('booster_packs')
      .select('*')

    console.log('Booster packs:', { packs, packsError })

    if (!packs || packs.length === 0) {
      return NextResponse.json({ error: 'No booster packs found' }, { status: 500 })
    }

    // Step 3: Create a test booster
    const testPack = packs[0] // Use first available pack
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + testPack.duration_hours)

    console.log('Creating test booster...', {
      userId: user.id,
      packId: testPack.id,
      expiresAt: expiresAt.toISOString()
    })

    const { data: booster, error: boosterError } = await supabaseAdmin
      .from('user_boosters')
      .insert({
        user_id: user.id,
        booster_pack_id: testPack.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        purchased_at: new Date().toISOString(),
        transaction_hash: `test-${Date.now()}`
      })
      .select()
      .single()

    console.log('Booster creation result:', { booster, boosterError })

    if (boosterError) {
      console.error('Error creating booster:', boosterError)
      return NextResponse.json({ error: boosterError.message }, { status: 500 })
    }

    // Step 4: Test fetching boosters
    const { data: userBoosters, error: fetchError } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())

    console.log('Fetched boosters:', { userBoosters, fetchError })

    return NextResponse.json({
      success: true,
      user,
      testBooster: booster,
      fetchedBoosters: userBoosters,
      boosterPack: testPack
    })

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
