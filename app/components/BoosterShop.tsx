'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { useTonPrice } from '../hooks/useTonPrice'

interface BoosterShopProps {
  userId?: string
  telegram?: any // Telegram WebApp object
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

export function BoosterShop({ userId = 'anonymous', telegram }: BoosterShopProps) {
  const { activeBoosters, totalMultiplier, nextExpiring } = useUserBoosters(userId)
  const { convertUsdToTon, formatUsdWithTon, price: tonPrice, isLoading: isPriceLoading } = useTonPrice()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasActiveBooster = activeBoosters.length > 0

  // Check if we're in test mode
  const isTestMode = process.env.NODE_ENV === 'development'

  const handlePurchase = async (packId: string, usdAmount: number) => {
    if (hasActiveBooster) {
      setError('You already have an active booster. Wait for it to expire before purchasing another one.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Attempting to purchase booster:', {
        packId,
        userId,
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
          walletAddress: userId,
          testMode: true
        }),
      })

      const data = await response.json()
      console.log('Purchase response:', {
        status: response.status,
        ok: response.ok,
        data
      })

      console.log('Purchase response:', {
        status: response.status,
        ok: response.ok,
        data
      })

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to purchase booster'
        console.error('Purchase error details:', {
          message: errorMessage,
          details: data.details,
          hint: data.hint,
          code: data.code
        })
        throw new Error(errorMessage)
      }

      // Refresh page to show new booster
      window.location.reload()
    } catch (error) {
      console.error('Error purchasing booster:', error)
      setError(error instanceof Error ? error.message : 'Failed to purchase booster. Please try again.')
    } finally {
      setIsLoading(false)
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
        {isTestMode ? (
          <div className="mt-2 text-sm">
            <p className="text-yellow-400">Test Mode Active - No real payments required</p>
            <p className="text-gray-500">Testing with user ID: {userId}</p>
          </div>
        ) : tonPrice && (
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
                onClick={() => handlePurchase(booster.id, booster.priceUsd)}
                disabled={isLoading || hasActiveBooster}
                className={`w-full bg-${booster.color}-600 hover:bg-${booster.color}-700 disabled:opacity-50`}
              >
                {isLoading ? 'Processing...' : 
                 hasActiveBooster ? 'Already Have Active Booster' : 
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