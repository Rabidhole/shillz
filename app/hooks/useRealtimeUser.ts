import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { type User } from '@/app/types/database'

export function useRealtimeUser(userId: string) {
  const supabase = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial user data
  useEffect(() => {
    async function fetchUser() {
      try {
        const { data, error } = await supabase
          .from('users_new')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error

        setUser(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [userId, supabase])

  // Subscribe to real-time updates
  useEffect(() => {
    const userSubscription = supabase
      .channel(`user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users_new',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setUser(null)
          } else {
            setUser(payload.new as User)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(userSubscription)
    }
  }, [userId, supabase])

  return { user, isLoading, error }
}
