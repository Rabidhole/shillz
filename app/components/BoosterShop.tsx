'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { useTonPrice } from '../hooks/useTonPrice'
import { useReownWallet } from '../hooks/useReownWallet'

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
    multiplier: 2.0,
    duration: 1,
    color: 'green'
  },
  {
    id: '4x-4h',
    name: 'Power Boost',
    description: 'Quadruple your shill power for 4 hours! Best value for serious shillers.',
    priceUsd: 2.99,
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
  const { isConnected, address, error: walletError, openModal, clearError } = useReownWallet()
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
  const { formatUsdWithTon, price: tonPrice, isLoading: isPriceLoading } = useTonPrice()
  const [loadingBoosterId, setLoadingBoosterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState<{ open: boolean; packId?: string }>(() => ({ open: false }))
  const [showFailure, setShowFailure] = useState<{ open: boolean; message?: string }>(() => ({ open: false }))
  const [showWalletPrompt, setShowWalletPrompt] = useState<{ open: boolean }>(() => ({ open: false }))

  const hasActiveBooster = activeBoosters.length > 0

  // Check if we're in test mode
  const isTestMode = process.env.NODE_ENV === 'development'
//check
  const handlePurchase = async (packId: string) => {
    // Check if wallet is connected
    if (!isConnected || !address) {
      setShowWalletPrompt({ open: true })
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
        testMode: true
      })

      // In test mode, simulate a successful payment
      const response = await fetch('/api/boosters/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: packId,
          paymentMethod: 'test',
          walletAddress: address, // Use the connected wallet address
          testMode: true
        }),
      })

      const data = await response.json()
      console.log('Purchase response:', {
        status: response.status,
        ok: response.ok,
        data
      })

      if (!response.ok) {
        let errorMessage = data.error || 'Failed to purchase booster'
        
        // Handle specific database constraint errors
        if (data.error && data.error.includes('duplicate key value violates unique constraint')) {
          if (data.error.includes('idx_one_active_booster_per_user')) {
            errorMessage = 'You already have an active booster. Please wait for it to expire before purchasing another one.'
          }
        }
        
        console.error('Purchase failed:', {
          status: response.status,
          error: errorMessage,
          fullError: data
        })
        
        setShowFailure({ open: true, message: errorMessage })
        throw new Error(errorMessage)
      }

      // Success - show success message briefly then refresh
      setError(null)
      console.log('Booster purchased successfully!')
      setShowSuccess({ open: true, packId })
    } catch (error) {
      console.error('Error purchasing booster:', error)
      setError(error instanceof Error ? error.message : 'Failed to purchase booster. Please try again.')
    } finally {
      setLoadingBoosterId(null)
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
        {tonPrice && (
          <p className="text-sm text-gray-500 mt-2">
            Current TON Price: ${tonPrice.usd.toFixed(2)}
          </p>
        )}
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
                <div>{formatUsdWithTon(booster.priceUsd)}</div>
                {isPriceLoading && (
                  <div className="text-xs animate-pulse">Loading price...</div>
                )}
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
                onClick={() => handlePurchase(booster.id)}
                disabled={loadingBoosterId !== null || hasActiveBooster}
                className={`w-full bg-${booster.color}-600 hover:bg-${booster.color}-700 disabled:opacity-50`}
              >
                {loadingBoosterId === booster.id ? 'Processing...' : 
                 hasActiveBooster ? 'Already Have Active Booster' : 
                 !isConnected || !address ? 'Connect Wallet to Buy' :
                 isTestMode ? '🧪 Test Purchase' : 
                 'Buy Now'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Value Comparison */}
      <div className="mt-8 text-center text-sm text-gray-400">
        {BOOSTERS.map(booster => (
          <p key={booster.id}>
            {booster.name}: ${(booster.priceUsd / booster.duration).toFixed(2)} per hour of {booster.multiplier}x boost
          </p>
        ))}
        {tonPrice && (
          <p className="mt-2 text-xs">
            Prices updated {new Date(tonPrice.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}