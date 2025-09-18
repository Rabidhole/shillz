'use client'

import { useUserBoosters } from '../hooks/useUserBoosters'
import { cn } from '../../lib/utils'

interface BoosterStatusProps {
  userId: string
  className?: string
}

export function BoosterStatus({ userId, className }: BoosterStatusProps) {
  const { activeBoosters, totalMultiplier, nextExpiring, isLoading, hasActiveBoosters } = useUserBoosters(userId)

  if (isLoading || !hasActiveBoosters) {
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
    if (multiplier >= 10) return 'text-purple-400 bg-purple-500/20'
    if (multiplier >= 5) return 'text-red-400 bg-red-500/20'
    if (multiplier >= 3) return 'text-orange-400 bg-orange-500/20'
    if (multiplier >= 2) return 'text-blue-400 bg-blue-500/20'
    return 'text-green-400 bg-green-500/20'
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Total Multiplier Display */}
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold",
        getMultiplierColor(totalMultiplier)
      )}>
        <span className="text-lg">⚡</span>
        <span>{totalMultiplier.toFixed(1)}x Boost Active</span>
      </div>

      {/* Next Expiring Booster */}
      {nextExpiring && (
        <div className="text-xs text-gray-400">
          Expires in {getTimeRemaining(nextExpiring.expires_at)}
        </div>
      )}

      {/* Active Boosters List (compact) */}
      {activeBoosters.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {activeBoosters.map((booster) => (
            <div 
              key={booster.id}
              className="text-xs bg-gray-800/50 text-gray-300 px-2 py-1 rounded"
            >
              {booster.booster_pack?.name} ({booster.booster_pack?.multiplier}x)
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
