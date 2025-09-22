import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Public TON price source fallback
async function fetchTonUsdPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=TON', { cache: 'no-store' })
    if (!res.ok) throw new Error('price fetch failed')
    const json = await res.json()
    const usd = parseFloat(json?.data?.rates?.USD)
    if (!isFinite(usd)) throw new Error('invalid price')
    return usd
  } catch {
    // Fallback static value (avoid breaking UI)
    return 6.0
  }
}

// Simple TON balance fetch via tonapi.io (no key). Balance in nanotons.
async function fetchTonBalanceNano(address: string): Promise<bigint> {
  const url = `https://tonapi.io/v2/accounts/${address}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch TON balance')
  const json = await res.json()
  const balance = BigInt(json?.balance ?? 0)
  return balance
}

export async function GET() {
  try {
    const trackWallet = process.env.TON_TRACK_WALLET
    const goalUsd = parseFloat(process.env.POT_GOAL_USD || '5000')

    if (!trackWallet) {
      return NextResponse.json({
        error: 'Missing TON_TRACK_WALLET env',
      }, { status: 400 })
    }

    const [nano, tonUsd] = await Promise.all([
      fetchTonBalanceNano(trackWallet),
      fetchTonUsdPrice(),
    ])

    const ton = Number(nano) / 1_000_000_000
    const walletUsd = ton * tonUsd
    const potUsd = walletUsd * 0.10
    const progress = Math.max(0, Math.min(1, goalUsd > 0 ? potUsd / goalUsd : 0))

    return NextResponse.json({
      wallet: {
        address: trackWallet,
        balanceNano: nano.toString(),
        balanceTon: ton,
        usd: walletUsd,
      },
      pot: {
        usd: potUsd,
        goalUsd,
        progress,
      },
      meta: {
        tonUsd,
        updatedAt: new Date().toISOString(),
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
}


