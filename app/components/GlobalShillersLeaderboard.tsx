'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface LeaderboardUser {
  telegram_username: string
  total_shills: number
}

interface LeaderboardResponse {
  top: LeaderboardUser[]
  currentUser: { username: string; total_shills: number } | null
  currentRank: number | null
}

function normalizeUsername(input?: string): string {
  const raw = (input || '').trim()
  const isDev = process.env.NODE_ENV === 'development'
  if (!raw) return isDev ? '@dev-anonymous' : 'anonymous'
  if (raw.startsWith('@')) return raw
  return isDev ? `@dev-${raw}` : raw
}

export function GlobalShillersLeaderboard({ userId }: { userId?: string }) {
  const username = normalizeUsername(userId)
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/users/leaderboard?user=${encodeURIComponent(username)}`)
        if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`)
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    fetchLeaderboard()
  }, [username])

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-900/40 border border-gray-700/40 rounded-lg text-gray-400">
        Loading leaderboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-900/40 border border-gray-700/40 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-bold text-white">Top Shillers</div>
        <div className="text-gray-400 text-sm">Logged in as <span className="text-white font-mono">{username}</span></div>
      </div>
      <div className="divide-y divide-gray-800">
        {(data?.top || []).map((u, idx) => (
          <div key={u.telegram_username} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-6 text-gray-400">{idx + 1}</div>
              <div className="text-white">{u.telegram_username}</div>
            </div>
            <div className="text-green-300 font-semibold">{u.total_shills}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-gray-800/40 rounded-md flex items-center justify-between">
        <div className="text-gray-300">Your Position</div>
        <div className="text-white font-semibold">
          {data?.currentRank ?? '—'}{typeof data?.currentRank === 'number' && <span className="text-gray-400 text-sm"> (shills: {data?.currentUser?.total_shills ?? 0})</span>}
        </div>
      </div>
    </div>
  )
}


