'use client'

import { useState } from 'react'

interface PotDistributionProps {
  potAmountUsd: number
  solUsdPrice?: number
  className?: string
}

export function PotDistribution({ potAmountUsd, solUsdPrice = 200, className = '' }: PotDistributionProps) {
  const [showDistribution, setShowDistribution] = useState(false)
  
  // Calculate SOL amount
  const potAmountSol = potAmountUsd / solUsdPrice

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
          
          <div className="space-y-1">
            {distributionSchedule.map((item) => {
              const amountSol = (potAmountSol * item.percentage) / 100
              return (
                <div key={item.rank} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-300 w-6">
                      #{item.rank}
                    </span>
                    <span className="text-sm text-gray-400">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">
                      {amountSol.toFixed(4)} SOL
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.percentage}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

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
