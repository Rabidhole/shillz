'use client'

import { useEffect, useState } from 'react'

interface PotData {
  wallet: { address: string; balanceTon: number; usd: number }
  pot: { usd: number; goalUsd: number; progress: number }
  meta: { tonUsd: number; updatedAt: string }
}

export function PotProgress() {
  const [data, setData] = useState<PotData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/pot', { cache: 'no-store' })
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load pot')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-3 rounded-md bg-gray-900/40 border border-gray-700/30 text-gray-400">
        Loading pot...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-3 rounded-md bg-red-900/20 border border-red-600/20 text-red-300">
        {error || 'Failed to load pot'}
      </div>
    )
  }

  const pct = Math.round((data.pot.progress || 0) * 100)

  return (
    <div className="p-4 rounded-lg bg-gray-900/40 border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="text-white font-semibold">Community Pot</div>
        <div className="text-sm text-gray-400">Goal: ${data.pot.goalUsd.toLocaleString()}</div>
      </div>
      <div className="w-full h-3 bg-gray-800 rounded-md overflow-hidden">
        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-sm">
        <div className="text-blue-300 font-semibold">${data.pot.usd.toFixed(2)} (10% of wallet)</div>
        <div className="text-gray-400">{pct}%</div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Tracking wallet {data.wallet.address} • TON ${data.meta.tonUsd.toFixed(2)} • Updated {new Date(data.meta.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  )
}


