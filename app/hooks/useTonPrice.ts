'use client'

import { useState, useEffect } from 'react'

interface TonPrice {
  usd: number
  lastUpdated: Date
}

export function useTonPrice() {
  const [price, setPrice] = useState<TonPrice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchPrice() {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd&precision=2'
        )

        if (!response.ok) {
          throw new Error('Failed to fetch TON price')
        }

        const data = await response.json()
        
        if (mounted) {
          setPrice({
            usd: data['the-open-network'].usd,
            lastUpdated: new Date()
          })
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching TON price:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch price')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPrice()

    // Refresh price every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const convertUsdToTon = (usdAmount: number) => {
    if (!price) return null
    // Calculate TON amount and round to 2 decimals
    return Number((usdAmount / price.usd).toFixed(2))
  }

  const formatUsdWithTon = (usdAmount: number) => {
    const tonAmount = convertUsdToTon(usdAmount)
    if (!tonAmount) return `$${usdAmount.toFixed(2)}`
    return `$${usdAmount.toFixed(2)} (${tonAmount} TON)`
  }

  return {
    price,
    isLoading,
    error,
    convertUsdToTon,
    formatUsdWithTon
  }
}