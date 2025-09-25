'use client'

import { useEffect, useState } from 'react'

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function WeeklyCountdown() {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  console.log('WeeklyCountdown component rendered', { timeRemaining, isLoading })

  useEffect(() => {
    const calculateTimeToSunday = (): TimeRemaining => {
      const now = new Date()
      const nextSunday = new Date()
      
      // Sunday is day 0, so we need to calculate correctly
      const currentDay = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
      let daysUntilSunday: number
      
      if (currentDay === 0) {
        // It's Sunday - check if we're before 11:59:59 PM
        if (now.getHours() < 23 || (now.getHours() === 23 && now.getMinutes() < 59)) {
          // Still Sunday, target end of today
          daysUntilSunday = 0
        } else {
          // Past 11:59 PM Sunday, target next Sunday
          daysUntilSunday = 7
        }
      } else {
        // It's Monday(1) through Saturday(6) - calculate days until next Sunday(0)
        daysUntilSunday = 7 - currentDay
      }
      
      // Set target to Sunday at 11:59:59 PM
      nextSunday.setDate(now.getDate() + daysUntilSunday)
      nextSunday.setHours(23, 59, 59, 999) // Set to 11:59:59.999 PM
      
      const diff = nextSunday.getTime() - now.getTime()
      
      // Debug logging
      console.log('Countdown Debug:', {
        currentDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay],
        daysUntilSunday,
        now: now.toLocaleString(),
        nextSunday: nextSunday.toLocaleString(),
        diffMs: diff
      })
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      return { days, hours, minutes, seconds }
    }

    const updateCountdown = () => {
      try {
        const result = calculateTimeToSunday()
        console.log('Countdown calculated:', result)
        setTimeRemaining(result)
        setIsLoading(false)
      } catch (error) {
        console.error('Error calculating countdown:', error)
        setIsLoading(false)
      }
    }

    // Update immediately
    updateCountdown()
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/50 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-purple-500/20 rounded mb-2"></div>
        <div className="h-4 bg-purple-500/10 rounded"></div>
        <div className="text-xs text-gray-400 text-center mt-2">Loading countdown...</div>
      </div>
    )
  }

  if (!timeRemaining) {
    return (
      <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
        <div className="text-red-400 text-center">Error loading countdown</div>
        <div className="text-xs text-gray-400 text-center mt-2">Check console for details</div>
      </div>
    )
  }

  const isUrgent = timeRemaining.days === 0 && timeRemaining.hours < 6 // Last 6 hours
  const isMediumUrgent = timeRemaining.days === 0 && timeRemaining.hours < 24 // Last day
  
  return (
    <div className={`
      border rounded-lg p-4 transition-all duration-500
      ${isUrgent 
        ? 'bg-gradient-to-r from-red-900/40 to-orange-900/40 border-red-500/60 animate-pulse' 
        : isMediumUrgent
        ? 'bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border-orange-500/50'
        : 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/50'
      }
    `}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <span className="font-semibold text-white">Weekly Snapshot</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          isUrgent 
            ? 'bg-red-500/20 text-red-300'
            : isMediumUrgent
            ? 'bg-orange-500/20 text-orange-300'
            : 'bg-purple-500/20 text-purple-300'
        }`}>
          {isUrgent ? 'URGENT' : isMediumUrgent ? 'FINAL DAY' : 'ACTIVE'}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <div className={`text-lg font-bold ${
            isUrgent ? 'text-red-300' : isMediumUrgent ? 'text-orange-300' : 'text-purple-300'
          }`}>
            {timeRemaining.days}
          </div>
          <div className="text-xs text-gray-400">DAYS</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${
            isUrgent ? 'text-red-300' : isMediumUrgent ? 'text-orange-300' : 'text-purple-300'
          }`}>
            {timeRemaining.hours}
          </div>
          <div className="text-xs text-gray-400">HRS</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${
            isUrgent ? 'text-red-300' : isMediumUrgent ? 'text-orange-300' : 'text-purple-300'
          }`}>
            {timeRemaining.minutes}
          </div>
          <div className="text-xs text-gray-400">MIN</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${
            isUrgent ? 'text-red-300' : isMediumUrgent ? 'text-orange-300' : 'text-purple-300'
          }`}>
            {timeRemaining.seconds}
          </div>
          <div className="text-xs text-gray-400">SEC</div>
        </div>
      </div>
      
      <div className="text-xs text-gray-300 text-center">
        {isUrgent 
          ? '🔥 Final hours until Sunday 11:59 PM snapshot!' 
          : isMediumUrgent
          ? '⚡ Last day to secure your spot in top 10!'
          : 'Shill now to secure your spot in the weekly top 10! (Snapshot: Sunday 11:59 PM)'
        }
      </div>
    </div>
  )
}
