import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { type LeaderboardSnapshot, type TimeWindow, type Token } from '@/app/types/database'

export interface LeaderboardEntry extends LeaderboardSnapshot {
  token: Token
}

export function useRealtimeLeaderboard(timeWindow: TimeWindow) {
  const supabase = useSupabase()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from('leaderboard_snapshots_new')
          .select(`
            *,
            token: tokens_new (*)
          `)
          .eq('time_window', timeWindow)
          .order('position', { ascending: true })
          .limit(100)

        if (error) throw error

        setLeaderboard(data as LeaderboardEntry[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeaderboard()
  }, [timeWindow, supabase])

  // Subscribe to real-time updates
  useEffect(() => {
    // Subscribe to new snapshots
    const snapshotSubscription = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leaderboard_snapshots_new',
          filter: `time_window=eq.${timeWindow}`
        },
        async (payload) => {
          // Fetch the complete snapshot with token data
          const { data: newSnapshot } = await supabase
            .from('leaderboard_snapshots_new')
            .select(`
              *,
              token: tokens_new (*)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newSnapshot) {
            setLeaderboard(current => {
              const updated = [...current]
              const index = updated.findIndex(item => item.token_id === newSnapshot.token_id)
              if (index > -1) {
                updated[index] = newSnapshot as LeaderboardEntry
              } else {
                updated.push(newSnapshot as LeaderboardEntry)
              }
              return updated.sort((a, b) => a.position - b.position)
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(snapshotSubscription)
    }
  }, [timeWindow, supabase])

  return { leaderboard, isLoading, error }
}
