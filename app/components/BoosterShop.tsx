'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { useReownWallet } from '../hooks/useReownWallet'
import { SolPaymentModal } from './SolPaymentModal'

interface BoosterShopProps {
  userId?: string
  telegram?: {
    ton?: {
      sendPayment: (params: { amount: number }) => Promise<{ ok: boolean; transaction_id: string }>
    }
  }
}

const BOOSTERS = [
  {
    id: '2x-1h',
    name: 'Quick Boost',
    description: 'Double your shill power for 1 hour! Perfect for quick pumps.',
    priceUsd: 0.99,
    priceSol: 0.01, // ~$0.99 at $100 SOL
    multiplier: 2.0,
    duration: 1,
    color: 'green'
  },
  {
    id: '4x-4h',
    name: 'Power Boost',
    description: 'Quadruple your shill power for 4 hours! Best value for serious shillers.',
    priceUsd: 2.99,
    priceSol: 0.03, // ~$2.99 at $100 SOL
    multiplier: 4.0,
    duration: 4,
    color: 'purple'
  }
] as const

function normalizeWalletAddress(input?: string): string {
  const raw = (input || '').trim()
  if (!raw) return 'anonymous'
  // Remove @ prefix if present
  return raw.startsWith('@') ? raw.substring(1) : raw
}

