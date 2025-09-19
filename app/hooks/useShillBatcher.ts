'use client'

import { useState, useRef, useCallback } from 'react'

// Removed unused interface

export function useShillBatcher() {
  const [pendingShills, setPendingShills] = useState<Map<string, number>>(new Map())
  const batchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const isProcessing = useRef<Map<string, boolean>>(new Map())

  const addShill = useCallback(async (tokenId: string) => {
    // Immediately update local count
    setPendingShills(prev => {
      const newMap = new Map(prev)
      const currentCount = newMap.get(tokenId) || 0
      newMap.set(tokenId, currentCount + 1)
      return newMap
    })

    // Clear existing timeout for this token
    const existingTimeout = batchTimeouts.current.get(tokenId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout to batch the shills
    const timeout = setTimeout(async () => {
      if (isProcessing.current.get(tokenId)) return

      const currentCount = pendingShills.get(tokenId) || 0
      if (currentCount === 0) return

      isProcessing.current.set(tokenId, true)

      try {
        // Send batch to server
        const response = await fetch('/api/tokens/shill-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            tokenId, 
            count: currentCount 
          }),
        })

        if (response.ok) {
          // Clear pending shills for this token
          setPendingShills(prev => {
            const newMap = new Map(prev)
            newMap.delete(tokenId)
            return newMap
          })
        } else {
          console.error('Failed to sync shills')
        }
      } catch (error) {
        console.error('Error syncing shills:', error)
      } finally {
        isProcessing.current.set(tokenId, false)
        batchTimeouts.current.delete(tokenId)
      }
    }, 2000) // Batch every 2 seconds

    batchTimeouts.current.set(tokenId, timeout)
  }, [pendingShills])

  const getPendingCount = useCallback((tokenId: string) => {
    return pendingShills.get(tokenId) || 0
  }, [pendingShills])

  return {
    addShill,
    getPendingCount,
  }
}
