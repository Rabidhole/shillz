'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '../../lib/utils'

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Start fade-in animation
    setTimeout(() => setIsAnimating(true), 100)

    // Hide splash screen after 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onComplete, 300) // Wait for fade-out animation
    }, 2000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!isVisible) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-opacity duration-300",
      isAnimating ? "opacity-100" : "opacity-0"
    )}>
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        <Image
          src="/logo.png"
          alt="Shillzzz Logo"
          width={120}
          height={120}
          className="w-30 h-30"
          priority
        />
      </div>

      {/* Tagline */}
      <div className="text-center max-w-md px-4">
        <h1 className="text-3xl font-bold text-white mb-4 animate-fade-in">
          Shillzzz
        </h1>
        <p className="text-lg text-gray-300 leading-relaxed animate-fade-in-delay">
          Show the world who has the strongest community
        </p>
      </div>

      {/* Loading indicator */}
      <div className="mt-8 flex space-x-1">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )
}
