import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { boosterId, userId, transactionHash, amount } = await request.json()
    
    // Get user details
    const supabase = await createServerSupabaseClient()
    const { data: user, error: userError } = await supabase
      .from('users_new')
      .select('wallet_address')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get booster details
    const { data: booster, error: boosterError } = await supabase
      .from('booster_packs')
      .select('name, multiplier, duration_hours')
      .eq('id', boosterId)
      .single()

    if (boosterError || !booster) {
      return NextResponse.json({ error: 'Booster not found' }, { status: 404 })
    }

    // Create notification payload
    const notification = {
      type: 'booster_purchased',
      title: '🚀 New Booster Purchase!',
      message: `User ${user.wallet_address.substring(0, 8)}... purchased ${booster.name} (${booster.multiplier}x for ${booster.duration_hours}h) for ${amount} SOL`,
      data: {
        userId,
        boosterId,
        transactionHash,
        amount,
        boosterName: booster.name,
        multiplier: booster.multiplier,
        duration: booster.duration_hours,
        walletAddress: user.wallet_address
      },
      timestamp: new Date().toISOString()
    }

    // Here you can add different notification methods:
    
    // 1. Console log (for development)
    console.log('🎉 BOOSTER PURCHASE NOTIFICATION:', notification)
    
    // 2. Webhook to external service (Discord, Slack, etc.)
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🚀 **New Booster Purchase!**\n` +
                    `**User:** \`${user.wallet_address.substring(0, 8)}...\`\n` +
                    `**Booster:** ${booster.name} (${booster.multiplier}x for ${booster.duration_hours}h)\n` +
                    `**Amount:** ${amount} SOL\n` +
                    `**Transaction:** \`${transactionHash.substring(0, 16)}...\`\n` +
                    `**Time:** ${new Date().toLocaleString()}`
          })
        })
      } catch (error) {
        console.error('Discord webhook failed:', error)
      }
    }

    // 3. Email notification (if you have email service)
    if (process.env.ADMIN_EMAIL) {
      // Add email sending logic here
      console.log('📧 Email notification would be sent to:', process.env.ADMIN_EMAIL)
    }

    return NextResponse.json({ success: true, notification })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
