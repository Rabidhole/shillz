'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useUserBoosters } from '../hooks/useUserBoosters'
import { useReownWallet } from '../hooks/useReownWallet'
import { type BoosterPack } from '../types/boosters'
import { cn } from '../../lib/utils'

export function BoosterTester() {
  const { address } = useReownWallet()
  const { totalMultiplier, hasActiveBoosters, activeBoosters } = useUserBoosters(address || 'test-user')
  const [availableBoosters, setAvailableBoosters] = useState<BoosterPack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [testResult, setTestResult] = useState<string>('')
  const [isTestMode] = useState(process.env.NODE_ENV === 'development')

  // Fetch available boosters
  useEffect(() => {
    async function fetchBoosters() {
      try {
        const response = await fetch('/api/boosters')
        if (response.ok) {
          const data = await response.json()
          setAvailableBoosters(data)
        }
      } catch (error) {
        console.error('Error fetching boosters:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBoosters()
  }, [])

  const purchaseTestBooster = async (boosterId: string) => {
    try {
      setTestResult('Purchasing test booster...')
      
      const response = await fetch('/api/boosters/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boosterPackId: boosterId,
          paymentMethod: 'crypto',
          walletAddress: address || 'test-user'
        })
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult(`✅ Booster purchased successfully! Transaction: ${result.transactionHash}`)
      } else {
        setTestResult(`❌ Purchase failed: ${result.error}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (!isTestMode) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 text-yellow-400">
        Booster tester is only available in development mode
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Current Status */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Current Booster Status</h2>
        <div className="space-y-2">
          <div>
            <span className="text-gray-400">Active Boosters:</span>
            <span className="text-white ml-2">{hasActiveBoosters ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Multiplier:</span>
            <span className="text-white ml-2">{totalMultiplier.toFixed(1)}x</span>
          </div>
          <div>
            <span className="text-gray-400">Test User:</span>
            <span className="text-white ml-2 font-mono">{address || 'test-user'}</span>
          </div>
        </div>
      </div>

      {/* Active Boosters */}
      {activeBoosters && activeBoosters.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Active Boosters</h2>
          <div className="space-y-4">
            {activeBoosters.map((booster) => (
              <div key={booster.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="font-semibold text-purple-400">
                  {booster.booster_pack?.name}
                </div>
                <div className="text-sm text-gray-400">
                  Expires: {new Date(booster.expires_at).toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  Multiplier: {booster.booster_pack?.multiplier.toFixed(1)}x
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Test Boosters */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Available Test Boosters</h2>
        {isLoading ? (
          <div className="text-gray-400">Loading boosters...</div>
        ) : (
          <div className="grid gap-4">
            {availableBoosters.map((booster) => (
              <div key={booster.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{booster.name}</div>
                    <div className="text-sm text-gray-400 mb-2">{booster.description}</div>
                    <div className="text-sm">
                      <span className="text-purple-400">{booster.multiplier.toFixed(1)}x</span>
                      <span className="text-gray-400"> for </span>
                      <span className="text-purple-400">{booster.duration_hours}h</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => purchaseTestBooster(booster.id)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Test ({booster.price_usd.toFixed(2)} USD)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={cn(
          "border rounded-lg p-4",
          testResult.includes('✅') 
            ? "bg-green-900/20 border-green-500/20 text-green-400"
            : "bg-red-900/20 border-red-500/20 text-red-400"
        )}>
          {testResult}
        </div>
      )}
    </div>
  )
}
