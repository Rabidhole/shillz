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
    chainName,
    openModal,
    disconnect
  } = useReownWallet()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className={cn("flex items-center", className)}>
      {!isConnected ? (
        <Button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
          size="sm"
        >
          Connect Wallet
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <div className="text-white font-medium text-xs">
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