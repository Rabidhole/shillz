let cachedSolPrice: { price: number; timestamp: number } | null = null
const CACHE_DURATION = 60 * 1000 // 1 minute

export async function fetchSolUsdPrice(): Promise<number> {
  if (cachedSolPrice && (Date.now() - cachedSolPrice.timestamp < CACHE_DURATION)) {
    console.log('Using cached SOL price:', cachedSolPrice.price)
    return cachedSolPrice.price
  }

  try {
    console.log('Fetching live SOL price from CoinGecko...')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { signal: controller.signal, cache: 'no-store' }
    )
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`)
    }

    const data = await response.json()
    const solPrice = data?.solana?.usd

    if (typeof solPrice === 'number') {
      cachedSolPrice = { price: solPrice, timestamp: Date.now() }
      console.log('Successfully fetched live SOL price:', solPrice)
      return solPrice
    } else {
      throw new Error('Invalid data format from CoinGecko API')
    }
  } catch (error) {
    console.error('Failed to fetch live SOL price:', error)
    // Fallback to a default price or previously cached price if available
    if (cachedSolPrice) {
      console.log('Using stale cached SOL price due to error:', cachedSolPrice.price)
      return cachedSolPrice.price
    }
    console.log('Using fallback SOL price: 100')
    return 100 // Default fallback price
  }
}
