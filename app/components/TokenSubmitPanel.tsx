'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { isAddress } from 'ethers'

interface TokenSubmitPanelProps {
  className?: string
  onSuccess?: () => void
}

export function TokenSubmitPanel({ className, onSuccess }: TokenSubmitPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingTokenId, setExistingTokenId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setExistingTokenId(null)

    const formData = new FormData(e.currentTarget)
    const contract_address = (formData.get('contract_address') as string).trim()
    
    // Validate address format
    if (!isAddress(contract_address)) {
      setError('Invalid contract address format')
      setIsLoading(false)
      return
    }

    const data = {
      name: (formData.get('name') as string).trim(),
      contract_address,
      chain: formData.get('chain') as string,
      description: (formData.get('description') as string || '').trim() || null,
      image_url: (formData.get('image_url') as string || '').trim() || null,
    }

    try {
      console.log('Submitting token:', data)
      const response = await fetch('/api/tokens/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      console.log('Server response:', result)

      if (!response.ok) {
        if (result.tokenId) {
          setExistingTokenId(result.tokenId)
          setError('Token already exists')
        } else {
          setError(result.error || 'Failed to submit token. Please try again.')
        }
        return
      }

      // Reset form and state
      e.currentTarget.reset()
      setIsExpanded(false)
      setError(null)
      onSuccess?.()

    } catch (error) {
      setError('Failed to submit token. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Removed wallet connection requirement

  return (
    <div className={`${className} bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden transition-all duration-300`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-gray-800/30 transition-colors flex items-center justify-between"
      >
        <span className="text-white font-medium">Add New Token</span>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 border-t border-gray-700/50">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <p>{error}</p>
              {existingTokenId && (
                <p className="mt-1">
                  View existing token:{' '}
                  <Link 
                    href={`/tokens/${existingTokenId}`}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    here
                  </Link>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                name="name"
                required
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Token Name *"
              />

              <input
                type="text"
                name="contract_address"
                required
                pattern="^0x[a-fA-F0-9]{40}$"
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contract Address (0x...) *"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                name="chain"
                required
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                defaultValue=""
              >
                <option value="" disabled>Select Chain *</option>
                <option value="Ethereum">Ethereum</option>
                <option value="BSC">BSC</option>
                <option value="Polygon">Polygon</option>
                <option value="Arbitrum">Arbitrum</option>
                <option value="Optimism">Optimism</option>
                <option value="Base">Base</option>
                <option value="Avalanche">Avalanche</option>
              </select>

              <input
                type="url"
                name="image_url"
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Token Logo URL"
              />
            </div>

            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of your token..."
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Adding Token...' : 'Add Token'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
