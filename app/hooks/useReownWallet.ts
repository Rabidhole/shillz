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

  useEffect(() => {
    if (!appKit) {
      console.warn('AppKit not initialized')
      return
    }

    try {
      // Subscribe to connection events
      appKit.subscribeAccount((account) => {
        setWalletState({
          isConnected: account.isConnected,
          address: account.address || null,
          chainId: null,
          balance: null // Balance will be fetched separately if needed
        })
        setError(null) // Clear any previous errors
      })
    } catch (err) {
      console.error('Error subscribing to wallet account:', err)
      setError('Failed to connect to wallet')
    }
  }, [])

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
    } catch (err) {
      console.error('Error disconnecting wallet:', err)
      setError('Failed to disconnect wallet')
    }
  }

  const getChainName = (chainId: number): string => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      56: 'BSC',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
      43114: 'Avalanche'
    }
    return chains[chainId] || `Chain ${chainId}`
  }

  return {
    ...walletState,
    chainName: walletState.chainId ? getChainName(walletState.chainId) : null,
    error,
    openModal,
    disconnect,
    clearError: () => setError(null)
  }
}
