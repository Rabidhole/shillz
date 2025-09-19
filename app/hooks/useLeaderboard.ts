import { useEffect, useState, useCallback } from 'react'
import { Token } from '../types/database'

interface LeaderboardToken extends Token {
  rank: number
  hot_shills: number
}

interface LeaderboardData {
  tokens: LeaderboardToken[]
  total: number
  hasMore: boolean
}

export function useLeaderboard(search: string = '', limit: number = 50) {
  const [data, setData] = useState<LeaderboardData>({ tokens: [], total: 0, hasMore: false })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async (newOffset: number = 0, newSearch: string = search) => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams({
        search: newSearch,
        limit: limit.toString(),
        offset: newOffset.toString(),
      })

      const response = await fetch(`/api/tokens/leaderboard?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const result = await response.json()
      
      if (newOffset === 0) {
        // New search or refresh - replace data
        setData(result)
      } else {
        // Load more - append data
        setData(prev => ({
          ...result,
          tokens: [...prev.tokens, ...result.tokens]
        }))
      }
      
      setOffset(newOffset)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [search, limit]) // Add dependencies here

  // Initial load and search changes
  useEffect(() => {
    fetchLeaderboard(0, search)
  }, [fetchLeaderboard, search]) // Add fetchLeaderboard to dependencies

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoading && data.hasMore) {
      fetchLeaderboard(offset + limit, search)
    }
  }, [isLoading, data.hasMore, offset, limit, search, fetchLeaderboard])

  // Refresh function
  const refresh = useCallback(() => {
    fetchLeaderboard(0, search)
  }, [fetchLeaderboard, search])

  return {
    data,
    isLoading,
    error,
    loadMore,
    refresh
  }
}