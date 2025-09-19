'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '../../lib/utils'

interface AdData {
  id: string
  title: string
  description: string
  image_url: string
  link_url: string
  is_approved: boolean
  start_date: string
  end_date: string
}

export function AdBanner() {
  const [currentAd, setCurrentAd] = useState<AdData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCurrentAd() {
      try {
        const response = await fetch('/api/ads/current')
        if (response.ok) {
          const ad = await response.json()
          setCurrentAd(ad)
        }
      } catch (error) {
        console.error('Error fetching current ad:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentAd()
    // Refresh every 5 minutes
    const interval = setInterval(fetchCurrentAd, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="relative bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 mb-6 animate-pulse">
        <div className="h-20 bg-gray-600 rounded" />
      </div>
    )
  }

  if (!currentAd) {
    // Show placeholder banner when no ad is active
    return (
      <div className="mb-6">
        <div className="relative bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-gray-600/30 rounded-lg p-8 mb-2">
          <div className="absolute top-2 left-2 bg-gray-800/80 text-gray-300 text-xs px-2 py-1 rounded">
            AD
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              Your Project Could Be Here
            </h3>
            <p className="text-gray-300">
              Reach thousands of crypto enthusiasts daily
            </p>
          </div>
        </div>
        {/* Subtle advertise button below banner */}
        <div className="text-center">
          <Link 
            href="/advertise"
            className="text-gray-400 hover:text-white text-sm underline transition-colors"
          >
            Advertise your project
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <Link 
        href={currentAd.link_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block relative mb-6 group"
      >
        <div className="relative w-full aspect-[4/1] bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden hover:border-gray-600/50 transition-all duration-200">
          {/* AD Notifier */}
          <div className="absolute top-2 left-2 bg-gray-800/80 text-gray-300 text-xs px-2 py-1 rounded z-10">
            AD
          </div>

          {/* Full-width Ad Image */}
          <div className="relative w-full h-full">
            <Image
              src={currentAd.image_url}
              alt={currentAd.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              priority
            />
          </div>
        </div>
      </Link>
    </div>
  )
}
