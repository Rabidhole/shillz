'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { Button } from '@/components/ui/button'
import { cn } from '../../lib/utils'

interface LeaderboardProps {
  search: string
}

export function Leaderboard({ search }: LeaderboardProps) {
  const { data, isLoading, error, loadMore, refresh } = useLeaderboard(search, 50)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/20'
    if (rank === 2) return 'text-gray-300 bg-gray-300/20'
    if (rank === 3) return 'text-amber-600 bg-amber-600/20'
    if (rank <= 10) return 'text-green-400 bg-green-400/20'
    return 'text-gray-400 bg-gray-400/10'
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    if (rank <= 10) return '🔥'
    return ''
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Error loading leaderboard: {error}</p>
        <Button onClick={refresh} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          🔥 Hot Tokens (24h)
        </h2>
        <Button 
          onClick={refresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Compact Leaderboard */}
      <div className="space-y-2">
        {data.tokens.map((token) => (
          <Link 
            key={token.id} 
            href={`/tokens/${token.id}`}
            className="block"
          >
            <div className="bg-gray-900/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 rounded-lg p-3 transition-all duration-200 hover:scale-[1.01] overflow-hidden">
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs flex-shrink-0",
                  getRankColor(token.rank)
                )}>
                  {token.rank <= 3 ? getRankEmoji(token.rank) : `#${token.rank}`}
                </div>

                {/* Token Image */}
                <div className="relative w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={token.image_url || '/placeholder-token.svg'}
                    alt={token.name || 'Token'}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">
                      {token.name}
                    </h3>
                    {token.rank <= 10 && (
                      <span className="text-sm">
                        {getRankEmoji(token.rank)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex-shrink-0">{token.chain}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline font-mono">
                      {token.contract_address.slice(0, 6)}...{token.contract_address.slice(-4)}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-white">
                    {token.hot_shills.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    shills
                  </div>
                </div>

                {/* Trend indicator */}
                <div className="w-6 flex justify-center flex-shrink-0">
                  {token.hot_shills > 0 && (
                    <div className="text-green-400 text-sm">
                      ↗
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Load More */}
      {data.hasMore && (
        <div className="text-center pt-4">
          <Button 
            onClick={loadMore}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {data.tokens.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {search ? 'No tokens found matching your search.' : 'No tokens available.'}
          </p>
        </div>
      )}
    </div>
  )
}