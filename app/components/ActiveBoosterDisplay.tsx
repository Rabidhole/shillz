'use client'

import { useState, useEffect } from 'react'
import { useUserBoosters } from '../hooks/useUserBoosters'

interface ActiveBoosterDisplayProps {
  userId: string
  className?: string
}

export function ActiveBoosterDisplay({ userId, className }: ActiveBoosterDisplayProps) {
  const { activeBoosters, totalMultiplier, nextExpiring, isLoading, error } = useUserBoosters(userId)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Update countdown every second
  useEffect(() => {
    if (!nextExpiring) return

    const updateCountdown = () => {
      const now = new Date()
      const expires = new Date(nextExpiring.expires_at)
      const diff = expires.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [nextExpiring])

  if (isLoading) {
    return (
      <div className={`bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 ${className}`}>
        <div className="text-purple-400">Loading booster status...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-900/20 border border-red-500/20 rounded-lg p-4 ${className}`}>
        <div className="text-red-400">Error loading boosters: {error}</div>
      </div>
    )
  }

  if (!activeBoosters || activeBoosters.length === 0) {
    // Show debug info in development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`bg-gray-800/50 border border-gray-600 rounded-lg p-4 ${className}`}>
          <div className="text-gray-400 text-sm">
            No active boosters found for user: {userId}
            <br />
            Active boosters: {activeBoosters?.length || 0}
            <br />
            Total multiplier: {totalMultiplier}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 font-bold">🚀 Active Booster</span>
            <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
              {totalMultiplier.toFixed(1)}x
            </span>
          </div>
          <div className="text-white font-semibold">
            {nextExpiring?.booster_pack?.name || 'Unknown Booster'}
          </div>
          <div className="text-sm text-gray-300">
            {nextExpiring?.booster_pack?.description || ''}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold text-purple-400">
            {timeRemaining}
          </div>
          <div className="text-xs text-gray-400">
            remaining
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {nextExpiring && (
        <div className="mt-3">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(0, Math.min(100, 
                  ((new Date(nextExpiring.expires_at).getTime() - new Date().getTime()) / 
                   (new Date(nextExpiring.expires_at).getTime() - new Date(nextExpiring.purchased_at || nextExpiring.expires_at).getTime())) * 100
                ))}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500">
          Debug: User {userId} | Boosters: {activeBoosters.length} | Multiplier: {totalMultiplier}
        </div>
      )}
    </div>
  )
}
