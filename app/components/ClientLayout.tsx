'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { SplashScreen } from './SplashScreen'
import { WalletConnect } from './WalletConnect'
import { useReownWallet } from '../hooks/useReownWallet'
import { GlobalShillersLeaderboard } from './GlobalShillersLeaderboard'
import { Button } from '@/components/ui/button'

const ADMIN_WALLET = '0x18521c6f092B2261f7E2771A4D02c3cC7010DDE3'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const normalizeUsername = (input?: string) => {
    const raw = (input || '').trim()
    const isDev = process.env.NODE_ENV === 'development'
    if (!raw) return isDev ? '@dev-anonymous' : 'anonymous'
    if (raw.startsWith('@')) return raw
    return isDev ? `@dev-${raw}` : raw
  }
  const [showSplash, setShowSplash] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const { isConnected, address } = useReownWallet()
  
  // Check if current user is admin
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase()

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  return (
    <>
      {/* Splash Screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      
      {/* Main App */}
      <div className={showSplash ? 'hidden' : 'block'}>
        <nav className="bg-black/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 border-b border-white/10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Shillzzz Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-white">Shillzzz</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link 
                href="/advertise" 
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              >
                💎 Advertise
              </Link>
              <Link 
                href="/boosters" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              >
                🚀 Boosters
              </Link>
              <div className="text-xs text-gray-400 hidden lg:block">
                User: <span className="text-white font-mono">{normalizeUsername(address || undefined)}</span>
              </div>
              <Button
                onClick={() => setShowLeaderboard(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium"
              >
                🏆 Leaderboard
              </Button>
              <WalletConnect />
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  🛡️ Admin
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex flex-col items-center justify-center w-8 h-8 space-y-1"
              aria-label="Toggle mobile menu"
            >
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`md:hidden bg-black/90 backdrop-blur-sm border-t border-white/10 transition-all duration-300 ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="container mx-auto px-4 py-4 space-y-3">
              <Link 
                href="/advertise" 
                className="block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                💎 Advertise
              </Link>
              <Link 
                href="/boosters" 
                className="block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🚀 Boosters
              </Link>
              <button 
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={() => { setShowLeaderboard(true); setIsMobileMenuOpen(false) }}
              >
                🏆 Leaderboard
              </button>
              <div className="text-xs text-gray-400">
                User: <span className="text-white font-mono">{normalizeUsername(address || undefined)}</span>
              </div>
              <div className="pt-2">
                <WalletConnect />
              </div>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  🛡️ Admin
                </Link>
              )}
            </div>
          </div>
        </nav>
        <main className="pt-16">
          {children}
        </main>

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-900 border border-white/10 rounded-xl p-4 w-full max-w-2xl max-h-[80vh] overflow-auto shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>🏆 Global Shillers Leaderboard</span>
                </div>
                <Button variant="secondary" onClick={() => setShowLeaderboard(false)}>Close</Button>
              </div>
              <GlobalShillersLeaderboard userId={address || 'anonymous'} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
