'use client'

import { useState } from 'react'
import { AdBookingCalendar } from '../components/AdBookingCalendar'
import { FeaturedAdBooking } from '../components/FeaturedAdBooking'

type AdType = 'banner' | 'featured'

export default function AdvertisePage() {
  const [selectedAdType, setSelectedAdType] = useState<AdType>('banner')

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Advertise on Shillzzz
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Reach thousands of crypto enthusiasts daily
          </p>
          <p className="text-gray-400">
            Premium placements • Instant booking • Pay with SOL
          </p>
        </div>

        {/* Ad Type Selection */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Banner Ad Option */}
            <div 
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedAdType === 'banner' 
                  ? 'border-blue-500 bg-blue-900/20' 
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
              onClick={() => setSelectedAdType('banner')}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📢</div>
                <h3 className="text-xl font-bold text-white mb-2">Top Banner Ad</h3>
                <p className="text-gray-300 mb-4">
                  Large banner at the top of the main page
                </p>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-400">• 1200x300px banner</div>
                  <div className="text-gray-400">• Premium visibility</div>
                  <div className="text-gray-400">• Calendar booking</div>
                  <div className="text-blue-400 font-semibold">• Starting at 0.1 SOL/day</div>
                </div>
              </div>
            </div>

            {/* Featured Ad Option */}
            <div 
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedAdType === 'featured' 
                  ? 'border-purple-500 bg-purple-900/20' 
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
              onClick={() => setSelectedAdType('featured')}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-xl font-bold text-white mb-2">Featured Badge</h3>
                <p className="text-gray-300 mb-4">
                  Small badge below "Hot Tokens" headline
                </p>
                <div className="space-y-2 text-sm">
                  <div className="text-gray-400">• Compact badge format</div>
                  <div className="text-gray-400">• 2 spots available</div>
                  <div className="text-gray-400">• Calendar booking</div>
                  <div className="text-purple-400 font-semibold">• 0.1 SOL/day</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications based on selected ad type */}
        {selectedAdType === 'banner' && (
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">📐 Banner Specifications</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Image Requirements</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• <strong>Recommended dimensions:</strong> 1200 x 300 pixels (4:1 ratio)</li>
                  <li>• <strong>Format:</strong> PNG, JPG, or WebP</li>
                  <li>• <strong>Hosting:</strong> Must be publicly accessible URL</li>
                  <li>• <strong>Loading:</strong> Fast loading images preferred</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">Content Guidelines</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Clear, readable text</li>
                  <li>• Professional appearance</li>
                  <li>• No misleading claims</li>
                  <li>• Crypto/DeFi projects preferred</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300">
                💡 <strong>Note:</strong> You&apos;ll provide the image URL during booking. Make sure your image is hosted on a reliable service like GitHub, Imgur, or your own CDN.
              </p>
            </div>
          </div>
        )}

        {selectedAdType === 'featured' && (
          <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">⭐ Featured Badge Specifications</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-purple-400 mb-2">Badge Requirements</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• <strong>Logo:</strong> Square logo (64x64px recommended)</li>
                  <li>• <strong>Format:</strong> PNG, JPG, or WebP</li>
                  <li>• <strong>Text:</strong> Project name (max 20 characters)</li>
                  <li>• <strong>Description:</strong> Brief description (max 50 characters)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-400 mb-2">Content Guidelines</h3>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>• Clear, concise messaging</li>
                  <li>• Professional branding</li>
                  <li>• No misleading claims</li>
                  <li>• Crypto/DeFi projects preferred</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300">
                💡 <strong>Note:</strong> Featured badges appear as compact cards below the "Hot Tokens" headline. Keep your project name and description short for best display.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">10K+</div>
            <div className="text-gray-300">Daily Active Users</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">95%</div>
            <div className="text-gray-300">Crypto Audience</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
            <div className="text-gray-300">Global Reach</div>
          </div>
        </div>

        {/* Booking Component based on selected ad type */}
        {selectedAdType === 'banner' ? (
          <AdBookingCalendar />
        ) : (
          <FeaturedAdBooking />
        )}
      </div>
    </main>
  )
}