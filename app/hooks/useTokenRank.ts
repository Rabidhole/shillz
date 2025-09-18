import { useEffect, useState } from 'react'

interface TokenRank {
  rank: number
  hot_shills: number
  total_tokens: number
}

export function useTokenRank(tokenId: string) {
  const [rankData, setRankData] = useState<TokenRank | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRank() {
      try {
        const response = await fetch(`/api/tokens/${tokenId}/rank`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch rank')
        }

        const data = await response.json()
        setRankData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRank()

    // Refresh rank every 30 seconds
    const interval = setInterval(fetchRank, 30000)
    
    return () => clearInterval(interval)
  }, [tokenId])

  return { rankData, isLoading, error }
}
