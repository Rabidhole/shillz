'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSupabase } from '../hooks/useSupabase'
import { Button } from '@/components/ui/button'
import { cn } from '../../lib/utils'
import { type Token } from '../types/database'
import { FeaturedAds } from './FeaturedAds'

interface LeaderboardProps {
  search: string
}

type ChainFilter = 'all' | 'solana' | 'ethereum' | 'base' | 'ton' | 'binance' | 'arbitrum' | 'optimism' | 'sui' | 'sonic' | 'linea' | 'avax' | 'cronos' | 'multiversx' | 'tron' | 'polygon' | 'fantom' | 'aurora' | 'celo' | 'gnosis' | 'mantle' | 'scroll' | 'zksync'

interface LeaderboardToken extends Token {
  rank: number
  hot_shills: number
}

export function Leaderboard({ search }: LeaderboardProps) {
  const supabase = useSupabase()
  const [tokens, setTokens] = useState<LeaderboardToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all')
  const [displayCount, setDisplayCount] = useState(10)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Fetch initial leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Get all tokens
      let query = supabase
        .from('tokens_new')
        .select('*')

      // Add search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,contract_address.ilike.%${search}%`)
      }

      const { data: tokensData, error: tokensError } = await query

      if (tokensError) throw tokensError
      if (!tokensData) return

      // Calculate 24-hour shill counts for all tokens
      const tokenStats = await Promise.all(
        tokensData.map(async (token) => {
          const { count } = await supabase
            .from('shills_new')
            .select('*', { count: 'exact', head: true })
            .eq('token_id', token.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

          return {
            ...token,
            hot_shills: count || 0
          }
        })
      )

      // Sort by 24-hour shill count and add ranks
      const rankedTokens = tokenStats
        .sort((a, b) => b.hot_shills - a.hot_shills)
        .map((token, index) => ({
          ...token,
          rank: index + 1
        }))

      setTokens(rankedTokens)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard')
    } finally {
      setIsLoading(false)
    }
  }, [supabase, search])

  // Load more function for lazy loading
  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + 10)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Subscribe to real-time shill updates
  useEffect(() => {
    const subscription = supabase
      .channel('leaderboard_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shills_new'
        },
        async (payload) => {
          // When a new shill is added, refresh the leaderboard
          console.log('New shill detected, refreshing leaderboard...')
          await fetchLeaderboard()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [supabase, fetchLeaderboard])

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
        <Button onClick={fetchLeaderboard} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                🔥 Hot Tokens (7d)
              </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">LIVE</span>
          </div>
        </div>
        <Button 
          onClick={fetchLeaderboard} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Featured Ads */}
      <FeaturedAds />

      {/* Chain Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Filter by chain:</span>
        <select
          value={chainFilter}
          onChange={(e) => setChainFilter(e.target.value as ChainFilter)}
          className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Chains</option>
          <option value="solana">Solana</option>
          <option value="ethereum">Ethereum</option>
          <option value="base">Base</option>
          <option value="ton">TON</option>
          <option value="binance">Binance Smart Chain</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="optimism">Optimism</option>
          <option value="sui">SUI</option>
          <option value="sonic">Sonic</option>
          <option value="linea">Linea</option>
              <option value="avax">Avalanche (AVAX)</option>
          <option value="cronos">Cronos</option>
          <option value="multiversx">MultiversX</option>
          <option value="tron">TRON</option>
          <option value="polygon">Polygon</option>
          <option value="fantom">Fantom</option>
          <option value="aurora">Aurora</option>
          <option value="celo">Celo</option>
          <option value="gnosis">Gnosis</option>
          <option value="mantle">Mantle</option>
          <option value="scroll">Scroll</option>
          <option value="zksync">zkSync</option>
        </select>
      </div>

      {/* Compact Leaderboard */}
      <div className="space-y-2">
        {tokens
          .filter(token => {
            const matchesSearch = (token.name?.toLowerCase().includes(search.toLowerCase()) || false) ||
              (token.contract_address?.toLowerCase().includes(search.toLowerCase()) || false)
            
            const matchesChain = chainFilter === 'all' || 
              (chainFilter === 'solana' && token.chain?.toLowerCase() === 'solana') ||
              (chainFilter === 'ethereum' && token.chain?.toLowerCase() === 'ethereum') ||
              (chainFilter === 'base' && token.chain?.toLowerCase() === 'base') ||
              (chainFilter === 'ton' && token.chain?.toLowerCase() === 'ton') ||
              (chainFilter === 'binance' && token.chain?.toLowerCase() === 'binance') ||
              (chainFilter === 'arbitrum' && token.chain?.toLowerCase() === 'arbitrum') ||
              (chainFilter === 'optimism' && token.chain?.toLowerCase() === 'optimism') ||
              (chainFilter === 'sui' && token.chain?.toLowerCase() === 'sui') ||
              (chainFilter === 'sonic' && token.chain?.toLowerCase() === 'sonic') ||
              (chainFilter === 'linea' && token.chain?.toLowerCase() === 'linea') ||
              (chainFilter === 'avax' && token.chain?.toLowerCase() === 'avax') ||
              (chainFilter === 'cronos' && token.chain?.toLowerCase() === 'cronos') ||
              (chainFilter === 'multiversx' && token.chain?.toLowerCase() === 'multiversx') ||
              (chainFilter === 'tron' && token.chain?.toLowerCase() === 'tron') ||
              (chainFilter === 'polygon' && token.chain?.toLowerCase() === 'polygon') ||
              (chainFilter === 'fantom' && token.chain?.toLowerCase() === 'fantom') ||
              (chainFilter === 'aurora' && token.chain?.toLowerCase() === 'aurora') ||
              (chainFilter === 'celo' && token.chain?.toLowerCase() === 'celo') ||
              (chainFilter === 'gnosis' && token.chain?.toLowerCase() === 'gnosis') ||
              (chainFilter === 'mantle' && token.chain?.toLowerCase() === 'mantle') ||
              (chainFilter === 'scroll' && token.chain?.toLowerCase() === 'scroll') ||
              (chainFilter === 'zksync' && token.chain?.toLowerCase() === 'zksync')
            
            
            return matchesSearch && matchesChain
          })
          .slice(0, displayCount)
          .map((token) => (
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

      {/* Load More Button */}
      {tokens.length > displayCount && (
        <div className="text-center pt-4">
          <Button
            onClick={loadMore}
            variant="outline"
            disabled={isLoadingMore}
            className="bg-gray-800 hover:bg-gray-700 border-gray-600"
          >
            {isLoadingMore ? 'Loading...' : `Load More (${tokens.length - displayCount} remaining)`}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {tokens.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">
            {search ? 'No tokens found matching your search.' : 'No tokens available.'}
          </p>
        </div>
      )}
    </div>
  )
}