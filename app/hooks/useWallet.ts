'use client'

import { useState } from 'react'

interface EthereumProvider {
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isWalletConnect?: boolean
  isTrust?: boolean
  isBraveWallet?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (params: unknown) => void) => void
}

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
      const ethereum = (window as { ethereum?: EthereumProvider }).ethereum
      
      if (ethereum?.isMetaMask) {
        wallets.push({ name: 'MetaMask', provider: ethereum })
      }
      
      // Coinbase Wallet
      if (ethereum?.isCoinbaseWallet) {
        wallets.push({ name: 'Coinbase Wallet', provider: ethereum })
      }
      
      // WalletConnect
      if (ethereum?.isWalletConnect) {
        wallets.push({ name: 'WalletConnect', provider: ethereum })
      }
      
      // Trust Wallet
      if (ethereum?.isTrust) {
        wallets.push({ name: 'Trust Wallet', provider: ethereum })
      }
      
      // Brave Wallet
      if (ethereum?.isBraveWallet) {
        wallets.push({ name: 'Brave Wallet', provider: ethereum })
      }
      
      // Generic Ethereum provider
      if (ethereum && wallets.length === 0) {
        wallets.push({ name: 'Ethereum Wallet', provider: ethereum })
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
      }) as string[]

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Get chain ID
      const chainId = await provider.request({
        method: 'eth_chainId'
      }) as string

      // Get balance
      let balance = null
      try {
        const balanceWei = await provider.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest']
        }) as string
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
      provider.on('accountsChanged', (params: unknown) => {
        const accounts = params as string[]
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          setWalletState(prev => ({ ...prev, address: accounts[0] }))
        }
      })

      // Listen for chain changes
      provider.on('chainChanged', (params: unknown) => {
        const chainId = params as string
        setWalletState(prev => ({
          ...prev,
          chainId: parseInt(chainId, 16),
          chain: getChainName(parseInt(chainId, 16))
        }))
      })

    } catch (err) {
      const error = err as { code?: number; message?: string }
      if (error.code === 4001) {
        setError('Connection rejected by user')
      } else {
        setError(error.message || 'Failed to connect wallet')
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
    } catch (err) {
      const error = err as { code?: number; message?: string }
      if (error.code === 4902) {
        // Chain not added to wallet
        setError('Please add this chain to your wallet first')
      } else {
        setError(error.message || 'Failed to switch chain')
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