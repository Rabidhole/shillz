'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface TokenSubmitFormProps {
  className?: string
}

export function TokenSubmitForm({ className }: TokenSubmitFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingTokenId, setExistingTokenId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setExistingTokenId(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      contract_address: formData.get('contract_address') as string,
      chain: formData.get('chain') as string,
      description: formData.get('description') as string,
      image_url: formData.get('image_url') as string,
    }

    try {
      const response = await fetch('/api/tokens/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.tokenId) {
          setExistingTokenId(result.tokenId)
          setError('Token already exists')
        } else {
          setError(result.error || 'Failed to submit token')
        }
        return
      }

      // Redirect to the token page on success
      router.push(`/tokens/${result.token.id}`)

    } catch (error) {
      setError('Failed to submit token. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <div className="max-w-2xl mx-auto p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-6">Add New Token</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg text-red-400">
            <p>{error}</p>
            {existingTokenId && (
              <p className="mt-2">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Token Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Ethereum"
            />
          </div>

          <div>
            <label htmlFor="contract_address" className="block text-sm font-medium text-gray-300 mb-1">
              Contract Address *
            </label>
            <input
              type="text"
              id="contract_address"
              name="contract_address"
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
            />
            <p className="mt-1 text-xs text-gray-400">Must be a valid EVM address starting with 0x</p>
          </div>

          <div>
            <label htmlFor="chain" className="block text-sm font-medium text-gray-300 mb-1">
              Chain *
            </label>
            <select
              id="chain"
              name="chain"
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select chain</option>
              <option value="Ethereum">Ethereum</option>
              <option value="BSC">BSC</option>
              <option value="Polygon">Polygon</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Optimism">Optimism</option>
              <option value="Base">Base</option>
              <option value="Avalanche">Avalanche</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of your token..."
            />
          </div>

          <div>
            <label htmlFor="image_url" className="block text-sm font-medium text-gray-300 mb-1">
              Token Logo URL
            </label>
            <input
              type="url"
              id="image_url"
              name="image_url"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
            <p className="mt-1 text-xs text-gray-400">Direct link to token logo (PNG/JPG)</p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Submitting...' : 'Add Token'}
          </Button>
        </form>
      </div>
    </div>
  )
}
