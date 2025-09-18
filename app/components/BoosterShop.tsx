'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { useTonPrice } from '../hooks/useTonPrice'

interface BoosterShopProps {
  userId?: string
  telegram?: any // Telegram WebApp object
}

const BOOSTERS = {
  'quick-boost': {
    name: 'Quick Boost',
    description: 'Double your shill power for 1 hour! Perfect for quick pumps.',
    priceUsd: 0.99,
    multiplier: 2.0,
    duration: 1,
    color: 'green'
  },
  'power-boost': {
    name: 'Power Boost',
    description: 'Quadruple your shill power for 4 hours! Best value for serious shillers.',
    priceUsd: 2.99,
    multiplier: 4.0,
    duration: 4,
    color: 'purple'
  }
} as const

export function BoosterShop({ userId = 'anonymous', telegram }: BoosterShopProps) {
  const { activeBoosters, totalMultiplier, nextExpiring } = useUserBoosters(userId)
  const { convertUsdToTon, formatUsdWithTon, price: tonPrice, isLoading: isPriceLoading } = useTonPrice()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasActiveBooster = activeBoosters.length > 0

  const handlePurchase = async (packId: string, usdAmount: number) => {
    if (hasActiveBooster) {
      setError('You already have an active booster. Wait for it to expire before purchasing another one.')
      return
    }

    if (!tonPrice) {
      setError('Unable to get current TON price. Please try again.')
      return
    }

    const tonAmount = convertUsdToTon(usdAmount)
    if (!tonAmount) {
      setError('Failed to calculate TON amount. Please try again.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert TON to nanoTON for Telegram
      const priceNanoTon = Math.floor(tonAmount * 1000000000)

      // Create TON payment through Telegram
      const tonResult = await telegram?.ton?.sendPayment({
        amount: priceNanoTon,
        comment: `Booster: ${packId}`,
        payload: JSON.stringify({
          type: 'booster_purchase',
          pack_id: packId,
          user_id: userId,
          usd_amount: usdAmount
        })
      })

      if (!tonResult?.success) {
        throw new Error('TON payment failed')
      }

      // Send payment info to our API
      const response = await fetch('/api/boosters/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId,
          userId,
          tonPayload: {
            transaction_id: tonResult.transaction_id,
            amount: priceNanoTon,
            payload: tonResult.payload
          }
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to purchase booster')
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
        <h1 className="text-3xl font-bold text-white mb-2">Booster Shop</h1>
        <p className="text-gray-400">Power up your shills with these boosters!</p>
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

      {/* Booster Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(BOOSTERS).map(([id, booster]) => (
          <div 
            key={id}
            className={`bg-gradient-to-br from-${booster.color}-900/50 to-${booster.color}-700/30 rounded-xl p-6 border border-${booster.color}-500/20`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{booster.name}</h3>
                {id === 'power-boost' && (
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
                {id === 'power-boost' && <li>✓ Best value per hour</li>}
                {booster.multiplier === 4 && <li>✓ Maximum power</li>}
              </ul>
              <Button
                onClick={() => handlePurchase(id, booster.priceUsd)}
                disabled={isLoading || hasActiveBooster || isPriceLoading}
                className={`w-full bg-${booster.color}-600 hover:bg-${booster.color}-700 disabled:opacity-50`}
              >
                {isLoading ? 'Processing...' : 
                 hasActiveBooster ? 'Already Have Active Booster' : 
                 isPriceLoading ? 'Loading Price...' : 
                 'Buy Now'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Value Comparison */}
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>Power Boost: ${(BOOSTERS['power-boost'].priceUsd / BOOSTERS['power-boost'].duration).toFixed(2)} per hour of 4x boost</p>
        <p>Quick Boost: ${(BOOSTERS['quick-boost'].priceUsd / BOOSTERS['quick-boost'].duration).toFixed(2)} per hour of 2x boost</p>
        {tonPrice && (
          <p className="mt-2 text-xs">
            Prices updated {new Date(tonPrice.lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  )
}