'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useReownWallet } from '../hooks/useReownWallet'
import { cn } from '../../lib/utils'

const ADMIN_WALLET = '0x18521c6f092B2261f7E2771A4D02c3cC7010DDE3'

interface AdSlot {
  id: string
  title: string
  image_url: string
  link_url: string
  telegram_handle: string
  start_date: string
  end_date: string
  price_ton: number
  ton_amount: number
  is_approved: boolean
  created_at: string
}

export default function AdminPage() {
  const { isConnected, address } = useReownWallet()
  const [pendingAds, setPendingAds] = useState<AdSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if current user is admin
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase()

  useEffect(() => {
    if (isAdmin) {
      fetchPendingAds()
    }
  }, [isAdmin])

  const fetchPendingAds = async () => {
    // Only fetch if user is admin
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/ads/pending')
      if (response.ok) {
        const ads = await response.json()
        setPendingAds(ads)
      }
    } catch (error) {
      console.error('Error fetching pending ads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (adId: string) => {
    if (!address) {
      alert('❌ Wallet not connected')
      return
    }

    try {
      const response = await fetch(`/api/admin/ads/${adId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      })

      if (response.ok) {
        setPendingAds(prev => prev.filter(ad => ad.id !== adId))
        alert('✅ Ad approved and will go live on the scheduled date!')
      } else {
        const error = await response.json()
        alert(`❌ Failed to approve ad: ${error.error}`)
      }
    } catch (error) {
      console.error('Error approving ad:', error)
      alert('❌ Error approving ad')
    }
  }

  const handleReject = async (adId: string) => {
    if (!address) {
      alert('❌ Wallet not connected')
      return
    }

    const reason = prompt('Reason for rejection (will be sent to advertiser):')
    if (!reason) return

    try {
      const response = await fetch(`/api/admin/ads/${adId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, reason })
      })

      if (response.ok) {
        setPendingAds(prev => prev.filter(ad => ad.id !== adId))
        alert('✅ Ad rejected. Advertiser will be notified.')
      } else {
        const error = await response.json()
        alert(`❌ Failed to reject ad: ${error.error}`)
      }
    } catch (error) {
      console.error('Error rejecting ad:', error)
      alert('❌ Error rejecting ad')
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString()
    const end = new Date(endDate).toLocaleDateString()
    return start === end ? start : `${start} - ${end}`
  }

  // Show access denied if not admin
  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">🛡️ Admin Panel</h1>
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-yellow-400 mb-4">🔐 Admin access required</p>
              <p className="text-gray-300 text-sm mb-4">
                Please connect your wallet to access the admin panel
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">🛡️ Admin Panel</h1>
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-400 mb-4">❌ Access Denied</p>
              <p className="text-gray-300 text-sm mb-2">
                Connected wallet: <span className="font-mono">{address}</span>
              </p>
              <p className="text-gray-300 text-sm mb-4">
                This wallet is not authorized for admin access
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🛡️ Admin Panel
          </h1>
          <p className="text-gray-400">
            Review and approve ad submissions
          </p>
          <div className="text-xs text-green-400 mt-2">
            ✅ Authenticated as admin: {address}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400">Loading pending ads...</div>
        ) : pendingAds.length === 0 ? (
          <div className="text-center text-gray-400">
            No pending ads to review
          </div>
        ) : (
          <div className="space-y-6">
            {pendingAds.map((ad) => (
              <div key={ad.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Ad Preview */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Ad Preview</h3>
                    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={ad.image_url}
                            alt={ad.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{ad.title}</h4>
                          <p className="text-sm text-gray-400">Click to visit project</p>
                        </div>
                        <div className="text-green-400 text-sm">Learn More →</div>
                      </div>
                    </div>
                  </div>

                  {/* Ad Details */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Details</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-400">Title:</span>
                        <span className="text-white ml-2">{ad.title}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Dates:</span>
                        <span className="text-white ml-2">{formatDateRange(ad.start_date, ad.end_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Contact:</span>
                        <span className="text-white ml-2">{ad.telegram_handle}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Link:</span>
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 break-all">
                          {ad.link_url}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-400">Image:</span>
                        <a href={ad.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 break-all">
                          {ad.image_url}
                        </a>
                      </div>
                      <div>
                        <span className="text-gray-400">Payment:</span>
                        <span className="text-white ml-2">${ad.ton_amount.toFixed(2)} ({ad.ton_amount} TON)</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Submitted:</span>
                        <span className="text-white ml-2">{new Date(ad.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => handleApprove(ad.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✅ Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(ad.id)}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    ❌ Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
