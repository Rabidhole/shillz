'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id?: number
            username?: string
            first_name?: string
            last_name?: string
          }
        }
      }
    }
  }
}

export function useTelegramUser() {
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const read = () => {
      try {
        const handle = window.Telegram?.WebApp?.initDataUnsafe?.user?.username
        if (handle && typeof handle === 'string' && handle.trim().length > 0) {
          setUsername(`@${handle.replace(/^@/, '')}`)
        }
      } catch {}
    }
    // read after interactive to avoid SSR mismatch
    const id = setTimeout(read, 0)
    return () => clearTimeout(id)
  }, [])

  return { username }
}


