'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useShillBatcher } from '../hooks/useShillBatcher'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { BoosterStatus } from './BoosterStatus'
import { cn } from '@/lib/utils'

interface TokenShillButtonProps {
  tokenId: string
  currentShills: number
  userId?: string
  onShillSuccess?: () => void
}

export function TokenShillButton({ tokenId, currentShills, userId = 'anonymous', onShillSuccess }: TokenShillButtonProps) {
  const { addShill, getPendingCount } = useShillBatcher()
  const { totalMultiplier, hasActiveBoosters } = useUserBoosters(userId)
  const [localCount, setLocalCount] = useState(0)
  const [scale, setScale] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)

  const pendingCount = getPendingCount(tokenId)
  const displayCount = currentShills + pendingCount

  const handleShill = async () => {
    try {
      // Animate button press
      setScale(0.95)
      setIsAnimating(true)
      setTimeout(() => {
        setScale(1)
        setIsAnimating(false)
      }, 150)

      // Calculate effective shills with multiplier
      const effectiveShills = Math.floor(totalMultiplier)
      
      // Add multiple shills if boosted
      for (let i = 0; i < effectiveShills; i++) {
        await addShill(tokenId)
        setLocalCount(prev => prev + 1)
      }

      onShillSuccess?.()
    } catch (error) {
      console.error('Error shilling token:', error)
    }
  }

  // Reset local count when pending count changes (indicates sync happened)
  useEffect(() => {
    if (pendingCount === 0) {
      setLocalCount(0)
    }
  }, [pendingCount])

  return (
    <div className="relative flex flex-col items-center justify-center gap-4">
      {/* Booster Status */}
      {hasActiveBoosters && (
        <BoosterStatus userId={userId} className="mb-2" />
      )}

      {/* Glow effect - enhanced when boosted */}
      <div className={cn(
        "absolute w-32 h-32 rounded-full blur-xl animate-pulse",
        hasActiveBoosters 
          ? "bg-purple-500/30" 
          : "bg-green-500/20"
      )} />
      
      {/* Shill button */}
      <Button
        onClick={handleShill}
        data-shill-button
        className={cn(
          "relative w-32 h-32 rounded-full text-white font-bold text-2xl shadow-lg",
          "transition-all duration-150 ease-in-out",
          "active:shadow-inner active:scale-95",
          hasActiveBoosters
            ? "bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/50"
            : "bg-green-500 hover:bg-green-600 hover:shadow-green-500/50",
          "hover:shadow-xl",
          isAnimating && "animate-pulse"
        )}
        style={{
          transform: `scale(${scale})`,
        }}
      >
        SHILL
        
        {/* Multiplier indicator */}
        {hasActiveBoosters && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
            {totalMultiplier.toFixed(1)}x
          </div>
        )}
        
        {/* Click effect */}
        {isAnimating && (
          <span className={cn(
            "absolute inset-0 rounded-full animate-ping",
            hasActiveBoosters ? "bg-purple-300/30" : "bg-white/30"
          )} />
        )}
      </Button>

      {/* Display current count */}
      <div className="text-center">
        <div className="text-3xl font-bold text-white">
          {displayCount.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">
          Total Shills
        </div>
        {hasActiveBoosters && (
          <div className="text-xs text-purple-400 mt-1">
            🚀 Boosted!
          </div>
        )}
      </div>
    </div>
  )
}