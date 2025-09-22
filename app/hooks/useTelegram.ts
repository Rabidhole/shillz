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
    try {
      const tg = typeof window !== 'undefined' ? window.Telegram : undefined
      const handle = tg?.WebApp?.initDataUnsafe?.user?.username
      if (handle && typeof handle === 'string' && handle.trim().length > 0) {
        setUsername(`@${handle.replace(/^@/, '')}`)
      }
    } catch {
      // ignore
    }
  }, [])

  return { username }
}


