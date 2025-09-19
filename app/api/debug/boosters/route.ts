import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    console.log('=== DEBUG: Checking database contents ===')

    // Check booster_packs
    const { data: boosterPacks, error: packsError } = await supabaseAdmin
      .from('booster_packs')
      .select('*')

    console.log('Booster packs:', { boosterPacks, packsError })

    // Check users_new
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users_new')
      .select('id, telegram_username, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Recent users:', { users, usersError })

    // Check user_boosters
    const { data: userBoosters, error: boostersError } = await supabaseAdmin
      .from('user_boosters')
      .select(`
        *,
        booster_pack:booster_packs(*)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('User boosters:', { userBoosters, boostersError })

    return NextResponse.json({
      boosterPacks: boosterPacks || [],
      users: users || [],
      userBoosters: userBoosters || [],
      errors: {
        packsError,
        usersError,
        boostersError
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
