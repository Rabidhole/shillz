'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WeeklyCountdown } from '../components/WeeklyCountdown'
import { useReownWallet } from '../hooks/useReownWallet'

export default function DebugTestnetPage() {
  const [testResults, setTestResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { address } = useReownWallet()

  const runTest = async (endpoint: string, method: 'GET' | 'POST' = 'GET') => {
    setIsLoading(true)
    try {
      const response = await fetch(endpoint, { 
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      setTestResults({ endpoint, data, status: response.status })
    } catch (error) {
      setTestResults({ 
        endpoint, 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          🧪 Testnet Debug Panel
        </h1>

        {/* Connection Status */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Connection Status</h2>
          <div className="space-y-2">
            <div>
              <span className="text-gray-400">Wallet Connected:</span>
              <span className="text-white ml-2">{address ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-400">Wallet Address:</span>
              <span className="text-white ml-2 font-mono text-sm">{address || 'Not connected'}</span>
            </div>
            <div>
              <span className="text-gray-400">Test Recipient:</span>
              <span className="text-white ml-2 font-mono text-sm">
                {process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Countdown Demo */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Weekly Countdown Component</h2>
          <WeeklyCountdown />
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">System Tests</h2>
            <div className="space-y-3">
              <Button 
                onClick={() => runTest('/api/debug/testnet-status')}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Check Testnet Status
              </Button>
              
              <Button 
                onClick={() => runTest('/api/debug/approve-testnet', 'POST')}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Auto-Approve Testnet Ads
              </Button>
              
              <Button 
                onClick={() => runTest('/api/test/weekly-snapshot', 'POST')}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Test Weekly Snapshot
              </Button>
              
              <Button 
                onClick={() => runTest('/api/debug/pot-status')}
                disabled={isLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Debug Community Pot
              </Button>
              
              <Button 
                onClick={() => runTest('/api/test/wallet-monitor')}
                disabled={isLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                Test Wallet Monitoring
              </Button>
              
              <Button 
                onClick={() => runTest('/api/debug/pot-calculation')}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Debug Pot Calculation
              </Button>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Data Checks</h2>
            <div className="space-y-3">
              <Button 
                onClick={() => runTest('/api/ads/current')}
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Check Current Banner Ad
              </Button>
              
              <Button 
                onClick={() => runTest('/api/ads/featured/current')}
                disabled={isLoading}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                Check Featured Ads
              </Button>
              
              {address && (
                <Button 
                  onClick={() => runTest(`/api/users/${address}/boosters`)}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  Check My Boosters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Test Results {isLoading && <span className="text-yellow-400">(Loading...)</span>}
            </h2>
            <div className="bg-black/50 rounded-lg p-4 overflow-auto max-h-96">
              <div className="text-sm text-gray-300 mb-2">
                <strong>Endpoint:</strong> {testResults.endpoint}
              </div>
              <div className="text-sm text-gray-300 mb-4">
                <strong>Status:</strong> <span className={
                  testResults.status === 200 ? 'text-green-400' : 
                  testResults.status === 'error' ? 'text-red-400' : 'text-yellow-400'
                }>
                  {testResults.status}
                </span>
              </div>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(testResults.data || testResults.error, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-yellow-300 mb-4">🚨 Testing Instructions</h2>
          <div className="space-y-2 text-yellow-100 text-sm">
            <p><strong>1. Check Testnet Status:</strong> See current boosters, ads, and payments</p>
            <p><strong>2. Debug Community Pot:</strong> Check why pot shows $0 and see calculations</p>
            <p><strong>3. Test Weekly Snapshot:</strong> Simulate the Sunday midnight snapshot process</p>
            <p><strong>4. Test Wallet Monitoring:</strong> Check for recent SOL transactions and send notifications</p>
            <p><strong>5. Check Current Ads:</strong> See what ads should be displaying</p>
            <p><strong>6. Weekly Countdown:</strong> Fixed - now shows correct days until Sunday</p>
            <p><strong>Note:</strong> Admin approval system left unchanged as requested</p>
          </div>
        </div>
      </div>
    </main>
  )
}
