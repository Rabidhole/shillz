import { useEffect, useState } from 'react'
import { UserBooster } from '../types/boosters'

export function useUserBoosters(userId: string) {
  const [activeBoosters, setActiveBoosters] = useState<UserBooster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalMultiplier, setTotalMultiplier] = useState(1)

  useEffect(() => {
    let mounted = true

    async function fetchActiveBoosters() {
      try {
        const response = await fetch(`/api/users/${userId}/boosters`)
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch boosters: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        
        if (mounted) {
          setActiveBoosters(data.boosters || [])
          setTotalMultiplier(data.totalMultiplier || 1)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching boosters:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'An error occurred')
          // On error, reset to default values
          setActiveBoosters([])
          setTotalMultiplier(1)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    setIsLoading(true)
    fetchActiveBoosters()

    // Refresh every 30 seconds to check for expired boosters
    const interval = setInterval(fetchActiveBoosters, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [userId])

  // Get the booster that expires soonest
  const nextExpiring = activeBoosters.length > 0 
    ? activeBoosters.reduce((earliest, current) => 
        new Date(current.expires_at) < new Date(earliest.expires_at) ? current : earliest
      )
    : null

  return {
    activeBoosters,
    totalMultiplier,
    nextExpiring,
    isLoading,
    error,
    hasActiveBoosters: activeBoosters.length > 0
  }
}