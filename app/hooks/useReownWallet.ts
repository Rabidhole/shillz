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

  useEffect(() => {
    // Subscribe to connection events
    appKit.subscribeAccount((account) => {
      setWalletState({
        isConnected: account.isConnected,
        address: account.address || null,
        chainId: null,
        balance: null // Balance will be fetched separately if needed
      })
    })
  }, [])

  const openModal = () => {
    appKit.open()
  }

  const disconnect = async () => {
    await appKit.disconnect()
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
    openModal,
    disconnect
  }
}
