'use client'

import { createContext, useContext, ReactNode } from 'react'

interface WalletContextType {
  // This will be expanded when ReOwn AppKit is fully integrated
  isReady: boolean
}

const WalletContext = createContext<WalletContextType>({
  isReady: false
})

export function WalletProvider({ children }: { children: ReactNode }) {
  // Basic provider setup
  // Will be expanded with ReOwn AppKit initialization
  
  return (
    <WalletContext.Provider value={{ isReady: true }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWalletContext = () => useContext(WalletContext)
