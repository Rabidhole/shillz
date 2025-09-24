'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FeaturedAdModal } from './FeaturedAdModal'

interface FeaturedAd {
  id: string
  project_name: string
  project_url: string
  project_logo_url?: string
  description?: string
  spot_number: number
}

export function FeaturedAds() {
  const [ads, setAds] = useState<FeaturedAd[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState<{ spotNumber: number } | null>(null)

  useEffect(() => {
    async function fetchFeaturedAds() {
      try {
        const response = await fetch('/api/ads/featured/current')
        if (response.ok) {
          const featuredAds = await response.json()
          setAds(featuredAds)
        }
      } catch (error) {
        console.error('Error fetching featured ads:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFeaturedAds()
    // Refresh every 5 minutes
    const interval = setInterval(fetchFeaturedAds, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex gap-2 mb-4">
        <div className="flex-1 h-8 bg-gray-700/50 rounded animate-pulse" />
        <div className="flex-1 h-8 bg-gray-700/50 rounded animate-pulse" />
      </div>
    )
  }

  // Create array with 2 spots, filling with ads or placeholders
  const spots = [1, 2].map(spotNumber => {
    const ad = ads.find(ad => ad.spot_number === spotNumber)
    return { spotNumber, ad }
  })

  return (
    <div className="flex gap-2 mb-4">
      {spots.map(({ spotNumber, ad }) => (
        <div key={spotNumber} className="flex-1">
          {ad ? (
            <Link
              href={ad.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-3 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2">
                {ad.project_logo_url && (
                  <img
                    src={ad.project_logo_url}
                    alt={`${ad.project_name} logo`}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                    {ad.project_name}
                  </div>
                  {ad.description && (
                    <div className="text-xs text-gray-400 truncate">
                      {ad.description}
                    </div>
                  )}
                </div>
                <div className="text-xs text-blue-400 font-medium">
                  FEATURED
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-2">
                Spot {spotNumber} Available
              </div>
              <button
                onClick={() => setShowModal({ spotNumber })}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Advertise here (0.1 SOL/day)
              </button>
            </div>
          )}
        </div>
      ))}
      
      {showModal && (
        <FeaturedAdModal
          isOpen={true}
          onClose={() => setShowModal(null)}
          spotNumber={showModal.spotNumber}
        />
      )}
    </div>
  )
}