export function BoosterShop({ userId = 'anonymous' }: BoosterShopProps) {
  const { isConnected, address, chainId, error: walletError, openModal, clearError, switchToSolana } = useReownWallet()
  // Use connected wallet address if available, otherwise fall back to userId
  const effectiveUserId = isConnected && address ? address : userId
  const normalizedUser = normalizeWalletAddress(effectiveUserId)
  const { activeBoosters, totalMultiplier, nextExpiring } = useUserBoosters(normalizedUser)

  // Debug logging
  console.log('BoosterShop Debug:', {
    isConnected,
    address,
    userId,
    effectiveUserId,
    normalizedUser,
    walletError
  })
  const [loadingBoosterId, setLoadingBoosterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState<{ open: boolean; packId?: string }>(() => ({ open: false }))
  const [showFailure, setShowFailure] = useState<{ open: boolean; message?: string }>(() => ({ open: false }))
  const [showWalletPrompt, setShowWalletPrompt] = useState<{ open: boolean }>(() => ({ open: false }))
  const [showSolPayment, setShowSolPayment] = useState<{ open: boolean; packId?: string; amount?: number }>(() => ({ open: false }))

  const hasActiveBooster = activeBoosters.length > 0
  const isOnSolana = chainId === 101 || chainId === 102 || chainId === 103 || !chainId

  // Check if we're in test mode
  const isTestMode = process.env.NODE_ENV === 'development'
  
  // Testnet configuration
  const isTestnet = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'testnet'
  
  // SOL payment configuration - use testnet address for development, mainnet for production
  const SOL_RECIPIENT_ADDRESS = isTestnet 
    ? (process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || 'YourTestnetSolanaAddressHere')
    : (process.env.NEXT_PUBLIC_SOL_RECIPIENT_ADDRESS || 'YourMainnetSolanaAddressHere')
  
  // Debug logging
  console.log('SOL Payment Debug:', {
    isTestnet,
    testEnvVar: process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS,
    mainEnvVar: process.env.NEXT_PUBLIC_SOL_RECIPIENT_ADDRESS,
    finalAddress: SOL_RECIPIENT_ADDRESS
  })
  // const SOL_PRICE_USD = 100 // This should be fetched from a price API
//check
  const handlePurchase = async (packId: string) => {
    // Check if wallet is connected
    if (!isConnected || !address) {
      setShowWalletPrompt({ open: true })
      return
    }

    // Check if on Solana network
    if (!isOnSolana) {
      setError('Please switch to Solana network to make purchases')
      setShowFailure({ open: true, message: 'Please switch to Solana network to make purchases' })
      return
    }

    if (hasActiveBooster) {
      setError('You already have an active booster. Wait for it to expire before purchasing another one.')
      setShowFailure({ open: true, message: 'You already have an active booster. Please wait until it expires.' })
      return
    }

    setLoadingBoosterId(packId)
    setError(null)

    try {
      console.log('Attempting to purchase booster:', {
        packId,
        walletAddress: address,
        testMode: isTestMode
      })

      // Always use SOL payment flow (even in test mode, but on testnet)
      const booster = BOOSTERS.find(b => b.id === packId)
      if (!booster) {
        throw new Error('Booster not found')
      }
      
      // Use predefined SOL amount
      const solAmount = booster.priceSol
      
      setShowSolPayment({ 
        open: true, 
        packId: packId, 
        amount: solAmount 
      })
    } catch (error) {
      console.error('Error purchasing booster:', error)
      setError(error instanceof Error ? error.message : 'Failed to purchase booster. Please try again.')
    } finally {
      setLoadingBoosterId(null)
    }
  }

  const handleSolPaymentSuccess = async (payment: { id: string; transactionHash: string }) => {
    if (!showSolPayment.packId) return
    
    try {
      // Complete the booster purchase with SOL payment
      const response = await fetch('/api/boosters/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: showSolPayment.packId,
          paymentMethod: 'sol',
          walletAddress: address,
          paymentId: payment.id,
          transactionHash: payment.transactionHash
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete purchase')
      }

      setShowSuccess({ open: true, packId: showSolPayment.packId })
      setShowSolPayment({ open: false })
    } catch (error) {
      console.error('Error completing SOL payment:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete purchase')
      setShowFailure({ open: true, message: 'Failed to complete purchase' })
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Booster Shop {isTestMode && <span className="text-yellow-400 text-sm">🧪 TEST MODE</span>}
          {isTestnet && <span className="text-blue-400 text-sm ml-2">🌐 TESTNET</span>}
        </h1>
        <p className="text-gray-400">Power up your shills with these boosters!</p>
        {/* Debug connection status */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-500">
            Wallet: {isConnected ? '✅ Connected' : '❌ Not Connected'} | 
            Address: {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 'None'}
          </div>
        )}
        <div className="mt-2 text-sm">
          <p className="text-gray-400">Logged in as: <span className="text-white font-mono">{normalizedUser}</span></p>
          {isTestMode && (
            <p className="text-yellow-400">Test Mode Active - No real payments required</p>
          )}
        </div>
      </div>

      {/* Active Booster Display */}
      {hasActiveBooster && nextExpiring && (
        <div className="mb-8 p-4 bg-purple-900/20 rounded-lg">
          <h2 className="text-xl font-bold text-purple-400 mb-2">Active Booster</h2>
          <div className="text-2xl font-bold text-white mb-2">
            {totalMultiplier.toFixed(1)}x Multiplier Active
          </div>
          <div className="text-gray-400">
            Time remaining: {getTimeRemaining(nextExpiring.expires_at)}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-900/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Success Modal */}
      {showSuccess.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-green-500/30 rounded-xl p-6 w-full max-w-md">
            <div className="text-2xl font-bold text-green-400 mb-2">Purchase Successful</div>
            <div className="text-gray-300 mb-6">Your booster {showSuccess.packId ? `(${showSuccess.packId})` : ''} is now active. Enjoy the boost!</div>
            <div className="flex items-center justify-end gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowSuccess({ open: false })
                  window.location.reload()
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {showFailure.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-red-500/30 rounded-xl p-6 w-full max-w-md">
            <div className="text-2xl font-bold text-red-400 mb-2">Purchase Failed</div>
            <div className="text-gray-300 mb-6">{showFailure.message || 'We could not complete your purchase. Please try again.'}</div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowFailure({ open: false })}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Error Display */}
      {walletError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-red-500/30 rounded-xl p-6 w-full max-w-md">
            <div className="text-2xl font-bold text-red-400 mb-2">⚠️ Wallet Error</div>
            <div className="text-gray-300 mb-6">{walletError}</div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={clearError}
              >
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  clearError()
                  openModal()
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connection Prompt Modal */}
      {showWalletPrompt.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-6 w-full max-w-md">
            <div className="text-2xl font-bold text-yellow-400 mb-2">🔗 Wallet Required</div>
            <div className="text-gray-300 mb-6">
              You need to connect your wallet to purchase boosters. This allows us to track your purchases and apply boosters to your account.
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowWalletPrompt({ open: false })}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowWalletPrompt({ open: false })
                  clearError() // Clear any previous errors
                  openModal() // Open wallet connection modal
                }}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Booster Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {BOOSTERS.map((booster) => (
          <div 
            key={booster.id}
            className={`bg-gradient-to-br from-${booster.color}-900/50 to-${booster.color}-700/30 rounded-xl p-6 border border-${booster.color}-500/20`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{booster.name}</h3>
                {booster.id === '4x-4h' && (
                  <div className={`text-${booster.color}-400 text-sm`}>Best Value!</div>
                )}
              </div>
              <div className={`text-${booster.color}-400 font-bold text-right`}>
                <div>{booster.priceSol} SOL</div>
                <div className="text-xs text-gray-400">~${booster.priceUsd}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className={`text-3xl font-bold text-${booster.color}-400`}>
                {booster.multiplier}x
              </div>
              <p className="text-gray-300">{booster.description}</p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>✓ {booster.duration} hour{booster.duration > 1 ? 's' : ''} of boosted shills</li>
                <li>✓ Instant activation</li>
                {booster.id === '4x-4h' && <li>✓ Best value per hour</li>}
                {booster.multiplier === 4 && <li>✓ Maximum power</li>}
              </ul>
              <Button
                onClick={() => !isOnSolana ? switchToSolana() : handlePurchase(booster.id)}
                disabled={loadingBoosterId !== null || hasActiveBooster}
                className={`w-full bg-${booster.color}-600 hover:bg-${booster.color}-700 disabled:opacity-50`}
              >
                {loadingBoosterId === booster.id ? 'Processing...' : 
                 hasActiveBooster ? 'Already Have Active Booster' : 
                 !isConnected || !address ? 'Connect Solana Wallet' :
                 !isOnSolana ? 'Switch to Solana' :
                 isTestnet ? 'Pay with Testnet SOL' : 
                 'Pay with SOL'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Value Comparison */}
      <div className="mt-8 text-center text-sm text-gray-400">
        {BOOSTERS.map(booster => (
          <p key={booster.id}>
            {booster.name}: {(booster.priceSol / booster.duration).toFixed(3)} SOL per hour of {booster.multiplier}x boost
          </p>
        ))}
      </div>

      {/* SOL Payment Modal */}
      {showSolPayment.open && showSolPayment.amount && (
        <SolPaymentModal
          isOpen={showSolPayment.open}
          onClose={() => setShowSolPayment({ open: false })}
          amount={showSolPayment.amount}
          recipientAddress={SOL_RECIPIENT_ADDRESS}
          claimingWalletAddress={address || 'anonymous'}
          onPaymentSuccess={handleSolPaymentSuccess}
          description={`${BOOSTERS.find(b => b.id === showSolPayment.packId)?.name || 'Booster'} - ${showSolPayment.amount.toFixed(4)} SOL`}
        />
      )}
    </div>
  )
}