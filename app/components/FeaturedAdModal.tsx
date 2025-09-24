'use client'

import { useState } from 'react'
import { useReownWallet } from '../hooks/useReownWallet'
import { SolPaymentModal } from './SolPaymentModal'

interface FeaturedAdModalProps {
  isOpen: boolean
  onClose: () => void
  spotNumber: number
}

export function FeaturedAdModal({ isOpen, onClose, spotNumber }: FeaturedAdModalProps) {
  const { isConnected, address } = useReownWallet()
  const [formData, setFormData] = useState({
    projectName: '',
    projectUrl: '',
    projectLogoUrl: '',
    description: '',
    startDate: '',
    endDate: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSolPayment, setShowSolPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const calculatePrice = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return durationDays * 0.1 // 0.1 SOL per day
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!formData.projectName || !formData.projectUrl || !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields')
      return
    }

    const totalPrice = calculatePrice()
    if (totalPrice <= 0) {
      setError('Invalid date range')
      return
    }

    setShowSolPayment(true)
  }

  const handleSolPaymentSuccess = async (payment: { id: string; transactionHash: string }) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/ads/featured/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: formData.projectName,
          projectUrl: formData.projectUrl,
          projectLogoUrl: formData.projectLogoUrl,
          description: formData.description,
          spotNumber,
          startDate: formData.startDate,
          endDate: formData.endDate,
          transactionHash: payment.transactionHash,
          walletAddress: address
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit featured ad')
      }

      // Success - close modal and reset form
      onClose()
      setFormData({
        projectName: '',
        projectUrl: '',
        projectLogoUrl: '',
        description: '',
        startDate: '',
        endDate: ''
      })
      setShowSolPayment(false)
      
      // Refresh the page to show the new ad
      window.location.reload()
    } catch (error) {
      console.error('Error submitting featured ad:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit featured ad')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const totalPrice = calculatePrice()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            Featured Ad - Spot {spotNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="text-sm text-blue-300 font-medium mb-1">Pricing</div>
          <div className="text-xs text-gray-300">
            {totalPrice > 0 ? (
              <>
                {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days × 0.1 SOL = <span className="font-semibold">{totalPrice.toFixed(1)} SOL</span>
              </>
            ) : (
              'Select dates to see price'
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your project name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project URL *
            </label>
            <input
              type="url"
              name="projectUrl"
              value={formData.projectUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://yourproject.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Logo URL (optional)
            </label>
            <input
              type="url"
              name="projectLogoUrl"
              value={formData.projectLogoUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://yourproject.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of your project"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConnected || !address || totalPrice <= 0 || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Submitting...' : `Pay ${totalPrice.toFixed(1)} SOL`}
            </button>
          </div>
        </form>

        {showSolPayment && (
          <SolPaymentModal
            isOpen={showSolPayment}
            onClose={() => setShowSolPayment(false)}
            onSuccess={handleSolPaymentSuccess}
            amount={totalPrice}
            recipientAddress={process.env.NEXT_PUBLIC_SOL_RECIPIENT_ADDRESS || process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || ''}
            description={`Featured Ad Spot ${spotNumber} - ${formData.projectName}`}
            claimingWalletAddress={address || ''}
          />
        )}
      </div>
    </div>
  )
}
