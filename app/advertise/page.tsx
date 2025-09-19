'use client'

import { AdBookingCalendar } from '../components/AdBookingCalendar'

export default function AdvertisePage() {
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
            Premium banner placement • Instant booking • Pay with TON
          </p>
        </div>

        {/* Banner Specifications */}
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

        {/* Booking Calendar */}
        <AdBookingCalendar />
      </div>
    </main>
  )
}