'use client'

import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { Leaderboard } from './components/Leaderboard'
import { GlobalBoosterStatus } from './components/GlobalBoosterStatus'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-6">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <GlobalBoosterStatus />
          <p className="text-sm text-gray-400 mb-4">
            Hottest tokens based on 24h community activity
          </p>
          
          {/* Search Bar */}
          <div className="max-w-xl mx-auto">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by token name or address..."
            />
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard search={searchQuery} />
      </div>
    </main>
  )
}