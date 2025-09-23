'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSolPayments } from '../hooks/useSolPayments'

interface SolPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount: number
  recipientAddress: string
  claimingWalletAddress: string
  onPaymentSuccess: (payment: { id: string; transactionHash: string }) => void
  description?: string
}

export function SolPaymentModal({
  isOpen,
  onClose,
  amount,
  recipientAddress,
  claimingWalletAddress,
  onPaymentSuccess,
  description = 'Payment for booster'
}: SolPaymentModalProps) {
  // Check if we're on testnet
  const isTestnet = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'testnet'
  const [transactionSignature, setTransactionSignature] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const { verifyPayment, isProcessing, error, success } = useSolPayments({
    recipientAddress,
    claimingWalletAddress
  })

  const handleVerifyPayment = async () => {
    if (!transactionSignature.trim()) {
      return
    }

    setIsVerifying(true)
    try {
      const payment = await verifyPayment(transactionSignature, amount)
      onPaymentSuccess(payment)
      onClose()
    } catch (error) {
      console.error('Payment verification failed:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(recipientAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  const handleClose = () => {
    setTransactionSignature('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-6 w-full max-w-md">
        <div className="text-2xl font-bold text-purple-400 mb-4">
          💰 SOL Payment {isTestnet && <span className="text-blue-400 text-sm">🌐 TESTNET</span>}
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Payment Details</div>
            <div className="text-white font-semibold">{description}</div>
            <div className="text-lg text-purple-400 font-bold">{amount} SOL {isTestnet && <span className="text-blue-400 text-sm">(Testnet)</span>}</div>
            <div className="text-xs text-gray-500 mt-1">
              Recipient: {recipientAddress.substring(0, 8)}...{recipientAddress.substring(recipientAddress.length - 8)}
              {isTestnet && <span className="text-blue-400 ml-1">(Testnet)</span>}
            </div>
            {isTestnet && (
              <div className="text-xs text-blue-400 mt-2">
                💡 Use testnet SOL from a faucet - no real money required!
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-sm text-blue-400 mb-2">📋 Payment Instructions</div>
              <div className="text-sm text-gray-300 space-y-2">
                <p>1. Open your Solana wallet (Phantom, Solflare, etc.)</p>
                <p>2. Send exactly <span className="font-bold text-purple-400">{amount} SOL</span> to:</p>
                <div className="bg-gray-800 rounded p-2 font-mono text-xs break-all">
                  {recipientAddress}
                </div>
                <p>3. Copy the transaction signature and paste it below</p>
              </div>
            </div>
            
            <Button
              onClick={handleCopyAddress}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {copied ? '✅ Copied!' : '📋 Copy Recipient Address'}
            </Button>
            
            <div className="text-center text-gray-400 text-sm">
              After sending, paste the transaction signature below:
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-300">
                Transaction Signature
              </label>
              <input
                type="text"
                value={transactionSignature}
                onChange={(e) => setTransactionSignature(e.target.value)}
                placeholder="Paste transaction signature here..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <Button
                onClick={handleVerifyPayment}
                disabled={!transactionSignature.trim() || isVerifying || isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isVerifying || isProcessing ? 'Verifying...' : 'Verify Payment'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <div className="text-green-400 text-sm">✅ Payment verified successfully!</div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
