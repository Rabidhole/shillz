import { NextResponse } from 'next/server'
import { fetchSolUsdPrice } from '@/lib/sol-pricing'

export async function GET() {
  try {
    const price = await fetchSolUsdPrice()
    
    return NextResponse.json({
      success: true,
      price,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      source: 'CoinGecko'
    })
  } catch (error) {
    console.error('Error fetching SOL price:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SOL price',
        fallback: 100
      },
      { status: 500 }
    )
  }
}
