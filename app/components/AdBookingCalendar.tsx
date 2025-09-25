'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useReownWallet } from '../hooks/useReownWallet'
import { SolPaymentModal } from './SolPaymentModal'
import { cn } from '../../lib/utils'

interface AdSlot {
  date: string
  isAvailable: boolean
  price: number
}

// Flat rate pricing - no tiers or discounts
const FLAT_RATE_SOL = 0.2 // 0.2 SOL per day

export function AdBookingCalendar() {
  const { isConnected, address } = useReownWallet()
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [availableSlots, setAvailableSlots] = useState<AdSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [showSolPayment, setShowSolPayment] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    telegramHandle: ''
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

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const response = await fetch('/api/ads/availability')
        if (response.ok) {
          const slots = await response.json()
          setAvailableSlots(slots)
        }
      } catch (error) {
        console.error('Error fetching availability:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailability()
  }, [])

  const isDateAvailable = (date: string) => {
    const slot = availableSlots.find(s => s.date === date)
    return slot ? slot.isAvailable : true
  }

  const isDateSelected = (date: string) => {
    return selectedDates.includes(date)
  }

  const handleDateClick = (date: string) => {
    if (!isDateAvailable(date)) return

    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date)
      } else {
        return [...prev, date].sort()
      }
    })
  }

  const handleBulkSelect = (startDate: string, duration: number) => {
    const dates = []
    const start = new Date(startDate)
    
    for (let i = 0; i < duration; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Check if all dates in range are available
      if (isDateAvailable(dateStr)) {
        dates.push(dateStr)
      } else {
        // If any date is unavailable, don't select any
        alert(`Some dates in the ${duration}-day range are not available. Please select manually.`)
        return
      }
    }
    
    setSelectedDates(dates)
  }

  const clearSelection = () => {
    setSelectedDates([])
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // Validate title
    if (!formData.title.trim()) {
      errors.title = 'Project title is required'
    } else if (formData.title.length < 3) {
      errors.title = 'Title must be at least 3 characters'
    } else if (formData.title.length > 50) {
      errors.title = 'Title must be less than 50 characters'
    }

    // Validate image URL
    if (!formData.imageUrl.trim()) {
      errors.imageUrl = 'Banner image URL is required'
    } else {
      try {
        const url = new URL(formData.imageUrl)
        const validImageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']
        const hasValidExtension = validImageExtensions.some(ext => 
          url.pathname.toLowerCase().endsWith(ext)
        )
        
        if (!hasValidExtension) {
          errors.imageUrl = 'Image must be PNG, JPG, JPEG, WebP, or GIF format'
        }
      } catch {
        errors.imageUrl = 'Please enter a valid image URL'
      }
    }

    // Validate link URL
    if (!formData.linkUrl.trim()) {
      errors.linkUrl = 'Link URL is required'
    } else {
      try {
        new URL(formData.linkUrl)
      } catch {
        errors.linkUrl = 'Please enter a valid URL'
      }
    }

    // Validate Telegram handle
    if (!formData.telegramHandle.trim()) {
      errors.telegramHandle = 'Telegram handle is required'
    } else if (!formData.telegramHandle.startsWith('@')) {
      errors.telegramHandle = 'Telegram handle must start with @'
    } else if (formData.telegramHandle.length < 4) {
      errors.telegramHandle = 'Telegram handle must be at least 4 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePayment = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
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
      
      const totalSolPrice = calculateTotalPrice()
      
      const response = await fetch('/api/ads/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          imageUrl: formData.imageUrl,
          linkUrl: formData.linkUrl,
          telegramHandle: formData.telegramHandle,
          selectedDates,
          totalPrice: totalSolPrice * 100, // Convert SOL to cents for API
          transactionHash: payment.transactionHash,
          walletAddress: address
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ad booking')
      }

      // Success - reset form and close modals
      setFormData({ title: '', imageUrl: '', linkUrl: '', telegramHandle: '' })
      setSelectedDates([])
      setShowBookingForm(false)
      setShowSolPayment(false)
      setError(null)
      
      alert('✅ Banner ad submitted successfully!\n\nYour ad is pending admin approval. It will be reviewed and approved within 24 hours.\n\nAdmin panel: /admin')
    } catch (error) {
      console.error('Error submitting ad:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit ad booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const calculateTotalPrice = () => {
    if (selectedDates.length === 0) return 0
    return FLAT_RATE_SOL * selectedDates.length
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const totalSolPrice = calculateTotalPrice()

  return (
    <div className="space-y-8">
      {/* Simple Pricing Display */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">💰 Simple Pricing</h2>
        <div className="text-center">
          <div className="text-4xl font-bold text-purple-400 mb-2">
            {FLAT_RATE_SOL} SOL
          </div>
          <div className="text-gray-300 text-lg mb-2">per day</div>
          <div className="text-gray-400 text-sm">
            No tiers, no discounts • Just simple, fair pricing
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">📅 Select Dates</h2>
        
        {/* Bulk Selection Options */}
        <div className="mb-6 p-4 bg-gray-800/30 rounded-lg">
          <h3 className="text-white font-semibold mb-3">
            Quick Select (starting from today):
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleBulkSelect(calendarDays[0], 1)}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
              size="sm"
            >
              📦 1 Day (${(FLAT_RATE_SOL * 1).toFixed(3)} SOL)
            </Button>
            <Button
              onClick={() => handleBulkSelect(calendarDays[0], 3)}
              className="bg-green-600 hover:bg-green-700 text-sm"
              size="sm"
            >
              📦 3 Days (${(FLAT_RATE_SOL * 3).toFixed(3)} SOL)
            </Button>
            <Button
              onClick={() => handleBulkSelect(calendarDays[0], 7)}
              className="bg-purple-600 hover:bg-purple-700 text-sm"
              size="sm"
            >
              📦 7 Days (${(FLAT_RATE_SOL * 7).toFixed(3)} SOL)
            </Button>
            <Button
              onClick={clearSelection}
              variant="outline"
              className="text-sm"
              size="sm"
            >
              Clear All
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Or manually select individual dates below
          </p>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-gray-400 text-sm font-medium p-2">
              {day}
            </div>
          ))}
        </div>
        
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
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    // Get the first day of the month and calculate offset
                    const firstDate = new Date(monthData.days[0])
                    const firstDayOfWeek = firstDate.getDay() // 0 = Sunday, 1 = Monday, etc.
                    
                    // Create array with empty cells for proper alignment
                    const cells = []
                    
                    // Add empty cells for days before the first day of the month
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      cells.push(
                        <div key={`empty-${i}`} className="h-12"></div>
                      )
                    }
                    
                    // Add actual date cells
                    monthData.days.forEach((date) => {
                      const isAvailable = isDateAvailable(date)
                      const isSelected = isDateSelected(date)
                      
                      cells.push(
                        <Button
                          key={date}
                          onClick={() => handleDateClick(date)}
                          disabled={!isAvailable}
                          className={cn(
                            "h-12 text-sm transition-all duration-200",
                            isSelected 
                              ? "bg-purple-600 hover:bg-purple-700 text-white" 
                              : isAvailable 
                                ? "bg-gray-800 hover:bg-gray-700 text-white"
                                : "bg-gray-900 text-gray-500 cursor-not-allowed",
                            !isAvailable && "opacity-50"
                          )}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-medium">
                              {new Date(date).getDate()}
                            </span>
                            <span className="text-xs opacity-75">
                              {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                          </div>
                        </Button>
                      )
                    })
                    
                    return cells
                  })()}
                </div>
              </div>
            ))
          })()}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-800 rounded"></div>
            <span className="text-gray-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-600 rounded"></div>
            <span className="text-gray-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-900 rounded"></div>
            <span className="text-gray-400">Booked</span>
          </div>
        </div>
      </div>

      {/* Selected Dates Summary */}
      {selectedDates.length > 0 && (
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Booking Summary</h3>
          <div className="space-y-4">
            <div>
              <div className="text-gray-400 text-sm">Selected Dates:</div>
              <div className="text-white">
                {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} 
                ({formatDate(selectedDates[0])} 
                {selectedDates.length > 1 && ` - ${formatDate(selectedDates[selectedDates.length - 1])}`})
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Total Price:</div>
              <div className="text-2xl font-bold text-white">
                {totalSolPrice.toFixed(3)} SOL
              </div>
              <div className="text-sm text-gray-400">
                Pay with Solana wallet
              </div>
            </div>
            <Button
              onClick={() => setShowBookingForm(true)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Book Ad Space
            </Button>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Complete Your Booking</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Project Title *</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 bg-gray-800 border rounded text-white",
                    formErrors.title ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="Your Project Name"
                  maxLength={50}
                />
                {formErrors.title && (
                  <div className="text-red-400 text-xs mt-1">{formErrors.title}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Banner Image URL *</label>
                <input 
                  type="url" 
                  value={formData.imageUrl}
                  onChange={(e) => updateFormData('imageUrl', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 bg-gray-800 border rounded text-white",
                    formErrors.imageUrl ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="https://your-image-url.com/banner.png"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Must end with: .png, .jpg, .jpeg, .webp, or .gif • Recommended: 1200x300px
                </div>
                {formErrors.imageUrl && (
                  <div className="text-red-400 text-xs mt-1">{formErrors.imageUrl}</div>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Link URL *</label>
                <input 
                  type="url" 
                  value={formData.linkUrl}
                  onChange={(e) => updateFormData('linkUrl', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 bg-gray-800 border rounded text-white",
                    formErrors.linkUrl ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="https://your-project.com"
                />
                {formErrors.linkUrl && (
                  <div className="text-red-400 text-xs mt-1">{formErrors.linkUrl}</div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Telegram Handle *</label>
                <input 
                  type="text" 
                  value={formData.telegramHandle}
                  onChange={(e) => updateFormData('telegramHandle', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 bg-gray-800 border rounded text-white",
                    formErrors.telegramHandle ? "border-red-500" : "border-gray-600"
                  )}
                  placeholder="@yourusername"
                />
                <div className="text-xs text-gray-500 mt-1">
                  For communication about your ad campaign
                </div>
                {formErrors.telegramHandle && (
                  <div className="text-red-400 text-xs mt-1">{formErrors.telegramHandle}</div>
                )}
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">
                    {totalSolPrice.toFixed(3)} SOL
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} • Premium placement
                  </div>
                  <div className="text-purple-400 text-sm">
                    Pay with Solana wallet
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBookingForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Pay with SOL'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOL Payment Modal */}
      {showSolPayment && (
        <SolPaymentModal
          isOpen={showSolPayment}
          onClose={() => setShowSolPayment(false)}
          onPaymentSuccess={handleSolPaymentSuccess}
          amount={totalSolPrice}
          recipientAddress={process.env.NEXT_PUBLIC_TEST_SOL_RECIPIENT_ADDRESS || ''}
          description={`Banner Ad - ${formData.title}`}
          claimingWalletAddress={address || ''}
        />
      )}
    </div>
  )
}