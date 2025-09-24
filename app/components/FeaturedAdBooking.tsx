'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useReownWallet } from '../hooks/useReownWallet'
import { SolPaymentModal } from './SolPaymentModal'
import { cn } from '../../lib/utils'

interface FeaturedAdSlot {
  date: string
  spot1Available: boolean
  spot2Available: boolean
}

export function FeaturedAdBooking() {
  const { isConnected, address } = useReownWallet()
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [selectedSpot, setSelectedSpot] = useState<1 | 2 | null>(null)
  const [availableSlots, setAvailableSlots] = useState<FeaturedAdSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showSolPayment, setShowSolPayment] = useState(false)
  const [formData, setFormData] = useState({
    projectName: '',
    projectUrl: '',
    projectLogoUrl: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate next 60 days
  const generateCalendarDays = () => {
    const days = []
    const today = new Date()
    
    for (let i = 0; i < 60; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push(date.toISOString().split('T')[0])
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()
  
  console.log('Frontend calendar date range:', {
    start: calendarDays[0],
    end: calendarDays[calendarDays.length - 1],
    totalDays: calendarDays.length
  })

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const response = await fetch('/api/ads/featured/availability')
        if (response.ok) {
          const slots = await response.json()
          console.log('Featured ad availability data:', slots.slice(0, 5)) // Show first 5 days
          setAvailableSlots(slots)
        }
      } catch (error) {
        console.error('Error fetching featured ad availability:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [])

  const isDateAvailable = (date: string, spot: 1 | 2) => {
    const slot = availableSlots.find(s => s.date === date)
    if (!slot) return true
    return spot === 1 ? slot.spot1Available : slot.spot2Available
  }

  const isDateSelected = (date: string) => {
    return selectedDates.includes(date)
  }

  const handleDateClick = (date: string) => {
    if (!selectedSpot) {
      setError('Please select a spot first')
      return
    }

    if (!isDateAvailable(date, selectedSpot)) {
      setError(`Spot ${selectedSpot} is not available on ${date}`)
      return
    }

    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date)
      } else {
        return [...prev, date].sort()
      }
    })
    setError(null)
  }

  const handleBulkSelect = (startDate: string, duration: number) => {
    if (!selectedSpot) {
      setError('Please select a spot first')
      return
    }

    const dates = []
    const start = new Date(startDate)
    
    for (let i = 0; i < duration; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Check if the specific spot is available for all dates in range
      if (isDateAvailable(dateStr, selectedSpot)) {
        dates.push(dateStr)
      } else {
        setError(`Spot ${selectedSpot} is not available for all dates in the ${duration}-day range`)
        return
      }
    }
    
    setSelectedDates(dates)
    setError(null)
  }

  const clearSelection = () => {
    setSelectedDates([])
    setSelectedSpot(null)
    setError(null)
  }

  const calculatePrice = () => {
    return selectedDates.length * 0.1 // 0.1 SOL per day
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    if (!formData.projectName.trim()) {
      errors.projectName = 'Project name is required'
    } else if (formData.projectName.length > 20) {
      errors.projectName = 'Project name must be 20 characters or less'
    }

    if (!formData.projectUrl.trim()) {
      errors.projectUrl = 'Project URL is required'
    } else {
      try {
        new URL(formData.projectUrl)
      } catch {
        errors.projectUrl = 'Please enter a valid URL'
      }
    }

    if (formData.projectLogoUrl.trim()) {
      try {
        new URL(formData.projectLogoUrl)
      } catch {
        errors.projectLogoUrl = 'Please enter a valid URL'
      }
    }

    if (formData.description && formData.description.length > 50) {
      errors.description = 'Description must be 50 characters or less'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedSpot) {
      setError('Please select a spot')
      return
    }

    if (selectedDates.length === 0) {
      setError('Please select at least one date')
      return
    }

    if (!validateForm()) {
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
          spotNumber: selectedSpot,
          startDate: selectedDates[0],
          endDate: selectedDates[selectedDates.length - 1],
          transactionHash: payment.transactionHash,
          walletAddress: address
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit featured ad')
      }

      // Success - reset form and close modals
      setFormData({
        projectName: '',
        projectUrl: '',
        projectLogoUrl: '',
        description: ''
      })
      setSelectedDates([])
      setSelectedSpot(null)
      setShowBookingForm(false)
      setShowSolPayment(false)
      setError(null)
      
      alert('✅ Featured ad submitted successfully!\n\nYour ad is pending admin approval. It will be reviewed and approved within 24 hours.\n\nAdmin panel: /admin')
      
      // Refresh availability
      window.location.reload()
    } catch (error) {
      console.error('Error submitting featured ad:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit featured ad')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading availability...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Featured Badge Booking</h2>
        
        {/* Spot Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Select Spot</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSelectedSpot(1)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                selectedSpot === 1
                  ? "border-purple-500 bg-purple-900/20"
                  : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
              )}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">⭐</div>
                <div className="font-semibold text-white">Spot 1</div>
                <div className="text-sm text-gray-400">Left position</div>
              </div>
            </button>
            <button
              onClick={() => setSelectedSpot(2)}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                selectedSpot === 2
                  ? "border-purple-500 bg-purple-900/20"
                  : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
              )}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">⭐</div>
                <div className="font-semibold text-white">Spot 2</div>
                <div className="text-sm text-gray-400">Right position</div>
              </div>
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Select Dates</h3>
          <div className="space-y-4">
            {(() => {
              // Group calendar days by month
              const months = []
              let currentMonth = null
              let currentMonthDays = []
              
              calendarDays.forEach((date) => {
                const dateObj = new Date(date)
                const monthYear = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                
                if (currentMonth !== monthYear) {
                  if (currentMonthDays.length > 0) {
                    months.push({ month: currentMonth, days: currentMonthDays })
                  }
                  currentMonth = monthYear
                  currentMonthDays = []
                }
                currentMonthDays.push(date)
              })
              
              // Add the last month
              if (currentMonthDays.length > 0) {
                months.push({ month: currentMonth, days: currentMonthDays })
              }
              
              return months.map((monthData, monthIndex) => (
                <div key={monthIndex} className="space-y-2">
                  <h4 className="text-lg font-semibold text-white text-center">
                    {monthData.month}
                  </h4>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-400 p-2">
                        {day}
                      </div>
                    ))}
                    {monthData.days.map(date => {
                      const isSelected = isDateSelected(date)
                      const isAvailable = selectedSpot ? isDateAvailable(date, selectedSpot) : false
                      const isToday = date === new Date().toISOString().split('T')[0]
                      
                      // Debug logging for first few dates
                      if (date <= '2024-01-05') {
                        console.log(`Date ${date}, Spot ${selectedSpot}, Available: ${isAvailable}`)
                      }
                      
                      return (
                        <button
                          key={date}
                          onClick={() => handleDateClick(date)}
                          disabled={!selectedSpot || !isAvailable}
                          className={cn(
                            "p-2 rounded-lg text-sm transition-all",
                            isSelected
                              ? "bg-purple-600 text-white"
                              : isAvailable
                              ? "bg-gray-700 hover:bg-gray-600 text-white"
                              : "bg-gray-800 text-gray-500 cursor-not-allowed",
                            isToday && "ring-2 ring-blue-500"
                          )}
                        >
                          {new Date(date).getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
          </div>

          {/* Quick Select Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0]
                handleBulkSelect(today, 1)
              }}
              variant="outline"
              size="sm"
              disabled={!selectedSpot}
            >
              1 Day
            </Button>
            <Button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0]
                handleBulkSelect(today, 3)
              }}
              variant="outline"
              size="sm"
              disabled={!selectedSpot}
            >
              3 Days
            </Button>
            <Button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0]
                handleBulkSelect(today, 7)
              }}
              variant="outline"
              size="sm"
              disabled={!selectedSpot}
            >
              1 Week
            </Button>
            <Button
              onClick={clearSelection}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Pricing */}
        {selectedDates.length > 0 && (
          <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">
                {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} × 0.1 SOL
              </span>
              <span className="text-purple-400 font-bold text-xl">
                {calculatePrice().toFixed(1)} SOL
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={() => setShowBookingForm(true)}
          disabled={!isConnected || !address || !selectedSpot || selectedDates.length === 0}
          className="w-full"
        >
          {!isConnected ? 'Connect Wallet' : 
           !selectedSpot ? 'Select Spot' :
           selectedDates.length === 0 ? 'Select Dates' :
           `Book Featured Ad - ${calculatePrice().toFixed(1)} SOL`}
        </Button>

        {/* Booking Form Modal */}
        {showBookingForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  Featured Ad Details
                </h3>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Your project name (max 20 chars)"
                    maxLength={20}
                    required
                  />
                  {formErrors.projectName && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.projectName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Project URL *
                  </label>
                  <input
                    type="url"
                    value={formData.projectUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectUrl: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://yourproject.com"
                    required
                  />
                  {formErrors.projectUrl && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.projectUrl}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Logo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.projectLogoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectLogoUrl: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://yourproject.com/logo.png"
                  />
                  {formErrors.projectLogoUrl && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.projectLogoUrl}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    maxLength={50}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Brief description (max 50 chars)"
                  />
                  {formErrors.description && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {isSubmitting ? 'Submitting...' : `Pay ${calculatePrice().toFixed(1)} SOL`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SOL Payment Modal */}
        {showSolPayment && (
          <SolPaymentModal
            isOpen={showSolPayment}
            onClose={() => setShowSolPayment(false)}
            onPaymentSuccess={handleSolPaymentSuccess}
            amount={calculatePrice()}
            recipientAddress={process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || ''}
            description={`Featured Ad Spot ${selectedSpot} - ${formData.projectName}`}
            claimingWalletAddress={address || ''}
          />
        )}
      </div>
    </div>
  )
}
