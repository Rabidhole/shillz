'use client'

import { useReownWallet } from '../hooks/useReownWallet'
import { Button } from '@/components/ui/button'
import { cn } from '../../lib/utils'

interface WalletConnectProps {
  className?: string
}

export function WalletConnect({ className }: WalletConnectProps) {
  const { 
    isConnected, 
    address, 
    chainId,
    chainName,
    isHydrated,
    openModal,
    disconnect,
    switchToSolana
  } = useReownWallet()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className={cn("flex items-center", className)}>
        <Button
          disabled
          className="bg-gray-600 text-white text-sm"
          size="sm"
        >
          Loading...
        </Button>
      </div>
    )
  }

  const isOnSolana = chainId === 101 || chainId === 102 || chainId === 103 || !chainId

  return (
    <div className={cn("flex items-center", className)}>
      {!isConnected ? (
        <Button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
          size="sm"
        >
          Connect Solana Wallet
        </Button>
      ) : !isOnSolana ? (
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <div className="text-yellow-400 font-medium text-xs">
              Wrong Network
            </div>
            <div className="text-gray-400 text-xs font-mono">
              {formatAddress(address!)}
            </div>
          </div>
          <Button
            onClick={switchToSolana}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            size="sm"
          >
            Switch to Solana
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <div className="text-green-400 font-medium text-xs">
              {chainName}
            </div>
            <div className="text-gray-400 text-xs font-mono">
              {formatAddress(address!)}
            </div>
          </div>
          <Button
            onClick={disconnect}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  )
}