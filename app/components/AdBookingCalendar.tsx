'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTonPrice } from '../hooks/useTonPrice'
import { cn } from '../../lib/utils'

interface AdSlot {
  date: string
  isAvailable: boolean
  price: number
}

// Check if we're in test mode
const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_TEST_MODE === 'true'

// Pricing tiers - test mode uses $0.01 for easy testing
const PRICING_TIERS = isTestMode ? [
  { duration_days: 1, base_price_usd: 0.01, multiplier: 1.0 },      // $0.01/day - test mode
  { duration_days: 3, base_price_usd: 0.03, multiplier: 1.0 },      // $0.03 total - test mode
  { duration_days: 7, base_price_usd: 0.07, multiplier: 1.0 },      // $0.07 total - test mode
  { duration_days: 14, base_price_usd: 0.14, multiplier: 1.0 },     // $0.14 total - test mode
  { duration_days: 30, base_price_usd: 0.30, multiplier: 1.0 }      // $0.30 total - test mode
] : [
  { duration_days: 1, base_price_usd: 49.99, multiplier: 1.0 },     // $49.99/day - no discount
  { duration_days: 3, base_price_usd: 139.99, multiplier: 0.93 },   // $46.66/day - 7% off
  { duration_days: 7, base_price_usd: 314.99, multiplier: 0.90 },   // $44.99/day - 10% off
  { duration_days: 14, base_price_usd: 594.99, multiplier: 0.85 },  // $42.50/day - 15% off
  { duration_days: 30, base_price_usd: 1049.99, multiplier: 0.70 }  // $34.99/day - 30% off
]

export function AdBookingCalendar() {
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [availableSlots, setAvailableSlots] = useState<AdSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bulkSelection, setBulkSelection] = useState<{[key: number]: boolean}>({})
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    telegramHandle: ''
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { convertUsdToTon, formatUsdWithTon } = useTonPrice()

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
    setBulkSelection({ [duration]: true })
  }

  const clearSelection = () => {
    setSelectedDates([])
    setBulkSelection({})
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
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    if (isTestMode) {
      // Test mode: simulate payment and submit to database
      const confirmed = confirm(`Test Payment: $${totalUsdPrice.toFixed(2)}\n\nProject: ${formData.title}\nDates: ${selectedDates.length} days\n\nThis will submit to database for admin approval. Continue?`)
      
      if (confirmed) {
        try {
          // Submit to database
          const response = await fetch('/api/ads/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: formData.title,
              imageUrl: formData.imageUrl,
              linkUrl: formData.linkUrl,
              telegramHandle: formData.telegramHandle,
              selectedDates,
              totalPrice: totalUsdPrice,
              paymentId: `test-${Date.now()}`
            })
          })

          if (response.ok) {
            const result = await response.json()
            alert('✅ Ad booking submitted successfully!\n\nYour ad is pending approval. Check the admin panel to approve it.\n\nAdmin panel: /admin')
            setShowBookingForm(false)
            setFormData({ title: '', imageUrl: '', linkUrl: '', telegramHandle: '' })
            setSelectedDates([])
          } else {
            const error = await response.json()
            alert(`❌ Submission failed: ${error.error}`)
          }
        } catch (error) {
          console.error('Error submitting ad:', error)
          alert('❌ Failed to submit ad booking')
        }
      }
    } else {
      // Production mode: show Telegram requirement
      alert('💡 TON payments are only available within the Telegram Mini App.\n\nTo test payments:\n1. Deploy to Telegram Mini App\n2. Or use test mode in development')
    }

    setIsSubmitting(false)
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

    const duration = selectedDates.length
    const tier = PRICING_TIERS.find(t => t.duration_days === duration)
    
    if (tier) {
      // Use the exact tier price
      return tier.base_price_usd
    } else {
      // For custom durations, calculate based on daily rate
      return 49.99 * duration
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const totalUsdPrice = calculateTotalPrice()

  return (
    <div className="space-y-8">
      {/* Pricing Tiers - Instant Display */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">💰 Pricing Tiers</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {PRICING_TIERS.map((tier) => (
            <div key={tier.duration_days} className="bg-gray-800/50 rounded-lg p-4 text-center border border-gray-600">
              <div className="text-lg font-bold text-white mb-1">
                {tier.duration_days} Day{tier.duration_days > 1 ? 's' : ''}
              </div>
              <div className="text-purple-400 font-semibold text-xl mb-1">
                ${tier.base_price_usd}
              </div>
              <div className="text-gray-400 text-xs">
                ${(tier.base_price_usd / tier.duration_days).toFixed(2)}/day
              </div>
              {tier.multiplier < 1 && (
                <div className="text-green-400 text-sm font-semibold mt-1">
                  {Math.round((1 - tier.multiplier) * 100)}% OFF
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-sm text-gray-400">
          💡 Longer campaigns get better rates • Prices in USD, paid in TON at checkout
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">📅 Select Dates</h2>
        
        {/* Bulk Selection Options */}
        <div className="mb-6 p-4 bg-gray-800/30 rounded-lg">
          <h3 className="text-white font-semibold mb-3">
            Quick Select (starting from today):
            {isTestMode && (
              <span className="text-yellow-400 text-sm ml-2">🧪 TEST MODE</span>
            )}
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleBulkSelect(calendarDays[0], 7)}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
              size="sm"
            >
              📦 7 Days (${PRICING_TIERS.find(t => t.duration_days === 7)?.base_price_usd.toFixed(2)})
            </Button>
            <Button
              onClick={() => handleBulkSelect(calendarDays[0], 14)}
              className="bg-green-600 hover:bg-green-700 text-sm"
              size="sm"
            >
              📦 14 Days (${PRICING_TIERS.find(t => t.duration_days === 14)?.base_price_usd.toFixed(2)})
            </Button>
            <Button
              onClick={() => handleBulkSelect(calendarDays[0], 30)}
              className="bg-purple-600 hover:bg-purple-700 text-sm"
              size="sm"
            >
              📦 30 Days (${PRICING_TIERS.find(t => t.duration_days === 30)?.base_price_usd.toFixed(2)})
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
            {isTestMode && " • Test mode: $0.01 per day"}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-gray-400 text-sm font-medium p-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date) => {
            const isAvailable = isDateAvailable(date)
            const isSelected = isDateSelected(date)
            
            return (
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
                {formatDate(date)}
              </Button>
            )
          })}
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
                ${totalUsdPrice.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">
                TON amount calculated at checkout
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
                    ${totalUsdPrice.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {selectedDates.length} day{selectedDates.length > 1 ? 's' : ''} • Premium placement
                  </div>
                  <div className="text-purple-400 text-sm">
                    {formatUsdWithTon(totalUsdPrice)}
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
                  {isSubmitting ? 'Processing...' : isTestMode ? 'Test Payment' : 'Pay with TON'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}