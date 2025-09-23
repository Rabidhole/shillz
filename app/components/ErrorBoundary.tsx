'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a WalletConnect/Reown related error
    if (error.message?.includes('Proposal expired') || 
        error.message?.includes('walletconnect') ||
        error.message?.includes('reown')) {
      console.warn('Wallet connection error caught by boundary:', error.message)
      // Don't show error UI for wallet connection issues, just log them
      return { hasError: false }
    }
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log wallet connection errors but don't crash the app
    if (error.message?.includes('Proposal expired') || 
        error.message?.includes('walletconnect') ||
        error.message?.includes('reown')) {
      console.warn('Wallet connection error:', error.message, errorInfo)
      return
    }
    
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-4">An unexpected error occurred.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
