'use client'

import { useEffect, useState } from 'react'

interface PotData {
  pot: { usd: number; goalUsd: number; progress: number }
  meta: { 
    solUsdPrice: number; 
    weeklyEarnings: number; 
    percentage: number; 
    updatedAt: string;
    recentPayments: Array<{
      amount_sol: number;
      amount_usd: number;
      created_at: string;
      sol_usd_price: number;
    }>;
  }
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

  const potAmountSol = data.pot.usd / data.meta.solUsdPrice

  return (
    <div className="p-4 rounded-lg bg-gray-900/40 border border-gray-700/30">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-semibold">Community Pot</div>
        <div className="text-sm text-gray-400">40% of weekly earnings</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-300 mb-1">
          {potAmountSol.toFixed(4)} SOL
        </div>
        <div className="text-sm text-gray-400">
          (${data.pot.usd.toFixed(2)} USD)
        </div>
        <div className="text-sm text-gray-400 mt-1">
          Ready for distribution to top shillers
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Weekly earnings: {(data.meta.weeklyEarnings / data.meta.solUsdPrice).toFixed(4)} SOL • SOL ${data.meta.solUsdPrice.toFixed(2)} (live) • Updated {new Date(data.meta.updatedAt).toLocaleTimeString()}
      </div>
      {data.meta.recentPayments.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          Recent: {data.meta.recentPayments.length} payments this week
        </div>
      )}
    </div>
  )
}


