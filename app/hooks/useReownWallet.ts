'use client'

import { useState, useEffect } from 'react'
import { appKit } from '../lib/wallet/reown-config'

interface WalletState {
  isConnected: boolean
  address: string | null
  chainId: number | null
  balance: string | null
}

export function useReownWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: null
  })
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
    
    // Try to restore from localStorage after hydration
    try {
      const saved = localStorage.getItem('wallet-connection')
      if (saved) {
        const parsed = JSON.parse(saved)
        setWalletState(parsed)
      }
    } catch (err) {
      console.log('Failed to restore wallet state from localStorage')
    }
  }, [])


  useEffect(() => {
    if (!appKit || !isHydrated) {
      if (!appKit) {
        console.warn('AppKit not initialized')
      }
      return
    }

    try {
      // Check initial connection state
      const checkInitialState = async () => {
        try {
          const account = await appKit.getAccount()
          if (account) {
            setWalletState({
              isConnected: account.isConnected,
              address: account.address || null,
              chainId: null,
              balance: null
            })
          }
        } catch (err) {
          console.log('No initial wallet connection found')
        }
      }

      // Check initial state first
      checkInitialState()

      // Subscribe to connection events
      appKit.subscribeAccount((account) => {
        const newState = {
          isConnected: account.isConnected,
          address: account.address || null,
          chainId: 101, // Default to Solana mainnet for now
          balance: null // Balance will be fetched separately if needed
        }
        setWalletState(newState)
        setError(null) // Clear any previous errors
        
        // Persist to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('wallet-connection', JSON.stringify(newState))
          } catch (err) {
            console.log('Failed to save wallet state to localStorage')
          }
        }
      })
    } catch (err) {
      console.error('Error subscribing to wallet account:', err)
      setError('Failed to connect to wallet')
    }
  }, [isHydrated])

  const openModal = () => {
    if (!appKit) {
      setError('Wallet not available')
      return
    }
    
    try {
      appKit.open()
    } catch (err) {
      console.error('Error opening wallet modal:', err)
      setError('Failed to open wallet')
    }
  }

  const disconnect = async () => {
    if (!appKit) {
      setError('Wallet not available')
      return
    }
    
    try {
      await appKit.disconnect()
      setError(null)
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wallet-connection')
      }
    } catch (err) {
      console.error('Error disconnecting wallet:', err)
      setError('Failed to disconnect wallet')
    }
  }

  const getChainName = (chainId: number): string => {
    const chains: Record<number, string> = {
      101: 'Solana Mainnet',
      102: 'Solana Testnet',
      103: 'Solana Devnet'
    }
    return chains[chainId] || `Chain ${chainId}`
  }

  const switchToSolana = async () => {
    if (!appKit) {
      setError('Wallet not available')
      return
    }
    
    try {
      // Open the wallet modal to allow user to switch networks
      appKit.open()
    } catch (err) {
      console.error('Error opening wallet for network switch:', err)
      setError('Failed to open wallet for network switch')
    }
  }

  return {
    ...walletState,
    chainName: walletState.chainId ? getChainName(walletState.chainId) : null,
    error,
    isHydrated,
    openModal,
    disconnect,
    switchToSolana,
    clearError: () => setError(null)
  }
}
