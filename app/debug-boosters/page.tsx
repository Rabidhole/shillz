'use client'

import { useState } from 'react'
import { useReownWallet } from '../hooks/useReownWallet'

interface DebugData {
  database?: {
    boosterPacks?: unknown[]
    users?: unknown[]
    userBoosters?: unknown[]
  }
  testBooster?: { success?: boolean } & Record<string, unknown>
  currentUser?: {
    found?: boolean
    message?: string
    user?: { telegram_username?: string }
    activeBoosters?: unknown[]
    allBoosters?: unknown[]
  } & Record<string, unknown>
}

export default function DebugBoostersPage() {
  const { address } = useReownWallet()
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDebug = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Step 1: Check database contents
      console.log('=== STEP 1: Database Contents ===')
      const dbResponse = await fetch('/api/debug/boosters')
      const dbData = await dbResponse.json()
      console.log('Database contents:', dbData)
      
      // Step 2: Test booster creation
      console.log('=== STEP 2: Test Booster Creation ===')
      const testResponse = await fetch('/api/debug/test-booster')
      const testData = await testResponse.json()
      console.log('Test booster result:', testData)
      
      // Step 3: Check current user
      if (address) {
        console.log('=== STEP 3: Check Current User ===')
        const userResponse = await fetch(`/api/debug/check-user?address=${encodeURIComponent(address)}`)
        const userData = await userResponse.json()
        console.log('Current user boosters:', userData)
        
        setDebugData({
          database: dbData,
          testBooster: testData,
          currentUser: userData
        })
      } else {
        setDebugData({
          database: dbData,
          testBooster: testData,
          currentUser: { found: false, message: 'No wallet connected' }
        })
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">🔧 Booster Debug Tool</h1>
        
        <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Current Status</h2>
          <div className="text-gray-300">
            <p><strong>Connected Wallet:</strong> {address || 'Not connected'}</p>
            <p><strong>Debug Data:</strong> {debugData ? 'Available' : 'Not run'}</p>
          </div>
        </div>

        <button
          onClick={runDebug}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold mb-6"
        >
          {loading ? 'Running Debug...' : 'Run Full Debug'}
        </button>

        {error && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-bold">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {debugData && (
          <div className="space-y-6">
            {/* Database Contents */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Database Contents</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-400">Booster Packs</h4>
                  <p className="text-gray-300 text-sm">
                    {debugData.database?.boosterPacks?.length || 0} found
                  </p>
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                    {JSON.stringify(debugData.database?.boosterPacks, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-green-400">Users</h4>
                  <p className="text-gray-300 text-sm">
                    {debugData.database?.users?.length || 0} found
                  </p>
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                    {JSON.stringify(debugData.database?.users?.slice(0, 3), null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400">User Boosters</h4>
                  <p className="text-gray-300 text-sm">
                    {debugData.database?.userBoosters?.length || 0} found
                  </p>
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                    {JSON.stringify(debugData.database?.userBoosters?.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Test Booster Result */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Test Booster Creation</h3>
              {debugData.testBooster?.success ? (
                <div className="text-green-400">
                  ✅ Test booster created successfully
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                    {JSON.stringify(debugData.testBooster, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-red-400">
                  ❌ Test booster failed
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                    {JSON.stringify(debugData.testBooster, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Current User */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Current User Boosters</h3>
              {debugData.currentUser?.found ? (
                <div className="space-y-4">
                  <div className="text-green-400">
                    ✅ User found: {debugData.currentUser.user?.telegram_username}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Active Boosters: {debugData.currentUser.activeBoosters?.length || 0}</h4>
                    <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                      {JSON.stringify(debugData.currentUser.activeBoosters, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">All Boosters: {debugData.currentUser.allBoosters?.length || 0}</h4>
                    <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32">
                      {JSON.stringify(debugData.currentUser.allBoosters, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-red-400">
                  ❌ User not found: {debugData.currentUser?.message}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4 mt-8">
          <h3 className="text-yellow-400 font-bold mb-2">Instructions</h3>
          <ol className="text-yellow-300 text-sm space-y-1">
            <li>1. Connect your wallet first</li>
            <li>2. Click &quot;Run Full Debug&quot; to check everything</li>
            <li>3. Check the console for detailed logs</li>
            <li>4. Look at the results above to identify issues</li>
            <li>5. If test booster fails, check database schema</li>
            <li>6. If user not found, check wallet address format</li>
          </ol>
        </div>
      </div>
    </main>
  )
}
