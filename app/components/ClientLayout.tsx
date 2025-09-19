'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { SplashScreen } from './SplashScreen'
import { WalletConnect } from './WalletConnect'
import { useReownWallet } from '../hooks/useReownWallet'

const ADMIN_WALLET = '0x18521c6f092B2261f7E2771A4D02c3cC7010DDE3'

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [showSplash, setShowSplash] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
      </div>
    </>
  )
}
