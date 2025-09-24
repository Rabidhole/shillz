'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useReownWallet } from '../hooks/useReownWallet'
import { PotProgress } from '../components/PotProgress'

const ADMIN_WALLET = process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || ''

console.log('Admin wallet from env:', ADMIN_WALLET)
console.log('All env vars:', {
  NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS: process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS,
  NODE_ENV: process.env.NODE_ENV
})

interface AdSlot {
  id: string
  type: 'banner' | 'featured'
  display_name: string
  display_url: string
  display_image: string | null
  display_handle: string
  price_display: string
  start_date: string
  end_date: string
  is_approved: boolean
  created_at: string
  // Additional fields for featured ads
  spot_number?: number
  description?: string
  // Additional fields for banner ads
  title?: string
  image_url?: string
  link_url?: string
  telegram_handle?: string
  price_ton?: number
  ton_amount?: number
}

export default function AdminPage() {
  console.log('Admin page rendering...')
  const { isConnected, address } = useReownWallet()
  const [pendingAds, setPendingAds] = useState<AdSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if current user is admin
  const isAdmin = isConnected && address && ADMIN_WALLET && address.toLowerCase() === ADMIN_WALLET.toLowerCase()
  
  console.log('Admin check:', {
    isConnected,
    address,
    ADMIN_WALLET,
    isAdmin,
    envVar: process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS
  })

  const fetchPendingAds = useCallback(async () => {
    // Only fetch if user is admin
    if (!isAdmin) {
      setIsLoading(false)
      return
    }

    try {
      console.log('Fetching all pending ads...')
      const response = await fetch('/api/admin/ads/all-pending', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const ads = await response.json()
      console.log('Received ads:', ads)
      setPendingAds(Array.isArray(ads) ? ads : [])
    } catch (error) {
      console.error('Error fetching pending ads:', error)
      setPendingAds([])
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin) {
      fetchPendingAds()
    }
  }, [isAdmin, fetchPendingAds])

  const handleApprove = async (adId: string, adType: 'banner' | 'featured') => {
    if (!address) {
      alert('❌ Wallet not connected')
      return
    }

    console.log('Attempting to approve ad with wallet:', address)
    console.log('Expected admin wallet:', ADMIN_WALLET)
    console.log('Is admin?', isAdmin)

    try {
      const endpoint = adType === 'banner' 
        ? `/api/admin/ads/${adId}/approve`
        : `/api/admin/ads/featured/${adId}/approve`
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      })

      if (response.ok) {
        setPendingAds(prev => prev.filter(ad => ad.id !== adId))
        alert(`✅ ${adType === 'banner' ? 'Banner' : 'Featured'} ad approved and will go live on the scheduled date!`)
      } else {
        const error = await response.json()
        alert(`❌ Failed to approve ad: ${error.error}`)
      }
    } catch (error) {
      console.error('Error approving ad:', error)
      alert('❌ Error approving ad')
    }
  }

  const handleReject = async (adId: string, adType: 'banner' | 'featured') => {
    if (!address) {
      alert('❌ Wallet not connected')
      return
    }

    const reason = prompt('Reason for rejection (will be sent to advertiser):')
    if (!reason) return

    try {
      const endpoint = adType === 'banner' 
        ? `/api/admin/ads/${adId}/reject`
        : `/api/admin/ads/featured/${adId}/reject`
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, reason })
      })

      if (response.ok) {
        setPendingAds(prev => prev.filter(ad => ad.id !== adId))
        alert(`✅ ${adType === 'banner' ? 'Banner' : 'Featured'} ad rejected. Advertiser will be notified.`)
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
          <div className="mt-6 max-w-2xl mx-auto">
            <PotProgress />
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/pot/snapshot', { method: 'POST' })
                    const json = await res.json()
                    if (!res.ok) throw new Error(json?.error || 'Snapshot failed')
                    alert(`✅ Snapshot: ${JSON.stringify(json)}`)
                  } catch (e) {
                    alert(`❌ ${e instanceof Error ? e.message : 'Snapshot error'}`)
                  }
                }}
              >
                Create Snapshot Now
              </Button>
            </div>
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
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    ad.type === 'banner' 
                      ? 'bg-blue-600 text-blue-100' 
                      : 'bg-purple-600 text-purple-100'
                  }`}>
                    {ad.type === 'banner' ? '📢 Banner Ad' : '⭐ Featured Ad'}
                  </span>
                  {ad.type === 'featured' && ad.spot_number && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-200">
                      Spot {ad.spot_number}
                    </span>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Ad Preview */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Ad Preview</h3>
                    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-4">
                        {ad.display_image && (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={ad.display_image}
                              alt={ad.display_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{ad.display_name}</h4>
                          <p className="text-sm text-gray-400">
                            {ad.type === 'banner' ? 'Click to visit project' : 'Featured badge preview'}
                          </p>
                          {ad.description && (
                            <p className="text-xs text-gray-500 mt-1">{ad.description}</p>
                          )}
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
                        <span className="text-gray-400">Name:</span>
                        <span className="text-white ml-2">{ad.display_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Dates:</span>
                        <span className="text-white ml-2">{formatDateRange(ad.start_date, ad.end_date)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Price:</span>
                        <span className="text-white ml-2">{ad.price_display}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Advertiser:</span>
                        <span className="text-white ml-2">{ad.display_handle}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Link:</span>
                        <a href={ad.display_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-2 break-all">
                          {ad.display_url}
                        </a>
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
                    onClick={() => handleApprove(ad.id, ad.type)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✅ Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(ad.id, ad.type)}
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