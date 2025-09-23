'use client'

import { useState, useCallback } from 'react'

interface SolPaymentState {
  isProcessing: boolean
  error: string | null
  success: boolean
  transactionSignature: string | null
}

interface SolPaymentConfig {
  recipientAddress: string
  claimingWalletAddress: string
  rpcUrl?: string
}

export function useSolPayments(config: SolPaymentConfig) {
  const [paymentState, setPaymentState] = useState<SolPaymentState>({
    isProcessing: false,
    error: null,
    success: false,
    transactionSignature: null
  })

  const verifyPayment = useCallback(async (
    transactionSignature: string,
    expectedAmount: number
  ) => {
    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
      const response = await fetch('/api/payments/sol/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionSignature,
          expectedAmount,
          recipientAddress: config.recipientAddress,
          claimingWalletAddress: config.claimingWalletAddress
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed')
      }

      setPaymentState({
        isProcessing: false,
        error: null,
        success: true,
        transactionSignature
      })

      return data.payment
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment verification failed'
      setPaymentState({
        isProcessing: false,
        error: errorMessage,
        success: false,
        transactionSignature: null
      })
      throw error
    }
  }, [config.recipientAddress, config.claimingWalletAddress])


  const resetPaymentState = useCallback(() => {
    setPaymentState({
      isProcessing: false,
      error: null,
      success: false,
      transactionSignature: null
    })
  }, [])

  return {
    ...paymentState,
    verifyPayment,
    resetPaymentState
  }
}
