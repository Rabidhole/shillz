// Telegram notification service for admin alerts
export class TelegramNotifications {
  private static botToken = process.env.TELEGRAM_NOTIFICATION_BOT_TOKEN
  private static chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  static async sendMessage(message: string) {
    console.log('🔔 Attempting to send Telegram notification...')
    console.log('Bot token exists:', !!this.botToken)
    console.log('Chat ID exists:', !!this.chatId)
    console.log('Bot token value (first 10 chars):', this.botToken ? this.botToken.substring(0, 10) + '...' : 'undefined')
    console.log('Chat ID value:', this.chatId)
    
    if (!this.botToken || !this.chatId) {
      console.log('❌ Telegram notifications not configured - missing bot token or chat ID')
      return
    }

    try {
      console.log('📤 Sending message to Telegram...')
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      })
      
      const result = await response.json()
      console.log('📨 Telegram API response:', result)
      
      if (!result.ok) {
        console.error('❌ Telegram API error:', result.description)
      } else {
        console.log('✅ Telegram notification sent successfully!')
      }
    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error)
    }
  }

  static async notifyBoosterPurchase(data: {
    user: string
    boosterType: string
    amount: number
    transactionHash: string
  }) {
    const message = `🚀 *Booster Purchased!*\n\n` +
      `👤 User: \`${data.user}\`\n` +
      `⚡ Type: ${data.boosterType}\n` +
      `💰 Amount: ${data.amount} SOL\n` +
      `🔗 TX: \`${data.transactionHash}\`\n` +
      `⏰ Time: ${new Date().toLocaleString()}`

    await this.sendMessage(message)
  }

  static async notifyAdBooking(data: {
    project: string
    adType: 'banner' | 'featured'
    dates: string
    amount: number
    transactionHash: string
  }) {
    const emoji = data.adType === 'banner' ? '📢' : '⭐'
    const message = `${emoji} *Ad Booked!*\n\n` +
      `🏢 Project: ${data.project}\n` +
      `📅 Dates: ${data.dates}\n` +
      `💰 Amount: ${data.amount} SOL\n` +
      `🔗 TX: \`${data.transactionHash}\`\n` +
      `⏰ Time: ${new Date().toLocaleString()}`

    await this.sendMessage(message)
  }
}
