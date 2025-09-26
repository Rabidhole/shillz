import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { TelegramNotifications } from '@/app/lib/telegram-notifications'

// Solana RPC endpoint
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com'

export async function GET(request: NextRequest) {
  try {
    const recipientAddress = process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || process.env.NEXT_PUBLIC_SOL_RECIPIENT_ADDRESS
    
    if (!recipientAddress) {
      return NextResponse.json({ error: 'Recipient address not configured' }, { status: 500 })
    }

    console.log('🔍 Monitoring wallet for new transactions:', recipientAddress)
    
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    const recipientPubkey = new PublicKey(recipientAddress)
    
    // Get recent transactions for the recipient address
    const signatures = await connection.getSignaturesForAddress(recipientPubkey, { limit: 10 })
    
    console.log(`📊 Found ${signatures.length} recent transactions`)
    
    // Check each transaction for SOL transfers
    for (const sig of signatures) {
      try {
        const transaction = await connection.getTransaction(sig.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        })
        
        if (!transaction || transaction.meta?.err) continue
        
        // Check if this is a SOL transfer to our address
        const preBalances = transaction.meta?.preBalances || []
        const postBalances = transaction.meta?.postBalances || []
        const accountKeys = transaction.transaction.message.getAccountKeys()
        
        // Find our recipient in the account keys
        let paymentReceived = 0
        let senderAddress = ''
        
        for (let i = 0; i < accountKeys.length; i++) {
          const accountKey = accountKeys.get(i)
          if (accountKey && accountKey.equals(recipientPubkey)) {
            // Calculate the amount received
            paymentReceived = (postBalances[i] || 0) - (preBalances[i] || 0)
            
            // Get sender (first account is usually the fee payer/sender)
            const sender = accountKeys.get(0)
            senderAddress = sender?.toString() || 'Unknown'
            break
          }
        }
        
        if (paymentReceived > 0) {
          const solAmount = paymentReceived / 1_000_000_000 // Convert lamports to SOL
          
          console.log(`💰 SOL received: ${solAmount} SOL from ${senderAddress}`)
          
          // Send notification
          await TelegramNotifications.sendMessage(
            `💰 *SOL Received!*\n\n` +
            `👤 From: \`${senderAddress}\`\n` +
            `💰 Amount: ${solAmount} SOL\n` +
            `🔗 TX: \`${sig.signature}\`\n` +
            `⏰ Time: ${new Date().toLocaleString()}`
          )
        }
        
      } catch (txError) {
        console.error('Error processing transaction:', txError)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Checked ${signatures.length} transactions`,
      recipientAddress 
    })
    
  } catch (error) {
    console.error('Wallet monitoring error:', error)
    return NextResponse.json(
      { error: 'Failed to monitor wallet' },
      { status: 500 }
    )
  }
}
