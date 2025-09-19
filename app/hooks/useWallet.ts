'use client'

import { useState, useEffect } from 'react'

interface WalletState {
  isConnected: boolean
  address: string | null
  chain: string | null
  chainId: number | null
  balance: string | null
  walletType: string | null
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chain: null,
    chainId: null,
    balance: null,
    walletType: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect available wallet providers
  const detectWallets = () => {
    const wallets = []
    
    if (typeof window !== 'undefined') {
      // MetaMask
      if ((window as any).ethereum?.isMetaMask) {
        wallets.push({ name: 'MetaMask', provider: (window as any).ethereum })
      }
      
      // Coinbase Wallet
      if ((window as any).ethereum?.isCoinbaseWallet) {
        wallets.push({ name: 'Coinbase Wallet', provider: (window as any).ethereum })
      }
      
      // WalletConnect
      if ((window as any).ethereum?.isWalletConnect) {
        wallets.push({ name: 'WalletConnect', provider: (window as any).ethereum })
      }
      
      // Trust Wallet
      if ((window as any).ethereum?.isTrust) {
        wallets.push({ name: 'Trust Wallet', provider: (window as any).ethereum })
      }
      
      // Brave Wallet
      if ((window as any).ethereum?.isBraveWallet) {
        wallets.push({ name: 'Brave Wallet', provider: (window as any).ethereum })
      }
      
      // Generic Ethereum provider
      if ((window as any).ethereum && wallets.length === 0) {
        wallets.push({ name: 'Ethereum Wallet', provider: (window as any).ethereum })
      }
    }
    
    return wallets
  }

  const connectWallet = async (providerName?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const wallets = detectWallets()
      
      if (wallets.length === 0) {
        throw new Error('No wallet detected. Please install MetaMask or another Ethereum wallet.')
      }

      // Use the first available wallet or specified provider
      const wallet = providerName 
        ? wallets.find(w => w.name === providerName) || wallets[0]
        : wallets[0]

      const provider = wallet.provider

      // Request account access
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Get chain ID
      const chainId = await provider.request({
        method: 'eth_chainId'
      })

      // Get balance
      let balance = null
      try {
        const balanceWei = await provider.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest']
        })
        balance = (parseInt(balanceWei, 16) / 1e18).toFixed(4)
      } catch (balanceError) {
        console.warn('Could not fetch balance:', balanceError)
      }

      setWalletState({
        isConnected: true,
        address: accounts[0],
        chain: getChainName(parseInt(chainId, 16)),
        chainId: parseInt(chainId, 16),
        balance,
        walletType: wallet.name
      })

      // Listen for account changes
      provider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          setWalletState(prev => ({ ...prev, address: accounts[0] }))
        }
      })

      // Listen for chain changes
      provider.on('chainChanged', (chainId: string) => {
        setWalletState(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16),
          chain: getChainName(parseInt(chainId, 16))
        }))
      })

    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection rejected by user')
      } else {
        setError(err.message || 'Failed to connect wallet')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      chain: null,
      chainId: null,
      balance: null,
      walletType: null
    })
    setError(null)
  }

  const getChainName = (chainId: number): string => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      56: 'BSC',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
      43114: 'Avalanche',
      250: 'Fantom',
      25: 'Cronos',
      1285: 'Moonriver',
      1284: 'Moonbeam',
      42220: 'Celo'
    }
    return chains[chainId] || `Chain ${chainId}`
  }

  const switchChain = async (chainId: number) => {
    if (!walletState.isConnected) return

    try {
      const provider = detectWallets()[0]?.provider
      if (!provider) throw new Error('No wallet provider found')

      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      })
    } catch (err: any) {
      if (err.code === 4902) {
        // Chain not added to wallet
        setError('Please add this chain to your wallet first')
      } else {
        setError(err.message || 'Failed to switch chain')
      }
    }
  }

  const getAvailableWallets = () => {
    return detectWallets()
  }

  return {
    ...walletState,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchChain,
    getAvailableWallets
  }
}