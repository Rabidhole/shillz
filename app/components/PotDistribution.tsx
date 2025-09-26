'use client'

import { useState, useEffect } from 'react'

interface PotDistributionProps {
  potAmountSol: number
  potAmountUsd: number
  solUsdPrice?: number
  className?: string
}

interface LeaderboardUser {
  username: string
  weekly_shills: number
  daily_shills: number
  total_shills: number
  projected_prize_sol?: number
  prize_percentage?: number
}

export function PotDistribution({ potAmountSol, potAmountUsd, solUsdPrice = 200, className = '' }: PotDistributionProps) {
  const [showDistribution, setShowDistribution] = useState(false)
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Use SOL amount directly (no calculation needed)

  // Intriguing distribution schedule for top 10 (exactly 100%)
  const distributionSchedule = [
    { rank: 1, percentage: 30, label: '🥇 Champion' },
    { rank: 2, percentage: 20, label: '🥈 Runner-up' },
    { rank: 3, percentage: 15, label: '🥉 Third Place' },
    { rank: 4, percentage: 10, label: '💎 Elite' },
    { rank: 5, percentage: 8, label: '🔥 Fire' },
    { rank: 6, percentage: 6, label: '⚡ Lightning' },
    { rank: 7, percentage: 4, label: '🌟 Star' },
    { rank: 8, percentage: 3, label: '🚀 Rocket' },
    { rank: 9, percentage: 2, label: '💫 Comet' },
    { rank: 10, percentage: 2, label: '✨ Spark' },
  ]

  // Fetch current leaders when distribution is shown
  useEffect(() => {
    if (showDistribution) {
      fetchLeaders()
    }
  }, [showDistribution])

  const fetchLeaders = async () => {
    setIsLoading(true)
    try {
      // Always use live leaderboard data, never snapshot data
      const response = await fetch('/api/users/leaderboard')
      const data = await response.json()
      console.log('Using live leaderboard data:', data)
      if (data.top) {
        setLeaders(data.top.slice(0, 10)) // Get top 10
      }
    } catch (error) {
      console.error('Error fetching leaders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalPercentage = distributionSchedule.reduce((sum, item) => sum + item.percentage, 0)

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">💰 Prize Distribution</h3>
        <button
          onClick={() => setShowDistribution(!showDistribution)}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showDistribution ? 'Hide' : 'View Schedule'}
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-green-400">
          {potAmountSol.toFixed(4)} SOL
        </div>
        <div className="text-sm text-gray-400">
          Total Prize Pool (40% of weekly earnings)
        </div>
        <div className="text-xs text-yellow-400 mt-1 bg-yellow-900/20 px-2 py-1 rounded">
          ⚠️ Values are live estimates - final amounts determined at Sunday 11:59 PM snapshot
        </div>
      </div>

      {showDistribution && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-300 mb-3 text-center">
            Top 10 Shillers Share Everything
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="text-gray-400">Loading current leaders...</div>
            </div>
          ) : (
            <div className="space-y-1">
              {distributionSchedule.map((item) => {
                const leader = leaders[item.rank - 1] // Get leader for this rank
                const walletDisplay = leader ? 
                  leader.username :
                  'No shiller yet'
                const shillsDisplay = leader ? `${leader.weekly_shills} shills` : '0 shills'
                
                // Use actual SOL amount from snapshot if available, otherwise calculate
                const amountSol = leader?.projected_prize_sol || (potAmountSol * item.percentage) / 100
                const actualPercentage = leader?.prize_percentage || item.percentage
                
                // Color coding based on rank
                const getRankColor = (rank: number) => {
                  switch (rank) {
                    case 1: return 'text-yellow-400' // Gold
                    case 2: return 'text-gray-300' // Silver
                    case 3: return 'text-amber-600' // Bronze
                    case 4: case 5: return 'text-blue-400' // Blue for 4th-5th
                    case 6: case 7: return 'text-green-400' // Green for 6th-7th
                    case 8: case 9: case 10: return 'text-purple-400' // Purple for 8th-10th
                    default: return 'text-gray-500'
                  }
                }
                
                return (
                  <div key={item.rank} className="flex items-center justify-between py-2 px-3 bg-gray-900/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-300 w-6">
                        #{item.rank}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-400">
                          {item.label}
                        </span>
                        <span className={`text-xs font-mono font-semibold ${getRankColor(item.rank)}`}>
                          {walletDisplay}
                        </span>
                        <span className="text-xs text-blue-400">
                          {shillsDisplay}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-400">
                        {amountSol.toFixed(4)} SOL
                      </div>
                      <div className="text-xs text-gray-500">
                        {actualPercentage}%
                      </div>
                      {leader?.projected_prize_sol && (
                        <div className="text-xs text-blue-400">
                          Snapshot Amount
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
            <div className="text-xs text-gray-400 text-center">
              🎯 <strong>Winner Takes All:</strong> Only the top 10 shillers get paid.<br/>
              💪 <strong>No Participation Trophies:</strong> Shill hard or go home.<br/>
              ⏰ <strong>Weekly Reset:</strong> New competition every Sunday at midnight.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
