'use client'

import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { Leaderboard } from './components/Leaderboard'
import { GlobalBoosterStatus } from './components/GlobalBoosterStatus'
import { AdBanner } from './components/AdBanner'
import { TokenSubmitPanel } from './components/TokenSubmitPanel'
import { ActiveBoosterDisplay } from './components/ActiveBoosterDisplay'
import { useReownWallet } from './hooks/useReownWallet'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const { address } = useReownWallet()

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-6">
        {/* Ad Banner */}
        <AdBanner />
        
      {/* Compact Header */}
      <div className="text-center mb-6">
        <GlobalBoosterStatus />
        <p className="text-sm text-gray-400 mb-4">
          Hottest tokens based on 24h community activity
        </p>

        {/* User's Active Booster */}
        {address && (
          <ActiveBoosterDisplay 
            userId={address} 
            className="max-w-md mx-auto mb-4"
          />
        )}
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by token name or address..."
            />
          </div>
        </div>

        {/* Token Submit Panel */}
        <TokenSubmitPanel 
          className="mb-6 max-w-2xl mx-auto" 
          onSuccess={() => {
            // Refresh the leaderboard when a new token is added
            window.location.reload()
          }}
        />

        {/* Leaderboard */}
        <Leaderboard search={searchQuery} />
      </div>
    </main>
  )
}