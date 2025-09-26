import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { type Token } from '../types/database'
import { getCurrentWeekPeriod } from '@/lib/weekly-period'

interface TokenWith7dShills extends Token {
  hot_shills: number
}

export function useRealtimeToken(tokenId: string) {
  const supabase = useSupabase()
  const [token, setToken] = useState<TokenWith7dShills | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial token data with 7-day shill count
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

        // Get weekly shill count (using fixed weekly period)
        const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
        const { count: hotShills, error: shillError } = await supabase
          .from('shills_new')
          .select('*', { count: 'exact', head: true })
          .eq('token_id', tokenId)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString())

        if (shillError) throw shillError

        setToken({
          ...tokenData,
          hot_shills: hotShills || 0,
          // Keep the actual total_shills from the database
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
          // Refresh weekly count when new shill is added
          const { start: weekStart, end: weekEnd } = getCurrentWeekPeriod()
          const { count: hotShills } = await supabase
            .from('shills_new')
            .select('*', { count: 'exact', head: true })
            .eq('token_id', tokenId)
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString())

          setToken(current => current ? {
            ...current,
            hot_shills: hotShills || 0,
            // Keep the actual total_shills from the database
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