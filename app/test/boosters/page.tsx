'use client'

import { BoosterTester } from '@/app/components/BoosterTester'

export default function BoosterTestPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 Booster Test Panel
          </h1>
          <p className="text-gray-400">
            Test and verify booster functionality
          </p>
        </div>

        <BoosterTester />
      </div>
    </main>
  )
}
