'use client'

import { BoosterShop } from '../components/BoosterShop'
import { useReownWallet } from '../hooks/useReownWallet'

export default function BoostersPage() {
  const { isConnected, address } = useReownWallet()
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <BoosterShop userId={isConnected && address ? address : 'anonymous'} />
      </div>
    </main>
  )
}
