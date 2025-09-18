'use client'

import Image from 'next/image'
import { useRealtimeToken } from '../hooks/useRealtimeToken'
import { useTokenRank } from '../hooks/useTokenRank'
import { TokenShillButton } from './TokenShillButton'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface TokenCardProps {
  tokenId: string
  className?: string
}

export function TokenCard({ tokenId, className }: TokenCardProps) {
  const { token, isLoading, error } = useRealtimeToken(tokenId)
  const { rankData, isLoading: rankLoading } = useTokenRank(tokenId)

  if (isLoading) {
    return (
      <Card className={cn("w-full max-w-lg animate-pulse", className)}>
        <CardContent className="pt-6">
          <div className="w-full aspect-square bg-muted rounded-lg" />
          <div className="mt-4 h-6 bg-muted rounded w-3/4" />
          <div className="mt-2 h-4 bg-muted rounded w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (error || !token) {
    return (
      <Card className={cn("w-full max-w-lg bg-destructive/10", className)}>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load token</p>
        </CardContent>
      </Card>
    )
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400' // Gold
    if (rank === 2) return 'text-gray-300'   // Silver
    if (rank === 3) return 'text-amber-600'  // Bronze
    if (rank <= 10) return 'text-green-400'  // Top 10
    return 'text-gray-400'                   // Others
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    if (rank <= 10) return '🔥'
    return '📈'
  }

  return (
    <Card className={cn("w-full max-w-lg bg-gray-900/50 border-gray-700", className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Small Token Logo */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={token.image_url || '/placeholder-token.svg'}
                alt={token.name || 'Token image'}
                fill
                sizes="48px"
                priority
                className="object-cover"
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">{token.name}</CardTitle>
              <CardDescription>
                <span className="text-sm text-gray-400">{token.chain}</span>
              </CardDescription>
            </div>
          </div>
          
          {/* Rank Display */}
          {!rankLoading && rankData && (
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn("text-3xl font-bold", getRankColor(rankData.rank))}>
                #{rankData.rank}
              </div>
              <div className="text-xs text-gray-400">
                of {rankData.total_tokens}
              </div>
              <div className="text-2xl">
                {getRankEmoji(rankData.rank)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Shill Section */}
        <div className="flex flex-col items-center justify-center py-8">
          <TokenShillButton 
            tokenId={token.id} 
            currentShills={token.total_shills}
          />
        </div>

        {/* Info and Stats */}
        <div className="space-y-4 max-w-xl mx-auto">
          <p className="text-sm text-gray-300">{token.description}</p>

          {/* 24h Stats */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">24h Activity</div>
              <div className="text-2xl font-bold text-white">
                {token.total_shills.toLocaleString()} shills
              </div>
              {rankData && (
                <div className="text-sm text-gray-500 mt-1">
                  Rank #{rankData.rank} • {getRankEmoji(rankData.rank)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}