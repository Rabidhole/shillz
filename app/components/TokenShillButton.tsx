'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { BoosterStatus } from './BoosterStatus'
import { cn } from '@/lib/utils'

interface TokenShillButtonProps {
  tokenId: string
  currentShills: number
  userId?: string
  onShillSuccess?: () => void
}

// Use the 9 custom images
const SHILLMOJI_POOL = Array.from({ length: 9 }, (_, i) => `/shillmojis/${i + 1}.png`)

export function TokenShillButton({ tokenId, currentShills, userId = 'anonymous', onShillSuccess }: TokenShillButtonProps) {
  // Reset optimistic count when real count updates
  useEffect(() => {
    setOptimisticShills(0)
  }, [currentShills])
  const { totalMultiplier, hasActiveBoosters } = useUserBoosters(userId)
  const [targetImage, setTargetImage] = useState('')
  const [imageOptions, setImageOptions] = useState<string[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [showPlusOne, setShowPlusOne] = useState(false)
  const [plusOneValue, setPlusOneValue] = useState(1)
  const [isShilling, setIsShilling] = useState(false)
  const [optimisticShills, setOptimisticShills] = useState(0)

  // Optimistic count that will be validated by real-time updates
  const displayCount = currentShills + optimisticShills

  const generateImageChallenge = () => {
    // Pick a random target image
    const target = SHILLMOJI_POOL[Math.floor(Math.random() * SHILLMOJI_POOL.length)]
    setTargetImage(target)

    // Create 9 options including the target
    const shuffledPool = [...SHILLMOJI_POOL].sort(() => Math.random() - 0.5)
    const challengeOptions = [target]
    
    // Add 8 random different images
    for (const image of shuffledPool) {
      if (image !== target && challengeOptions.length < 9) {
        challengeOptions.push(image)
      }
    }

    // Shuffle the final options
    setImageOptions(challengeOptions.sort(() => Math.random() - 0.5))
  }

  // Initialize with first challenge
  useEffect(() => {
    generateImageChallenge()
  }, [])

  const showPlusOneAnimation = (value: number) => {
    setPlusOneValue(value)
    setShowPlusOne(true)
    setTimeout(() => setShowPlusOne(false), 1500)
  }

  const handleImageClick = async (selectedImage: string) => {
    if (selectedImage === targetImage && !isShilling) {
      // Prevent double-clicks
      setIsShilling(true)
      setIsAnimating(true)
      
      // Calculate effective shills
      const effectiveShills = Math.floor(totalMultiplier)
      
      // Immediate optimistic update
      setOptimisticShills(prev => prev + effectiveShills)
      showPlusOneAnimation(effectiveShills)
      onShillSuccess?.()
      
      // Send to database in background
      fetch('/api/tokens/shill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          userId,
          multiplier: totalMultiplier
        }),
      }).catch(error => {
        console.error('Error shilling token:', error)
        // Revert optimistic update on error
        setOptimisticShills(prev => prev - effectiveShills)
      })

      // Reset UI states immediately
      setTimeout(() => {
        setIsShilling(false)
        setIsAnimating(false)
        generateImageChallenge()
        setAttempts(0)
      }, 200)
    } else {
      // Wrong image - instant feedback
      setAttempts(prev => prev + 1)
      
      if (attempts >= 2) {
        // Too many failed attempts, generate new challenge
        generateImageChallenge()
        setAttempts(0)
      } else {
        // Generate new challenge
        generateImageChallenge()
      }
    }
  }

  const getImageNumber = (imagePath: string) => {
    return imagePath.split('/').pop()?.replace('.png', '') || ''
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-4">
      {/* Booster Status */}
      {hasActiveBoosters && (
        <BoosterStatus userId={userId} className="mb-2" />
      )}

      {/* Instructions */}
      <div className="text-center">
        <p className="text-white text-lg font-semibold mb-2">
          Click this shillmoji to shill!
        </p>
        <div className="w-12 h-12 mx-auto mb-2 relative rounded-lg overflow-hidden ring-2 ring-white/50">
          {targetImage ? (
            <Image
              src={targetImage}
              alt={`Target shillmoji ${getImageNumber(targetImage)}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 animate-pulse" />
          )}
        </div>
        {attempts > 0 && (
          <p className="text-yellow-400 text-sm">
            Try again! ({3 - attempts} attempts left)
          </p>
        )}
      </div>

      {/* Shillmoji Grid - This IS the shill interface */}
      <div className={cn(
        "bg-gray-900/50 border rounded-xl p-4 transition-all duration-300",
        hasActiveBoosters 
          ? "border-purple-500/50 shadow-lg shadow-purple-500/20" 
          : "border-gray-700/50",
        isAnimating && "scale-105 shadow-2xl"
      )}>
        {/* Glow effect when boosted */}
        {hasActiveBoosters && (
          <div className="absolute inset-0 rounded-xl bg-purple-500/10 animate-pulse" />
        )}
        
        <div className="grid grid-cols-3 gap-3 relative">
          {imageOptions.length > 0 ? imageOptions.map((imagePath, index) => (
            <Button
              key={`${imagePath}-${index}-${targetImage}`} // Force re-render on new challenge
              onClick={() => handleImageClick(imagePath)}
              className={cn(
                "h-16 w-16 p-1 transition-all duration-200 hover:scale-110",
                hasActiveBoosters
                  ? "bg-purple-800/50 hover:bg-purple-700 border border-purple-600/50"
                  : "bg-gray-800 hover:bg-gray-700 border border-gray-600",
                imagePath === targetImage && isAnimating && "ring-2 ring-green-400 bg-green-600"
              )}
            >
              <div className="relative w-full h-full rounded overflow-hidden">
                <Image
                  src={imagePath}
                  alt={`Shillmoji ${getImageNumber(imagePath)}`}
                  fill
                  className="object-cover"
                />
              </div>
            </Button>
          )) : (
            // Loading state
            Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="h-16 w-16 bg-gray-700 animate-pulse rounded border border-gray-600"
              />
            ))
          )}
        </div>

        {/* Multiplier indicator overlay */}
        {hasActiveBoosters && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full">
            {totalMultiplier.toFixed(1)}x
          </div>
        )}
      </div>

      {/* Display current count with +1 animation */}
      <div className="text-center relative">
        <div className="text-3xl font-bold text-white">
          {displayCount.toLocaleString()}
        </div>
        
        {/* +1 Animation */}
        {showPlusOne && (
          <div className="absolute -right-8 top-0 text-green-400 font-bold text-xl animate-bounce">
            +{plusOneValue}
          </div>
        )}
        
        <div className="text-sm text-gray-400">
          Total Shills
        </div>
        {hasActiveBoosters && (
          <div className="text-xs text-purple-400 mt-1">
            🚀 {totalMultiplier.toFixed(1)}x Boosted!
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          Shillmoji verification • Bot protection active 🤖
        </div>
      </div>
    </div>
  )
}