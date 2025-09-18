import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { type Token } from '../types/database'

interface TokenWith24hShills extends Token {
  hot_shills: number
}

export function useRealtimeToken(tokenId: string) {
  const supabase = useSupabase()
  const [token, setToken] = useState<TokenWith24hShills | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial token data with 24-hour shill count
  useEffect(() => {
    async function fetchToken() {
      try {
        // Get token data
        const { data: tokenData, error: tokenError } = await supabase
          .from('tokens_new')
          .select('*')
          .eq('id', tokenId)
          .single()

        if (tokenError) throw tokenError

        // Get 24-hour shill count
        const { count: hotShills, error: shillError } = await supabase
          .from('shills_new')
          .select('*', { count: 'exact', head: true })
          .eq('token_id', tokenId)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        if (shillError) throw shillError

        setToken({
          ...tokenData,
          hot_shills: hotShills || 0,
          total_shills: hotShills || 0 // Use 24h count as display count
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchToken()
  }, [tokenId, supabase])

  // Subscribe to real-time updates for new shills
  useEffect(() => {
    const shillSubscription = supabase
      .channel(`token-shills-${tokenId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shills_new',
          filter: `token_id=eq.${tokenId}`
        },
        async () => {
          // Refresh 24-hour count when new shill is added
          const { count: hotShills } = await supabase
            .from('shills_new')
            .select('*', { count: 'exact', head: true })
            .eq('token_id', tokenId)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

          setToken(current => current ? {
            ...current,
            hot_shills: hotShills || 0,
            total_shills: hotShills || 0
          } : null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(shillSubscription)
    }
  }, [tokenId, supabase])

  return { token, isLoading, error }
}