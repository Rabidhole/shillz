'use client'

import { useUserBoosters } from '../hooks/useUserBoosters'
import { cn } from '../../lib/utils'

interface GlobalBoosterStatusProps {
  userId?: string
}

export function GlobalBoosterStatus({ userId = 'anonymous' }: GlobalBoosterStatusProps) {
  const { totalMultiplier, hasActiveBoosters, nextExpiring } = useUserBoosters(userId)

  if (!hasActiveBoosters) {
    return null
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

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 10) return 'bg-purple-600'
    if (multiplier >= 5) return 'bg-red-600'
    if (multiplier >= 3) return 'bg-orange-600'
    if (multiplier >= 2) return 'bg-blue-600'
    return 'bg-green-600'
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-bold",
      getMultiplierColor(totalMultiplier)
    )}>
      <span className="text-base">⚡</span>
      <span>{totalMultiplier.toFixed(1)}x</span>
      {nextExpiring && (
        <span className="text-xs opacity-75">
          ({getTimeRemaining(nextExpiring.expires_at)})
        </span>
      )}
    </div>
  )
}
