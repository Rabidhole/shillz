import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

// Solana RPC endpoint - using testnet for testing
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.testnet.solana.com'

export async function POST(request: NextRequest) {
  try {
    const { transactionSignature, expectedAmount, recipientAddress, claimingWalletAddress } = await request.json()

    if (!transactionSignature || !expectedAmount || !recipientAddress || !claimingWalletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters: transactionSignature, expectedAmount, recipientAddress, claimingWalletAddress' },
        { status: 400 }
      )
    }

    // Initialize Solana connection
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed')

    try {
      // Get transaction details
      const transaction = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      })

      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        )
      }

      // Verify transaction is confirmed
      if (!transaction.meta?.err === null) {
        return NextResponse.json(
          { error: 'Transaction failed' },
          { status: 400 }
        )
      }

      // Check if transaction was successful
      if (transaction.meta?.err) {
        return NextResponse.json(
          { error: 'Transaction failed: ' + transaction.meta.err },
          { status: 400 }
        )
      }

      // Verify the recipient address
      const recipientPubkey = new PublicKey(recipientAddress)
      
      // Check if the transaction contains a transfer to our recipient address
      const preBalances = transaction.meta?.preBalances || []
      const postBalances = transaction.meta?.postBalances || []
      const accountKeys = transaction.transaction.message.getAccountKeys()

      let paymentReceived = 0
      let foundRecipient = false

      // Find the recipient in the account keys
      for (let i = 0; i < accountKeys.length; i++) {
        const accountKey = accountKeys.get(i)
        if (accountKey && accountKey.equals(recipientPubkey)) {
          foundRecipient = true
          // Calculate the amount received (difference in balance)
          paymentReceived = (postBalances[i] || 0) - (preBalances[i] || 0)
          break
        }
      }

      if (!foundRecipient) {
        return NextResponse.json(
          { error: 'Recipient address not found in transaction' },
          { status: 400 }
        )
      }

      // CRITICAL SECURITY: Verify the transaction sender matches the claiming wallet
      const claimingPubkey = new PublicKey(claimingWalletAddress)
      const transactionSender = accountKeys.get(0) // First account is typically the fee payer/sender
      
      if (!transactionSender || !transactionSender.equals(claimingPubkey)) {
        return NextResponse.json(
          { 
            error: `Transaction sender (${transactionSender?.toString()}) does not match claiming wallet (${claimingWalletAddress}). Only the wallet that sent the transaction can claim the payment.` 
          },
          { status: 400 }
        )
      }

      // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
      const solReceived = paymentReceived / 1_000_000_000

      // Verify the amount is at least the expected amount (allow overpayments)
      const tolerance = 0.001 // 0.001 SOL tolerance for rounding
      if (solReceived < (expectedAmount - tolerance)) {
        return NextResponse.json(
          { 
            error: `Insufficient payment. Expected at least: ${expectedAmount} SOL, Received: ${solReceived} SOL` 
          },
          { status: 400 }
        )
      }

      // Payment verification successful
      return NextResponse.json({
        success: true,
        payment: {
          id: `sol_${transactionSignature.substring(0, 8)}`,
          transactionHash: transactionSignature,
          amount: solReceived,
          status: 'completed'
        }
      })

    } catch (solanaError) {
      console.error('Solana verification error:', solanaError)
      return NextResponse.json(
        { error: 'Failed to verify transaction on Solana' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
