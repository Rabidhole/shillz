'use client'

import { useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { Leaderboard } from './components/Leaderboard'
import { GlobalBoosterStatus } from './components/GlobalBoosterStatus'
import { AdBanner } from './components/AdBanner'
import { TokenSubmitPanel } from './components/TokenSubmitPanel'
import { ActiveBoosterDisplay } from './components/ActiveBoosterDisplay'
import { useReownWallet } from './hooks/useReownWallet'
import { PotProgress } from './components/PotProgress'
import { useTelegramUser } from './hooks/useTelegram'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showExplainer, setShowExplainer] = useState(false)
  const { address } = useReownWallet()
  const { username: tgUsername } = useTelegramUser()
  const normalizeUsername = (input?: string) => {
    const raw = (input || '').trim()
    const isDev = process.env.NODE_ENV === 'development'
    if (!raw) return isDev ? '@dev-anonymous' : 'anonymous'
    if (raw.startsWith('@')) return raw
    return isDev ? `@dev-${raw}` : raw
  }

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
        {(tgUsername || address) && (
          <ActiveBoosterDisplay 
            userId={normalizeUsername(tgUsername || address || undefined)} 
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

        {/* Explainer CTA */}
        <div className="max-w-2xl mx-auto mb-6 text-center">
          <button
            type="button"
            onClick={() => setShowExplainer(true)}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow"
          >
            ❓ What is Shillzzz?
          </button>
        </div>

        {/* Community Pot Progress */}
        <div className="max-w-2xl mx-auto mb-6">
          <PotProgress />
        </div>

        {/* Leaderboard */}
        <div className="mb-2 text-right text-xs text-gray-400">
          User: <span className="text-white font-mono">{normalizeUsername(tgUsername || address || undefined)}</span>
        </div>
        <Leaderboard search={searchQuery} />
      </div>

      {/* Explainer Modal */}
      {showExplainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-yellow-400/40 rounded-xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-2xl font-bold text-yellow-400">What is Shillzzz?</h2>
              <button
                onClick={() => setShowExplainer(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✖
              </button>
            </div>
            <div className="space-y-3 text-gray-200">
              <p>
                Shillzzz is a shill‑to‑earn platform. Add and open the token you want to shill, then solve fun puzzles to shill the token you support.
              </p>
              <p>
                Tokens with the most shills on a 24‑hour basis rise on the leaderboard.
              </p>
              <p>
                The community pot fills up from advertisement money and booster buys. When the pot reaches $5,000, rewards are distributed to the top 20 shillerz.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowExplainer(false)}
                className="px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}